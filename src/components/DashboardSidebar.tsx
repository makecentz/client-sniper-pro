import { Search, Bookmark, Bot, Settings, LogOut, Zap, Shield, LayoutDashboard, ShieldCheck, Database, MapPin, Gift } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { useAuth, getSavedLeadsWarning } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Search", url: "/dashboard/search", icon: Search },
  { title: "Heatmap", url: "/dashboard/heatmap", icon: MapPin },
  { title: "Saved Leads", url: "/dashboard/leads", icon: Bookmark },
  { title: "AI Tools", url: "/dashboard/ai-tools", icon: Bot },
  { title: "Affiliate", url: "/dashboard/affiliate", icon: Gift },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Zap className="h-4 w-4 text-primary" />
              {!collapsed && <span className="font-bold">ClientHunter</span>}
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Usage Stats */}
        {!collapsed && user && (
          <SidebarGroup>
            <SidebarGroupLabel>Usage</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 px-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Searches today</span>
                  <span className="text-foreground">{user.searches_today}/2</span>
                </div>
                <div className="flex justify-between">
                  <span>Leads remaining</span>
                  <span className="text-foreground">{user.leads_remaining}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span className="capitalize">{user.plan} plan</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Saved Leads</span>
                  <span className={
                    user.saved_leads_count >= PRO_LEADS_LIMIT
                      ? "text-destructive font-semibold"
                      : user.saved_leads_count >= PRO_LEADS_WARNING
                      ? "text-warning font-semibold"
                      : "text-foreground"
                  }>
                    {user.saved_leads_count}/{PRO_LEADS_LIMIT}
                  </span>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {isAdmin && (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary hover:text-primary" asChild>
            <NavLink to="/admin" end className="" activeClassName="bg-muted">
              <ShieldCheck className="h-4 w-4" />
              {!collapsed && <span>Admin Panel</span>}
            </NavLink>
          </Button>
        )}
        <ThemeToggle showLabel={!collapsed} />
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Log out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
