import { useEffect, useState } from "react";
import { Video, Phone, Loader2, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

type Appointment = {
  id: string;
  appointment_date: string;
  time_slot: string;
  status: string;
  doctors: { name: string; specialty: string } | null;
};

const VideoConsultation = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<{ url: string; appointmentId: string } | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("appointments")
      .select("id, appointment_date, time_slot, status, doctors(name, specialty)")
      .eq("patient_id", user.id)
      .in("status", ["confirmed", "pending"])
      .order("appointment_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast({ title: "Failed to load appointments", description: error.message, variant: "destructive" });
        setAppointments((data as any) || []);
        setLoading(false);
      });
  }, [user]);

  const joinCall = async (apt: Appointment) => {
    if (!user) return;
    setJoiningId(apt.id);
    const roomName = `cureva-${apt.id}`;
    const url = `https://meet.jit.si/${roomName}`;
    const { error } = await supabase.from("video_consultations").insert({
      appointment_id: apt.id,
      user_id: user.id,
      room_url: url,
      started_at: new Date().toISOString(),
    });
    setJoiningId(null);
    if (error) {
      toast({ title: "Couldn't log consultation", description: error.message, variant: "destructive" });
      // still open room so doctor/patient can talk
    } else {
      toast({ title: "Joining call..." });
    }
    setActiveRoom({ url, appointmentId: apt.id });
  };

  const endCall = async () => {
    if (activeRoom) {
      const { error } = await supabase.from("video_consultations").update({ ended_at: new Date().toISOString() })
        .eq("appointment_id", activeRoom.appointmentId).is("ended_at", null);
      if (error) toast({ title: "Couldn't log end time", description: error.message, variant: "destructive" });
      else toast({ title: "Call ended" });
    }
    setActiveRoom(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Video className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to start video consultations</h2>
          <Button onClick={() => navigate("/login")} className="mt-4">Sign in</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (activeRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 font-semibold"><Video className="h-5 w-5 text-primary" />Cureva Consultation</div>
          <Button variant="destructive" size="sm" onClick={endCall} className="gap-2"><Phone className="h-4 w-4" />End call</Button>
        </div>
        <iframe
          src={activeRoom.url}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="flex-1 w-full border-0"
          title="Video consultation"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Video Consultations</h1>
        <p className="text-muted-foreground mb-6">Join secure video calls with your doctor</p>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <CalIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No upcoming consultations.</p>
            <Button onClick={() => navigate("/book-appointment")}>Book an appointment</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Video className="h-5 w-5" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-medical-green-light text-medical-green">{apt.status}</span>
                </div>
                <h3 className="font-semibold">{apt.doctors?.name || "Doctor"}</h3>
                <p className="text-xs text-muted-foreground">{apt.doctors?.specialty}</p>
                <p className="text-sm mt-3">{format(new Date(apt.appointment_date), "PPP")} · {apt.time_slot}</p>
                <Button className="w-full mt-4 gap-2" onClick={() => joinCall(apt)}>
                  <Video className="h-4 w-4" />Join call
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default VideoConsultation;
