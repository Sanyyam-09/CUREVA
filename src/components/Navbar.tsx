import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Siren, Search, Stethoscope, Pill, Building2, FileText, Heart, Video, TestTube } from "lucide-react";
import SmartSearchBar from "@/components/SmartSearchBar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const t = useTranslation();
  const location = useLocation();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast({ title: "Signed out" });
    } catch (e: any) {
      toast({ title: "Sign out failed", description: e?.message, variant: "destructive" });
    }
    setSigningOut(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from("profiles").select("avatar_url, full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const featureLinks = [
    { label: t("nav.findDoctors"), href: "/doctors", icon: Search },
    { label: t("nav.symptomChecker"), href: "/symptom-checker", icon: Stethoscope },
    { label: t("nav.pharmacy"), href: "/pharmacy", icon: Pill },
    { label: t("nav.hospitalPricing"), href: "/hospital-pricing", icon: Building2 },
    { label: "Video Consult", href: "/video-consultation", icon: Video },
    { label: "Lab Tests", href: "/lab-tests", icon: TestTube },
    { label: t("nav.govSchemes"), href: "/government-schemes", icon: FileText },
    { label: t("nav.healthAwareness"), href: "/health-awareness", icon: Heart },
  ];

  return (
    <div className="sticky top-0 z-50">
      {/* Top bar - clean & minimal */}
      <nav className={cn(
        "transition-all duration-300 border-b border-border/50",
        scrolled ? "bg-card/95 backdrop-blur-xl shadow-sm" : "bg-card/90 backdrop-blur-lg"
      )}>
        <div className={cn(
          "container mx-auto flex items-center justify-between px-4 transition-all duration-300",
          scrolled ? "h-12" : "h-14"
        )}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className={cn(
              "flex items-center justify-center rounded-lg bg-primary transition-all duration-300",
              scrolled ? "h-7 w-7" : "h-8 w-8"
            )}>
              <span className={cn(
                "font-bold text-primary-foreground transition-all duration-300",
                scrolled ? "text-xs" : "text-sm"
              )}>C</span>
            </div>
            <span className={cn(
              "font-heading font-bold text-foreground transition-all duration-300",
              scrolled ? "text-base" : "text-lg"
            )}>Cureva</span>
          </Link>

          {/* Center: Search bar (desktop) */}
          <div className="hidden lg:flex flex-1 justify-center max-w-xl mx-8">
            <SmartSearchBar />
          </div>

          {/* Right: minimal controls */}
          <div className="hidden items-center gap-1.5 lg:flex shrink-0">
            <LanguageSelector />
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/dashboard/profile">
                  <Avatar className="h-8 w-8">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profile" />}
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </Link>
                <Button variant="ghost" size="sm" asChild><Link to="/dashboard">{t("nav.dashboard")}</Link></Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} disabled={signingOut}>{signingOut ? "Signing out..." : t("nav.logout")}</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">{t("nav.login")}</Link></Button>
                <Button size="sm" asChild><Link to="/register">{t("auth.signUp")}</Link></Button>
              </>
            )}
            <Button size="sm" variant="destructive" className="gap-1 animate-pulse-emergency" asChild>
              <Link to="/emergency"><Siren className="h-4 w-4" />SOS</Link>
            </Button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <Button size="icon" variant="destructive" className="h-8 w-8 animate-pulse-emergency" asChild>
              <Link to="/emergency"><Siren className="h-4 w-4" /></Link>
            </Button>
            <button className="p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary feature strip (desktop) */}
      <div className={cn(
        "hidden lg:block border-b border-border/30 transition-all duration-300",
        scrolled ? "bg-muted/40 backdrop-blur-md" : "bg-muted/20 backdrop-blur-sm"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-1 py-1.5">
            {featureLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 transition-all duration-300 group-hover:scale-125 group-hover:text-primary group-hover:-translate-y-0.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shimmer line */}
      <div className="h-[1px] bg-[length:200%_100%] bg-gradient-to-r from-primary/20 via-accent/40 to-primary/20 animate-navbar-shimmer" />

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-b border-border bg-card px-4 pb-4 lg:hidden">
          <div className="flex flex-col gap-1 pt-3">
            <div className="pb-2">
              <SmartSearchBar />
            </div>
            {featureLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-2 pt-2">
              <LanguageSelector />
            </div>
            <div className="flex gap-3 pt-2">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>{t("nav.dashboard")}</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleSignOut} disabled={signingOut}>{signingOut ? "Signing out..." : t("nav.logout")}</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="flex-1" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>{t("nav.login")}</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>{t("auth.signUp")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
