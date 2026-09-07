import { useState, useEffect } from "react";
import {
  LayoutDashboard, Stethoscope, CalendarDays, FileText, FlaskConical,
  Pill, MapPin, Landmark, Siren, UserCircle, Brain, BookOpen, UserPlus, LogOut, HeartPulse,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const patientItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Find Doctor", url: "/doctors", icon: Stethoscope },
  { title: "AI Symptom Checker", url: "/symptom-checker", icon: Brain },
  { title: "Appointments", url: "/book-appointment", icon: CalendarDays },
  { title: "Medical Records", url: "/medical-records", icon: FileText },
  { title: "Lab Reports", url: "/lab-tests", icon: FlaskConical },
  { title: "Pharmacy Orders", url: "/pharmacy", icon: Pill },
  { title: "Health Camps", url: "/health-awareness", icon: MapPin },
  { title: "Government Schemes", url: "/government-schemes", icon: Landmark },
  { title: "Awareness Hub", url: "/health-awareness", icon: BookOpen },
  { title: "Emergency SOS", url: "/emergency", icon: Siren },
  { title: "Patient Record", url: "/dashboard/record", icon: HeartPulse },
  { title: "Profile", url: "/dashboard/profile", icon: UserCircle },
];

const doctorItems = [
  { title: "Dashboard", url: "/doctor-dashboard", icon: LayoutDashboard },
  { title: "My Appointments", url: "/doctor-dashboard", icon: CalendarDays },
  { title: "Profile", url: "/dashboard/profile", icon: UserCircle },
];

const DashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ avatar_url: string | null; full_name: string | null } | null>(null);
  const items = patientItems;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url, full_name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          {!collapsed && <span className="text-lg font-heading font-bold text-foreground">Cureva</span>}
        </Link>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-primary font-medium">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Link to="/dashboard/profile" className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors">
          <Avatar className="h-9 w-9 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Profile" />}
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || "Patient"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button onClick={() => signOut()} className="flex items-center gap-2 w-full rounded-lg p-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
