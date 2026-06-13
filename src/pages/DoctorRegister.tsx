import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Stethoscope, Building2, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const specialties = [
  "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
  "General Medicine", "Gynecology", "Nephrology", "Neurology",
  "Oncology", "Ophthalmology", "Orthopedics", "Pediatrics",
  "Psychiatry", "Pulmonology", "Urology",
];

const DoctorRegister = () => {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    specialty: "", qualification: "", experience: "", hospital: "",
    city: "", state: "", bio: "", consultationFee: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.specialty) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name, phone: form.phone } },
    });

    if (authError) {
      toast({ title: "Registration failed", description: authError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Insert doctor profile
    if (authData.user) {
      const initials = form.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      const { error: docErr } = await supabase.from("doctors").insert({
        name: form.name,
        specialty: form.specialty,
        qualification: form.qualification,
        experience_years: parseInt(form.experience) || 0,
        hospital: form.hospital,
        city: form.city,
        state: form.state,
        bio: form.bio,
        consultation_fee: parseInt(form.consultationFee) || null,
        avatar_initials: initials,
        certificate_verified: false,
        trust_score: 50,
      });
      if (docErr) {
        setLoading(false);
        toast({ title: "Doctor profile failed", description: docErr.message, variant: "destructive" });
        return;
      }

      // 3. Add doctor role
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "doctor" as const });
      if (roleErr) {
        setLoading(false);
        toast({ title: "Couldn't assign doctor role", description: roleErr.message, variant: "destructive" });
        return;
      }
    }

    setLoading(false);
    toast({ title: "Registration submitted!", description: "Your profile is under review. Please check your email to verify your account." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
              <span className="text-xl font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-2xl font-heading font-bold text-foreground">Cureva</span>
          </Link>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-heading flex items-center justify-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              Join as a Doctor
            </CardTitle>
            <CardDescription>Register your practice on Cureva and connect with patients</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Dr. John Doe" className="pl-10" value={form.name} onChange={(e) => update("name", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="doctor@example.com" className="pl-10" value={form.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="+91 98765 43210" className="pl-10" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialization *</Label>
                  <Select value={form.specialty} onValueChange={(v) => update("specialty", v)}>
                    <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="qualification" placeholder="MBBS, MD" className="pl-10" value={form.qualification} onChange={(e) => update("qualification", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (years)</Label>
                  <Input id="experience" type="number" placeholder="10" value={form.experience} onChange={(e) => update("experience", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital / Clinic</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="hospital" placeholder="Apollo Hospital" className="pl-10" value={form.hospital} onChange={(e) => update("hospital", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Consultation Fee (₹)</Label>
                  <Input id="fee" type="number" placeholder="500" value={form.consultationFee} onChange={(e) => update("consultationFee", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="city" placeholder="Mumbai" className="pl-10" value={form.city} onChange={(e) => update("city", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="Maharashtra" value={form.state} onChange={(e) => update("state", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About / Bio</Label>
                <Textarea id="bio" placeholder="Tell patients about your practice..." value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={3} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" className="pl-10 pr-10" value={form.password} onChange={(e) => update("password", e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" type="password" placeholder="Re-enter password" className="pl-10" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Submitting..." : "Register as Doctor"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DoctorRegister;
