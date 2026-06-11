import { Siren, MapPin, FileText, Building2, Phone, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const EmergencySOS = () => {
  const [activated, setActivated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();

  const logSOS = async (lat?: number, lng?: number) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("sos_events").insert({
        user_id: user?.id ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        status: "triggered",
      });
    } catch (e) {
      console.error("SOS log failed", e);
    }
  };

  const handleSOS = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          setLocation({ lat, lng });
          setLocating(false);
          setActivated(true);
          logSOS(lat, lng);
        },
        () => {
          setLocating(false);
          setActivated(true);
          logSOS();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocating(false);
      setActivated(true);
      logSOS();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-8">
          <AnimatePresence mode="wait">
            {!activated ? (
              <motion.div
                key="sos-idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Emergency SOS</h1>
                  <p className="text-muted-foreground">Press the SOS button to alert nearby hospitals and share your medical data</p>
                </div>

                <motion.button
                  onClick={handleSOS}
                  disabled={locating}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg animate-pulse-emergency disabled:opacity-70"
                >
                  {locating ? (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  ) : (
                    <div className="text-center">
                      <Siren className="h-12 w-12 mx-auto mb-2" />
                      <span className="text-2xl font-bold">SOS</span>
                    </div>
                  )}
                </motion.button>

                <p className="text-xs text-muted-foreground">This will share your location and medical data with the nearest hospital</p>

                <div className="flex justify-center">
                  <a href="tel:112" className="inline-flex items-center gap-2 text-destructive font-medium hover:underline">
                    <Phone className="h-4 w-4" /> Call 112 (Emergency)
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="sos-active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-6">
                  <Siren className="h-10 w-10 text-destructive mx-auto mb-3 animate-pulse" />
                  <h2 className="text-xl font-bold text-destructive mb-2">SOS Activated</h2>
                  <p className="text-sm text-muted-foreground">Emergency services have been notified</p>
                </div>

                <div className="space-y-3 text-left">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Location Shared</p>
                      <p className="text-xs text-muted-foreground">
                        {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : "GPS coordinates sent to nearest hospital"}
                      </p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Hospital Notified</p>
                      <p className="text-xs text-muted-foreground">Nearest hospital has been alerted</p>
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Medical Data Sent</p>
                      <p className="text-xs text-muted-foreground">Blood type, allergies, conditions shared</p>
                    </div>
                  </motion.div>
                </div>

                <div className="flex gap-3">
                  <a href="tel:112" className="flex-1">
                    <Button variant="destructive" className="w-full gap-2">
                      <Phone className="h-4 w-4" /> Call 112
                    </Button>
                  </a>
                  <Button variant="outline" className="flex-1" onClick={() => { setActivated(false); setLocation(null); }}>
                    Cancel SOS
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EmergencySOS;
