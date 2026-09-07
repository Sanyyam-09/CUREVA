import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays, FileText, Pill, Upload, Stethoscope, Video, FlaskConical,
  Loader2, RefreshCw, HeartPulse, ExternalLink,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const quickActions = [
  { label: "Upload Reports", icon: Upload, href: "/medical-records" },
  { label: "Find Specialist", icon: Stethoscope, href: "/doctors" },
  { label: "Book Video Call", icon: Video, href: "/video-consultation" },
  { label: "Book Appointment", icon: CalendarDays, href: "/book-appointment" },
];

const statusTone = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "confirmed") return "bg-primary/10 text-primary";
  if (s === "completed") return "bg-medical-green/10 text-medical-green";
  if (s === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
};

const EmptyRow = ({ text, cta }: { text: string; cta?: { label: string; href: string } }) => (
  <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
    {cta && (
      <Button variant="outline" size="sm" className="mt-3" asChild>
        <Link to={cta.href}>{cta.label}</Link>
      </Button>
    )}
  </div>
);

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consults, setConsults] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [labBookings, setLabBookings] = useState<any[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [profileRes, patientRes, apptRes, consultRes, recRes, labRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("patients").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("appointments").select("*, doctors(name, specialty, hospital)").eq("patient_id", user.id).order("appointment_date", { ascending: true }),
      supabase.from("video_consultations").select("*, appointments(appointment_date, time_slot, doctors(name, specialty))").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("medical_records").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }),
      supabase.from("lab_bookings").select("*, lab_tests(name, category)").eq("user_id", user.id).order("scheduled_at", { ascending: false }),
    ]);
    setProfile(profileRes.data);
    setPatient(patientRes.data);
    setAppointments(apptRes.data ?? []);
    setConsults(consultRes.data ?? []);
    setRecords(recRes.data ?? []);
    setLabBookings(labRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openRecord = async (record: any) => {
    setOpeningId(record.id);
    const { data, error } = await supabase.storage.from("medical-records").createSignedUrl(record.file_url, 3600);
    setOpeningId(null);
    if (error || !data?.signedUrl) {
      toast({ title: "Couldn't open file", description: error?.message ?? "No link available", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const upcoming = appointments.filter(
    (a) => a.status !== "cancelled" && a.appointment_date >= new Date().toISOString().slice(0, 10)
  );
  const nextAppointment = upcoming[0] ?? null;

  const cards = [
    { title: "Upcoming Appointments", icon: CalendarDays, value: String(upcoming.length), subtitle: nextAppointment ? `Next: ${nextAppointment.doctors?.name} · ${nextAppointment.appointment_date}` : "No upcoming appointments", color: "text-primary bg-primary/10" },
    { title: "Video Consults", icon: Video, value: String(consults.length), subtitle: consults.length ? "Join from the Consults tab" : "No consults booked yet", color: "text-medical-indigo bg-medical-indigo/10" },
    { title: "Medical Records", icon: FileText, value: String(records.length), subtitle: records.length ? "Reports and prescriptions saved" : "Upload your first document", color: "text-medical-green bg-medical-green/10" },
    { title: "Lab Bookings", icon: FlaskConical, value: String(labBookings.length), subtitle: labBookings.length ? "Track sample collection & reports" : "Book a test with home collection", color: "text-primary bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back{patient?.name || profile?.full_name ? `, ${patient?.name || profile.full_name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1">Here's your health overview</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </motion.div>

        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button key={action.label} variant="outline" className="gap-2 hover:scale-105 transition-transform" asChild>
              <Link to={action.href}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
              </div>
              <h3 className="font-semibold text-card-foreground text-sm">{card.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-card-foreground">Patient Record</h2>
                {patient ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {patient.name}
                    {patient.age ? ` · ${patient.age} yrs` : ""}
                    {patient.gender ? ` · ${patient.gender}` : ""}
                    {patient.blood_group ? ` · ${patient.blood_group}` : ""}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Add your age, gender and medical history so doctors see your full picture.</p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/record">{patient ? "Edit record" : "Create record"}</Link>
            </Button>
          </div>
          {patient?.medical_history && (
            <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line border-t border-border pt-4">
              <span className="font-medium text-foreground">Medical history: </span>{patient.medical_history}
            </p>
          )}
        </div>

        <Tabs defaultValue="appointments">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
            <TabsTrigger value="consults">Consults ({consults.length})</TabsTrigger>
            <TabsTrigger value="records">Medical Records ({records.length})</TabsTrigger>
            <TabsTrigger value="labs">Lab Bookings ({labBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-4 space-y-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : appointments.length === 0 ? <EmptyRow text="You have no appointments yet." cta={{ label: "Book an appointment", href: "/book-appointment" }} />
              : appointments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-foreground">{a.doctors?.name ?? "Doctor"}</p>
                    <p className="text-xs text-muted-foreground">{a.doctors?.specialty}{a.doctors?.hospital ? ` · ${a.doctors.hospital}` : ""}</p>
                  </div>
                  <div className="text-sm text-foreground">{a.appointment_date} · {a.time_slot}</div>
                  <Badge className={statusTone(a.status)} variant="secondary">{a.status}</Badge>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="consults" className="mt-4 space-y-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : consults.length === 0 ? <EmptyRow text="No video consultations booked." cta={{ label: "Book a video call", href: "/video-consultation" }} />
              : consults.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-foreground">{c.appointments?.doctors?.name ?? "Video consultation"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.appointments?.appointment_date ? `${c.appointments.appointment_date} · ${c.appointments.time_slot}` : new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className={c.ended_at ? statusTone("completed") : statusTone("confirmed")}>
                    {c.ended_at ? "Completed" : c.started_at ? "Ongoing" : "Scheduled"}
                  </Badge>
                  {!c.ended_at && (
                    <Button size="sm" className="gap-1" asChild>
                      <a href={c.room_url} target="_blank" rel="noreferrer">Join <ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                </div>
              ))}
          </TabsContent>

          <TabsContent value="records" className="mt-4 space-y-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : records.length === 0 ? <EmptyRow text="No medical records uploaded." cta={{ label: "Upload a report", href: "/medical-records" }} />
              : records.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="font-medium text-foreground truncate">{r.file_name}</p>
                    <p className="text-xs text-muted-foreground">{r.record_type} · {new Date(r.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openRecord(r)} disabled={openingId === r.id}>
                    {openingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    View
                  </Button>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="labs" className="mt-4 space-y-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : labBookings.length === 0 ? <EmptyRow text="No lab tests booked." cta={{ label: "Book a lab test", href: "/lab-tests" }} />
              : labBookings.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-medical-green/10 text-medical-green">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-medium text-foreground">{b.lab_tests?.name ?? "Lab test"}</p>
                    <p className="text-xs text-muted-foreground">{b.lab_tests?.category} · {new Date(b.scheduled_at).toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">₹{Number(b.total_inr).toLocaleString("en-IN")}</span>
                  <Badge variant="secondary" className={statusTone(b.status)}>{b.status}</Badge>
                </div>
              ))}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/pharmacy"><Pill className="h-4 w-4" /> Order medicines</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
