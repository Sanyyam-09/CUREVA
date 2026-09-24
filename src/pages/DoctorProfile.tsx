import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, BadgeCheck, MapPin, Building2, IndianRupee, Clock, Languages, CalendarDays, ArrowLeft, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getDoctorAvatar } from "@/lib/doctorAvatars";

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [d, s, r] = await Promise.all([
        supabase.from("doctors").select("*").eq("id", id).maybeSingle(),
        supabase.from("doctor_slots").select("*").eq("doctor_id", id).eq("is_booked", false).gte("slot_date", today).order("slot_date").order("time_slot").limit(30),
        supabase.from("doctor_reviews").select("*").eq("doctor_id", id).order("created_at", { ascending: false }),
      ]);
      if (d.error) setError(d.error.message);
      else if (!d.data) setError("Doctor not found");
      setDoc(d.data);
      setSlots(s.data || []);
      setReviews(r.data || []);
      setLoading(false);
    })();
  }, [id]);

  const toMin = (t: string) => { const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; return ((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + +m[2]; };
  const grouped = [...slots].sort((a, b) => toMin(a.time_slot) - toMin(b.time_slot)).reduce<Record<string, any[]>>((a, s) => { (a[s.slot_date] ||= []).push(s); return a; }, {});
  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : doc?.rating;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/doctors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" /> All doctors
        </Link>
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("/doctors")}>Browse doctors</Button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col sm:flex-row gap-6">
              <img src={getDoctorAvatar(doc.name, 0)} alt={doc.name} className="h-28 w-28 rounded-full object-cover shrink-0" width={112} height={112} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{doc.name}</h1>
                  {doc.certificate_verified && <BadgeCheck className="h-5 w-5 text-medical-green" aria-label="Verified" />}
                </div>
                <p className="text-primary font-medium">{doc.specialty}</p>
                {doc.qualification && <p className="text-sm text-muted-foreground">{doc.qualification}</p>}
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground pt-2">
                  {doc.hospital && <span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{doc.hospital}</span>}
                  {(doc.city || doc.location) && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{doc.location || `${doc.city}, ${doc.state}`}</span>}
                  {doc.consultation_fee != null && <span className="flex items-center gap-2"><IndianRupee className="h-4 w-4" />₹{doc.consultation_fee} consultation</span>}
                  {doc.experience_years != null && <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{doc.experience_years} years experience</span>}
                  {doc.languages?.length > 0 && <span className="flex items-center gap-2"><Languages className="h-4 w-4" />{doc.languages.join(", ")}</span>}
                  <span className="flex items-center gap-2"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{avg ?? "–"} ({reviews.length || doc.total_reviews || 0} reviews)</span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2">
                <Button onClick={() => navigate(`/book-appointment?doctor=${doc.id}`)}>Book Appointment</Button>
                <Button variant="outline" onClick={() => navigate("/video-consultation")}>Video consult</Button>
              </div>
            </div>

            {doc.bio && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold text-foreground mb-2">About</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{doc.bio}</p>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Available slots</h2>
              {Object.keys(grouped).length === 0 ? (
                <p className="text-sm text-muted-foreground">No open slots listed. You can still request an appointment.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(grouped).map(([date, list]) => (
                    <div key={date}>
                      <p className="text-sm font-medium text-foreground mb-2">{new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                      <div className="flex flex-wrap gap-2">
                        {list.map((s) => (
                          <Button key={s.id} size="sm" variant="outline" onClick={() => navigate(`/book-appointment?doctor=${doc.id}&date=${s.slot_date}&time=${encodeURIComponent(s.time_slot)}`)}>
                            {s.time_slot}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold text-foreground mb-4">Patient reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                      </div>
                      {r.review_text && <p className="text-sm text-foreground">{r.review_text}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default DoctorProfile;
