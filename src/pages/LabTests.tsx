import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { FlaskConical, Home, Building2, Loader2, CalendarIcon, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Test = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_inr: number;
  mrp_inr: number;
  preparation: string | null;
  report_time_hours: number;
  home_collection: boolean;
};

const slots = ["07:00 AM","08:00 AM","09:00 AM","10:00 AM","11:00 AM","04:00 PM","05:00 PM","06:00 PM"];

const LabTests = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Test | null>(null);
  const [collectionType, setCollectionType] = useState<"home" | "lab">("home");
  const [date, setDate] = useState<Date | undefined>();
  const [slot, setSlot] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("lab_tests").select("*").order("price_inr").then(({ data, error }) => {
      if (error) toast({ title: "Failed to load tests", description: error.message, variant: "destructive" });
      setTests((data as Test[]) || []);
      setLoading(false);
    });
  }, []);

  const categories = ["all", ...Array.from(new Set(tests.map((t) => t.category)))];
  const filtered = tests.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  const openBooking = (t: Test, type: "home" | "lab") => {
    if (!user) { toast({ title: "Please sign in to book", variant: "destructive" }); navigate("/login"); return; }
    setSelected(t);
    setCollectionType(type);
    setDate(undefined); setSlot(""); setAddress(""); setPhone("");
  };

  const confirmBooking = async () => {
    if (!user || !selected || !date || !slot) {
      toast({ title: "Please pick date & time", variant: "destructive" }); return;
    }
    if (collectionType === "home" && !address.trim()) {
      toast({ title: "Address is required for home collection", variant: "destructive" }); return;
    }
    setBooking(true);
    const scheduled = new Date(date);
    const [time, period] = slot.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    scheduled.setHours(h, m, 0, 0);

    const { error } = await supabase.from("lab_bookings").insert({
      user_id: user.id,
      test_id: selected.id,
      scheduled_at: scheduled.toISOString(),
      address: collectionType === "home" ? address : "Lab visit",
      phone,
      total_inr: selected.price_inr,
      status: "pending",
    });
    setBooking(false);
    if (error) { toast({ title: "Booking failed", description: error.message, variant: "destructive" }); return; }
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Lab test booked",
      body: `${selected.name} on ${format(date, "PPP")} at ${slot}.`,
      link: "/dashboard",
    });
    toast({ title: "Booked!", description: `${selected.name} scheduled.` });
    setSelected(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Lab Tests</h1>
        <p className="text-muted-foreground mb-6">Book tests, collect samples at home, and get digital reports</p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tests..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow flex flex-col">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical-indigo/10 text-medical-indigo mb-3">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-card-foreground">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t.category} · Report in {t.report_time_hours}h</p>
                {t.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
                <div className="mt-auto pt-3 flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-foreground">₹{Number(t.price_inr).toFixed(0)}</span>
                    {Number(t.mrp_inr) > Number(t.price_inr) && (
                      <span className="text-xs text-muted-foreground line-through ml-2">₹{Number(t.mrp_inr).toFixed(0)}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {t.home_collection && (
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openBooking(t, "home")}>
                      <Home className="h-3 w-3" />Home
                    </Button>
                  )}
                  <Button size="sm" className="flex-1 gap-1 text-xs" onClick={() => openBooking(t, "lab")}>
                    <Building2 className="h-3 w-3" />Lab visit
                  </Button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">No tests match your search.</p>}
          </div>
        )}
      </motion.div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selected?.preparation && (
              <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground"><strong>Prep:</strong> {selected.preparation}</div>
            )}
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate}
                    disabled={(d) => d < new Date() || d > addDays(new Date(), 30)}
                    className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Time slot</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger><SelectValue placeholder="Pick a slot" /></SelectTrigger>
                <SelectContent>{slots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            {collectionType === "home" && (
              <div>
                <Label>Address</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="House no, street, city, PIN" />
              </div>
            )}
            <div className="text-sm font-medium pt-1">Total: ₹{Number(selected?.price_inr || 0).toFixed(0)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={confirmBooking} disabled={booking}>
              {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</> : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default LabTests;
