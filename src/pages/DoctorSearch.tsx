import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, BadgeCheck, MapPin, Video, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDoctorAvatar } from "@/lib/doctorAvatars";

const DoctorSearch = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Record<string, any[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [newReview, setNewReview] = useState({ rating: 5, text: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from("doctors").select("*").order("rating", { ascending: false });
      if (error) toast({ title: "Failed to load doctors", description: error.message, variant: "destructive" });
      if (data) setDoctors(data);
      setLoadingDoctors(false);
    };
    fetchDoctors();
  }, []);

  const fetchReviews = async (doctorId: string) => {
    const { data, error } = await supabase.from("doctor_reviews").select("*").eq("doctor_id", doctorId).order("created_at", { ascending: false });
    if (error) { toast({ title: "Failed to load reviews", description: error.message, variant: "destructive" }); return; }
    if (data) setReviews((prev) => ({ ...prev, [doctorId]: data }));
  };

  const submitReview = async (doctorId: string) => {
    if (!user) { toast({ title: "Please login to submit a review", variant: "destructive" }); return; }
    if (!newReview.text.trim()) { toast({ title: "Please write a review", variant: "destructive" }); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("doctor_reviews").insert({
      doctor_id: doctorId, user_id: user.id, rating: newReview.rating, review_text: newReview.text.trim(),
    });
    setSubmittingReview(false);
    if (error) { toast({ title: "Error submitting review", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Review submitted!" });
    setNewReview({ rating: 5, text: "" });
    fetchReviews(doctorId);
  };

  const specialties = [...new Set(doctors.map((d) => d.specialty))];

  const filtered = doctors.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || (d.city || "").toLowerCase().includes(q);
    const matchesSpecialty = specialty === "all" || d.specialty === specialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Find a Doctor</h1>
        <p className="text-muted-foreground mb-8">Search Indian doctors by symptoms, specialization, or name</p>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search doctors, specialties, cities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Specialization" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc, index) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover">
              <div className="flex items-start gap-4">
                <img
                  src={getDoctorAvatar(doc.name, index)}
                  alt={doc.name}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                  loading="lazy"
                  width={56}
                  height={56}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-card-foreground truncate">{doc.name}</h3>
                    {doc.certificate_verified && <BadgeCheck className="h-4 w-4 text-medical-green shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                  <p className="text-xs text-muted-foreground">{doc.qualification}</p>
                  <p className="text-xs text-muted-foreground">{doc.experience_years} years exp.</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{doc.city}, {doc.state}
                  </div>
                  <p className="text-xs text-muted-foreground">{doc.hospital}</p>
                  {doc.consultation_fee && <p className="text-xs font-medium text-primary mt-1">₹{doc.consultation_fee} consultation</p>}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-foreground">{doc.rating}</span>
                    <span className="text-xs text-muted-foreground">({doc.total_reviews})</span>
                  </div>
                  <span className="text-xs font-medium text-medical-green">Trust: {doc.trust_score}%</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => navigate("/book-appointment")}>Book Appointment</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/video-consultation")}><Video className="h-3.5 w-3.5" />Video</Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelectedDoctor(doc.id); fetchReviews(doc.id); }}>
                      <MessageSquare className="h-3.5 w-3.5" />Reviews
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Reviews for {doc.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Write review */}
                      {user && (
                        <div className="border border-border rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">Write a Review</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button key={s} onClick={() => setNewReview((r) => ({ ...r, rating: s }))}>
                                <Star className={`h-5 w-5 ${s <= newReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                              </button>
                            ))}
                          </div>
                          <Textarea placeholder="Share your experience..." value={newReview.text} onChange={(e) => setNewReview((r) => ({ ...r, text: e.target.value }))} />
                          <Button size="sm" onClick={() => submitReview(doc.id)}>Submit Review</Button>
                        </div>
                      )}
                      {/* Reviews list */}
                      {(reviews[doc.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No reviews yet. Be the first!</p>
                      ) : (
                        (reviews[doc.id] || []).map((r) => (
                          <div key={r.id} className="border-b border-border pb-3 last:border-0">
                            <div className="flex items-center gap-1 mb-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                              ))}
                            </div>
                            <p className="text-sm text-foreground">{r.review_text}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

export default DoctorSearch;
