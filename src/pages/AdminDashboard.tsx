import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Stethoscope, CalendarDays, FlaskConical, Pill, ShieldCheck,
  Activity, LogOut, LayoutDashboard, FileText, Siren, Building2, BookOpen, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ResourceManager, { FieldDef } from "@/components/admin/ResourceManager";

type TabId =
  | "overview" | "doctors" | "hospitals" | "pricing" | "schemes" | "ngos"
  | "medicines" | "labtests" | "articles" | "appointments" | "sos";

const tabs: { id: TabId; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "pricing", label: "Procedure Pricing", icon: FileText },
  { id: "schemes", label: "Gov Schemes", icon: ShieldCheck },
  { id: "ngos", label: "NGO Services", icon: Users },
  { id: "medicines", label: "Medicines", icon: Pill },
  { id: "labtests", label: "Lab Tests", icon: FlaskConical },
  { id: "articles", label: "Articles", icon: BookOpen },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "sos", label: "SOS Events", icon: Siren },
];

const doctorsFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "specialty", label: "Specialty", required: true },
  { name: "qualification", label: "Qualification" },
  { name: "experience_years", label: "Experience (years)", type: "number" },
  { name: "consultation_fee", label: "Consultation fee (₹)", type: "number" },
  { name: "hospital", label: "Hospital" },
  { name: "city", label: "City" },
  { name: "bio", label: "Bio", type: "textarea" },
  { name: "rating", label: "Rating", type: "number" },
  { name: "avatar_url", label: "Avatar URL" },
  { name: "verified", label: "Verified", type: "boolean" },
];

const hospitalsFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "city", label: "City" },
  { name: "address", label: "Address", type: "textarea" },
  { name: "phone", label: "Phone" },
  { name: "rating", label: "Rating", type: "number" },
  { name: "beds", label: "Beds", type: "number" },
  { name: "specialties", label: "Specialties (comma)" },
];

const pricingFields: FieldDef[] = [
  { name: "procedure_name", label: "Procedure name", required: true },
  { name: "hospital_name", label: "Hospital name" },
  { name: "city", label: "City" },
  { name: "price_inr", label: "Price (₹)", type: "number" },
  { name: "category", label: "Category" },
];

const schemeFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "eligibility", label: "Eligibility", type: "textarea" },
  { name: "coverage_amount", label: "Coverage (₹)", type: "number" },
  { name: "category", label: "Category" },
  { name: "apply_url", label: "Apply URL" },
  { name: "is_active", label: "Active", type: "boolean" },
];

const ngoFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "city", label: "City" },
  { name: "service_type", label: "Service type" },
  { name: "contact_phone", label: "Phone" },
  { name: "contact_email", label: "Email" },
  { name: "website_url", label: "Website" },
  { name: "is_active", label: "Active", type: "boolean" },
];

const medicineFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "generic_name", label: "Generic name" },
  { name: "manufacturer", label: "Manufacturer" },
  { name: "category", label: "Category", required: true },
  { name: "price_inr", label: "Price (₹)", type: "number", required: true },
  { name: "mrp_inr", label: "MRP (₹)", type: "number", required: true },
  { name: "stock", label: "Stock", type: "number" },
  { name: "prescription_required", label: "Prescription required", type: "boolean" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "image_url", label: "Image URL" },
];

const labTestFields: FieldDef[] = [
  { name: "name", label: "Name", required: true },
  { name: "category", label: "Category", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "price_inr", label: "Price (₹)", type: "number", required: true },
  { name: "mrp_inr", label: "MRP (₹)", type: "number", required: true },
  { name: "preparation", label: "Preparation", type: "textarea" },
  { name: "report_time_hours", label: "Report time (hours)", type: "number" },
  { name: "home_collection", label: "Home collection", type: "boolean" },
];

const articleFields: FieldDef[] = [
  { name: "title", label: "Title", required: true },
  { name: "slug", label: "Slug", required: true },
  { name: "category", label: "Category", required: true },
  { name: "excerpt", label: "Excerpt", type: "textarea" },
  { name: "content", label: "Content (markdown)", type: "textarea", required: true },
  { name: "author", label: "Author" },
  { name: "cover_url", label: "Cover URL" },
  { name: "read_minutes", label: "Read minutes", type: "number" },
  { name: "is_published", label: "Published", type: "boolean" },
];

const AdminDashboard = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>("overview");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statLoading, setStatLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/admin-login");
    if (!loading && user && !isAdmin) {
      toast({ title: "Access denied", description: "Admin role required.", variant: "destructive" });
      navigate("/");
    }
  }, [user, isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin) return;
    const tables = ["profiles","doctors","appointments","lab_bookings","pharmacy_orders","sos_events"];
    Promise.all(tables.map((t) => (supabase.from(t as any).select("id", { count: "exact", head: true }) as any)))
      .then((results) => {
        const c: Record<string, number> = {};
        tables.forEach((t, i) => { c[t] = results[i].count || 0; });
        setCounts(c);
        setStatLoading(false);
      });
  }, [isAdmin]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const renderTab = () => {
    switch (tab) {
      case "overview":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : [
              { label: "Total Patients", value: counts.profiles, icon: Users },
              { label: "Active Doctors", value: counts.doctors, icon: Stethoscope },
              { label: "Appointments", value: counts.appointments, icon: CalendarDays },
              { label: "Lab Bookings", value: counts.lab_bookings, icon: FlaskConical },
              { label: "Pharmacy Orders", value: counts.pharmacy_orders, icon: Pill },
              { label: "SOS Events", value: counts.sos_events, icon: Siren },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <s.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold">{s.value ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        );
      case "doctors": return <ResourceManager table="doctors" title="Doctors" fields={doctorsFields}
        columns={[{ key: "name", label: "Name" }, { key: "specialty", label: "Specialty" }, { key: "city", label: "City" }, { key: "consultation_fee", label: "Fee" }]} />;
      case "hospitals": return <ResourceManager table="hospitals" title="Hospitals" fields={hospitalsFields}
        columns={[{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "rating", label: "Rating" }, { key: "beds", label: "Beds" }]} />;
      case "pricing": return <ResourceManager table="procedure_pricing" title="Procedure Pricing" fields={pricingFields}
        columns={[{ key: "procedure_name", label: "Procedure" }, { key: "hospital_name", label: "Hospital" }, { key: "city", label: "City" }, { key: "price_inr", label: "Price" }]} />;
      case "schemes": return <ResourceManager table="government_schemes" title="Schemes" fields={schemeFields}
        columns={[{ key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "coverage_amount", label: "Coverage" }, { key: "is_active", label: "Active", render: (r) => r.is_active ? "Yes" : "No" }]} />;
      case "ngos": return <ResourceManager table="ngo_services" title="NGOs" fields={ngoFields}
        columns={[{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "service_type", label: "Service" }, { key: "is_active", label: "Active", render: (r) => r.is_active ? "Yes" : "No" }]} />;
      case "medicines": return <ResourceManager table="medicines" title="Medicines" fields={medicineFields}
        columns={[{ key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "price_inr", label: "Price" }, { key: "stock", label: "Stock" }]} />;
      case "labtests": return <ResourceManager table="lab_tests" title="Lab Tests" fields={labTestFields}
        columns={[{ key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "price_inr", label: "Price" }, { key: "report_time_hours", label: "Hours" }]} />;
      case "articles": return <ResourceManager table="health_articles" title="Articles" fields={articleFields}
        columns={[{ key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "author", label: "Author" }, { key: "is_published", label: "Published", render: (r) => r.is_published ? "Yes" : "No" }]} />;
      case "appointments": return <ResourceManager table="appointments" title="Appointments" fields={[
        { name: "status", label: "Status", required: true },
        { name: "appointment_date", label: "Date (YYYY-MM-DD)" },
        { name: "time_slot", label: "Time slot" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]} columns={[{ key: "appointment_date", label: "Date" }, { key: "time_slot", label: "Slot" }, { key: "status", label: "Status" }]} />;
      case "sos": return <ResourceManager table="sos_events" title="SOS Events" fields={[
        { name: "status", label: "Status" },
        { name: "address", label: "Address", type: "textarea" },
      ]} columns={[{ key: "created_at", label: "Time", render: (r) => new Date(r.created_at).toLocaleString() }, { key: "lat", label: "Lat" }, { key: "lng", label: "Lng" }, { key: "status", label: "Status" }]} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-heading font-bold text-foreground">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <t.icon className="h-4 w-4 shrink-0" />{t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-heading font-semibold text-foreground">{tabs.find((t) => t.id === tab)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{renderTab()}</main>

        {/* mobile tab switcher */}
        <div className="lg:hidden flex overflow-x-auto border-t border-border bg-card p-2 gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
