import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Loader2, Save, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const genders = ["Male", "Female", "Other", "Prefer not to say"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const PatientRecord = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", gender: "", blood_group: "",
    medical_history: "", allergies: "", chronic_conditions: "",
    current_medications: "", notes: "",
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: patient }, { data: profile }] = await Promise.all([
        supabase.from("patients").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      if (patient) {
        setForm({
          name: patient.name ?? "",
          age: patient.age != null ? String(patient.age) : "",
          gender: patient.gender ?? "",
          blood_group: patient.blood_group ?? "",
          medical_history: patient.medical_history ?? "",
          allergies: (patient.allergies ?? []).join(", "),
          chronic_conditions: (patient.chronic_conditions ?? []).join(", "),
          current_medications: patient.current_medications ?? "",
          notes: patient.notes ?? "",
        });
      } else if (profile?.full_name) {
        setForm((f) => ({ ...f, name: profile.full_name as string }));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toArray = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("patients").upsert({
      user_id: user.id,
      name: form.name.trim(),
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,
      medical_history: form.medical_history || null,
      allergies: toArray(form.allergies),
      chronic_conditions: toArray(form.chronic_conditions),
      current_medications: form.current_medications || null,
      notes: form.notes || null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save record", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Patient record saved", description: "Your doctors can now see these details." });
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patient Record</h1>
            <p className="text-muted-foreground mt-1">Name, age, gender and medical history shared with your doctors.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading record…</div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rohan Sharma" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min={0} max={120} value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 34" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>{genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blood group</Label>
                <Select value={form.blood_group} onValueChange={(v) => set("blood_group", v)}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history">Medical history</Label>
              <Textarea id="history" rows={5} value={form.medical_history} onChange={(e) => set("medical_history", e.target.value)}
                placeholder="Past illnesses, surgeries, hospitalisations, family history…" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies (comma separated)</Label>
                <Input id="allergies" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Penicillin, Dust" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronic">Chronic conditions (comma separated)</Label>
                <Input id="chronic" value={form.chronic_conditions} onChange={(e) => set("chronic_conditions", e.target.value)} placeholder="Diabetes, Hypertension" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meds">Current medications</Label>
              <Textarea id="meds" rows={3} value={form.current_medications} onChange={(e) => set("current_medications", e.target.value)} placeholder="Metformin 500mg twice daily…" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Other notes</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else your doctor should know" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save record"}
              </Button>
              <Button variant="outline" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PatientRecord;
