import { useEffect, useState } from "react";
import { Search, Pill, ShoppingCart, Truck, Plus, Minus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Medicine = {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  price_inr: number;
  mrp_inr: number;
  prescription_required: boolean;
  stock: number;
  description: string | null;
};

const CART_KEY = "cureva_cart";

const Pharmacy = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch { return {}; }
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("medicines").select("*").order("name").then(({ data, error }) => {
      if (error) toast({ title: "Failed to load medicines", description: error.message, variant: "destructive" });
      setMedicines((data as Medicine[]) || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const categories = ["all", ...Array.from(new Set(medicines.map((m) => m.category)))];

  const filtered = medicines.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.category + " " + (m.manufacturer || "")).toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || m.category === category;
    return matchSearch && matchCat;
  });

  const addToCart = (m: Medicine) => {
    if ((cart[m.id] || 0) >= m.stock) {
      toast({ title: "No more stock available", variant: "destructive" });
      return;
    }
    setCart((c) => ({ ...c, [m.id]: (c[m.id] || 0) + 1 }));
  };
  const removeFromCart = (id: string) => setCart((c) => {
    const n = { ...c };
    if (n[id] > 1) n[id]--; else delete n[id];
    return n;
  });

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const m = medicines.find((x) => x.id === id);
    return total + (m ? Number(m.price_inr) * qty : 0);
  }, 0);

  const startCheckout = () => {
    if (!user) {
      toast({ title: "Please sign in to checkout", variant: "destructive" });
      navigate("/login");
      return;
    }
    setCheckoutOpen(true);
  };

  const placeOrder = async () => {
    if (!user) return;
    if (!address.trim() || !phone.trim()) {
      toast({ title: "Address and phone are required", variant: "destructive" });
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase.from("pharmacy_orders").insert({
      user_id: user.id,
      total_inr: cartTotal,
      address,
      phone,
      status: "pending",
    }).select().single();
    if (error || !order) {
      toast({ title: "Order failed", description: error?.message, variant: "destructive" });
      setPlacing(false);
      return;
    }
    const items = Object.entries(cart).map(([medicine_id, quantity]) => {
      const m = medicines.find((x) => x.id === medicine_id)!;
      return { order_id: order.id, medicine_id, quantity, price_inr: m.price_inr };
    });
    const { error: itemErr } = await supabase.from("pharmacy_order_items").insert(items);
    if (itemErr) {
      toast({ title: "Order items failed", description: itemErr.message, variant: "destructive" });
      setPlacing(false);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Order placed",
      body: `Your pharmacy order of ₹${cartTotal} has been received.`,
      link: "/dashboard",
    });
    toast({ title: "Order placed!", description: "Your medicines will be delivered soon." });
    setCart({});
    setCheckoutOpen(false);
    setPlacing(false);
    setAddress(""); setPhone("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pharmacy</h1>
            <p className="text-muted-foreground mt-1">Order medicines with doorstep delivery</p>
          </div>
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Button className="gap-2" onClick={startCheckout}>
                  <ShoppingCart className="h-4 w-4" /> Cart ({cartCount}) · ₹{cartTotal.toFixed(0)}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)} className="capitalize">{c}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((med, i) => (
              <motion.div key={med.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-medical-green/10 text-medical-green">
                    <Pill className="h-5 w-5" />
                  </div>
                  {med.prescription_required && (
                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Rx Required</span>
                  )}
                </div>
                <h3 className="font-semibold text-card-foreground">{med.name}</h3>
                <p className="text-xs text-muted-foreground">{med.category}{med.manufacturer ? ` · ${med.manufacturer}` : ""}</p>
                {med.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{med.description}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-foreground">₹{Number(med.price_inr).toFixed(0)}</span>
                    {Number(med.mrp_inr) > Number(med.price_inr) && (
                      <span className="text-xs text-muted-foreground line-through ml-2">₹{Number(med.mrp_inr).toFixed(0)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={med.stock > 0 ? "text-medical-green" : "text-destructive"}>{med.stock > 0 ? "In stock" : "Out of stock"}</span>
                  </div>
                </div>
                <div className="mt-3">
                  {cart[med.id] ? (
                    <div className="flex items-center gap-3">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => removeFromCart(med.id)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium text-foreground w-6 text-center">{cart[med.id]}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => addToCart(med)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full" disabled={med.stock === 0} onClick={() => addToCart(med)}>
                      Add to Cart
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-10">No medicines match your search.</p>
            )}
          </div>
        )}
      </motion.div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Checkout — ₹{cartTotal.toFixed(0)}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label htmlFor="addr">Delivery address</Label>
              <Textarea id="addr" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="House no, street, city, PIN" />
            </div>
            <div className="text-xs text-muted-foreground">
              {cartCount} items · Cash on delivery (payment integration coming soon)
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button onClick={placeOrder} disabled={placing}>
              {placing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing...</> : "Place order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Pharmacy;
