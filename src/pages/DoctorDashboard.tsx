import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Users, Star, Clock, CheckCircle2, XCircle, RefreshCw, Loader2, Video, Plus, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type TabId = "appointments" | "patients" | "consults" | "slots";

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "patients", label: "Patients", icon: Users },
  { id: "consults", label: "Consults", icon: Video },
  { id: "slots", label: "Slots", icon: Clock },
];

const today = () => new Date().toISOString().split("T")[0];

const DoctorDashboard = () => {
  const [tab, setTab] = useState<TabId>("appointments");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [consults, setConsults] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [newSlot, setNewSlot] = useState({ slot_date: today(), time_slot: "10:00 AM" });
  const [addingSlot, setAddingSlot] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDoctorData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let { data: doctor } = await supabase.from("doctors").select("*").eq("user_id", user.id).maybeSingle();

    if (!doctor) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      if (profile?.full_name) {
        const { data: byName } = await supabase.from("doctors").select("*").ilike("name", `%${profile.full_name}%`).maybeSingle();
        doctor = byName ?? null;
      }
    }

    setDoctorProfile(doctor);
    if (!doctor) { setLoading(false); return; }

    const [{ data: appts }, { data: revs }, { data: slotRows }] = await Promise.all([
      supabase.from("appointments").select("*").eq("doctor_id", doctor.id).order("appointment_date", { ascending: true }),
      supabase.from("doctor_reviews").select("*").eq("doctor_id", doctor.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("doctor_slots").select("*").eq("doctor_id", doctor.id).order("slot_date", { ascending: true }),
    ]);

    setAppointments(appts || []);
    setReviews(revs || []);
    setSlots(slotRows || []);

    const patientIds = [...new Set((appts || []).map((a: any) => a.patient_id))];
    if (patientIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, city, blood_type, gender, date_of_birth")
        .in("user_id", patientIds);
      setPatients(profs || []);
    } else {
      setPatients([]);
    }

    const apptIds = (appts || []).map((a: any) => a.id);
    if (apptIds.length) {
      const { data: vc } = await supabase
        .from("video_consultations")
        .select("*")
        .in("appointment_id", apptIds)
        .order("created_at", { ascending: false });
      setConsults(vc || []);
    } else {
      setConsults([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDoctorData(); }, [fetchDoctorData]);

  const updateAppointmentStatus = async (id: string, status: string) => {
    setBusyId(id);
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    setBusyId(null);
    if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    else { toast({ title: `Appointment ${status}` }); fetchDoctorData(); }
  };

  const addSlot = async () => {
    if (!doctorProfile) return;
    if (!newSlot.slot_date || !newSlot.time_slot.trim()) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    setAddingSlot(true);
    const { error } = await supabase.from("doctor_slots").insert({
      doctor_id: doctorProfile.id,
      slot_date: newSlot.slot_date,
      time_slot: newSlot.time_slot.trim(),
    });
    setAddingSlot(false);
    if (error) toast({ title: "Couldn't add slot", description: error.message, variant: "destructive" });
    else { toast({ title: "Slot added" }); fetchDoctorData(); }
  };

  const toggleSlot = async (slot: any) => {
    setBusyId(slot.id);
    const { error } = await supabase.from("doctor_slots").update({ is_booked: !slot.is_booked }).eq("id", slot.id);
    setBusyId(null);
    if (error) toast({ title: "Couldn't update slot", description: error.message, variant: "destructive" });
    else { toast({ title: slot.is_booked ? "Slot marked available" : "Slot marked booked" }); fetchDoctorData(); }
  };

  const deleteSlot = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.from("doctor_slots").delete().eq("id", id);
    setBusyId(null);
    if (error) toast({ title: "Couldn't delete slot", description: error.message, variant: "destructive" });
    else { toast({ title: "Slot removed" }); fetchDoctorData(); }
  };

  const patientName = (id: string) => patients.find((p) => p.user_id === id)?.full_name || "Patient";
  const todayAppointments = appointments.filter((a) => a.appointment_date === today());
  const upcomingAppointments = appointments.filter((a) => a.appointment_date >= today() && a.status !== "cancelled");

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!doctorProfile) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <h1 className="text-xl font-bold text-foreground">No doctor profile linked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account isn't linked to a doctor listing yet. Register as a doctor or ask an administrator to link your account.
          </p>
          <Button className="mt-4" onClick={fetchDoctorData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Check again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {doctorProfile.name}</h1>
            <p className="text-muted-foreground mt-1">
              {doctorProfile.specialty}{doctorProfile.hospital ? ` · ${doctorProfile.hospital}` : ""}
            </p>
          </div>
          <Button variant="outline" onClick={fetchDoctorData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's Appointments", value: todayAppointments.length, icon: CalendarDays, cls: "text-primary bg-primary/10" },
            { label: "Upcoming Appointments", value: upcomingAppointments.length, icon: Clock, cls: "text-medical-green bg-medical-green/10" },
            { label: "Patients", value: patients.length, icon: Users, cls: "text-primary bg-primary/10" },
            { label: "Rating", value: doctorProfile.rating || 0, icon: Star, cls: "text-amber-500 bg-amber-500/10" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${s.cls}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
              </div>
              <h3 className="font-semibold text-card-foreground text-sm">{s.label}</h3>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button key={t.id} variant={tab === t.id ? "default" : "outline"} size="sm" onClick={() => setTab(t.id)}>
              <t.icon className="mr-2 h-4 w-4" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === "appointments" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{patientName(apt.patient_id)}</p>
                      <p className="text-sm text-muted-foreground">{apt.appointment_date} · {apt.time_slot}</p>
                      {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        apt.status === "confirmed" ? "bg-medical-green/10 text-medical-green" :
                        apt.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                        apt.status === "completed" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      }`}>{apt.status}</span>
                      {apt.status !== "completed" && apt.status !== "cancelled" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={busyId === apt.id}
                            onClick={() => updateAppointmentStatus(apt.id, "completed")}>
                            {busyId === apt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Done
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" disabled={busyId === apt.id}
                            onClick={() => updateAppointmentStatus(apt.id, "cancelled")}>
                            <XCircle className="h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "patients" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">My Patients</h2>
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No patients have booked with you yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {patients.map((p) => {
                  const visits = appointments.filter((a) => a.patient_id === p.user_id);
                  return (
                    <div key={p.user_id} className="rounded-lg border border-border p-4">
                      <p className="font-medium text-foreground">{p.full_name || "Patient"}</p>
                      <p className="text-sm text-muted-foreground">
                        {[p.gender, p.city, p.blood_type && `Blood ${p.blood_type}`].filter(Boolean).join(" · ") || "No details shared"}
                      </p>
                      {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {visits.length} appointment{visits.length === 1 ? "" : "s"} · last {visits[visits.length - 1]?.appointment_date}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "consults" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Video Consults</h2>
            {consults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No video consults recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {consults.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{patientName(appointments.find((a) => a.id === c.appointment_id)?.patient_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.started_at ? `Started ${new Date(c.started_at).toLocaleString()}` : "Not started"}
                        {c.ended_at ? ` · Ended ${new Date(c.ended_at).toLocaleTimeString()}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={c.room_url} target="_blank" rel="noopener noreferrer">
                        <Video className="mr-2 h-4 w-4" /> Join room
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "slots" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Availability Slots</h2>
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div>
                <Label htmlFor="slot-date" className="text-xs">Date</Label>
                <Input id="slot-date" type="date" value={newSlot.slot_date}
                  onChange={(e) => setNewSlot((s) => ({ ...s, slot_date: e.target.value }))} className="w-40" />
              </div>
              <div>
                <Label htmlFor="slot-time" className="text-xs">Time slot</Label>
                <Input id="slot-time" placeholder="10:00 AM" value={newSlot.time_slot}
                  onChange={(e) => setNewSlot((s) => ({ ...s, time_slot: e.target.value }))} className="w-40" />
              </div>
              <Button onClick={addSlot} disabled={addingSlot}>
                {addingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add slot
              </Button>
            </div>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No slots yet. Add your available times above.</p>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium text-foreground">{s.slot_date}</p>
                      <p className="text-sm text-muted-foreground">{s.time_slot}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        s.is_booked ? "bg-destructive/10 text-destructive" : "bg-medical-green/10 text-medical-green"
                      }`}>{s.is_booked ? "Booked" : "Available"}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={busyId === s.id}
                        onClick={() => toggleSlot(s)}>
                        {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.is_booked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        {s.is_booked ? "Mark available" : "Mark booked"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" disabled={busyId === s.id}
                        onClick={() => deleteSlot(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Recent Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-foreground">{r.review_text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DoctorDashboard;
