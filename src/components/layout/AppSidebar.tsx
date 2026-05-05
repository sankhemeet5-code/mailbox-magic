import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Send, Upload, Megaphone, FileText, Users, Server, BarChart3, Mail, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const userNav = [
  { title: "Overview", url: "/dashboard/overview", icon: LayoutDashboard },
  { title: "New Email", url: "/dashboard/emails/new", icon: Send },
  { title: "Bulk Email", url: "/dashboard/emails/bulk", icon: Upload },
  { title: "Campaigns", url: "/dashboard/campaigns", icon: Megaphone },
  { title: "Templates", url: "/dashboard/templates", icon: FileText },
];

const adminNav = [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "SMTP Accounts", url: "/admin/smtp", icon: Server },
  { title: "All Campaigns", url: "/admin/campaigns", icon: Megaphone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { role, profile, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const collapsed = state === "collapsed";
  const isActive = (u: string) => path === u || path.startsWith(u + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 font-semibold">
          <span className="grid place-items-center h-8 w-8 rounded-lg text-primary-foreground shrink-0" style={{ background: "var(--gradient-primary)" }}>
            <Mail className="h-4 w-4" />
          </span>
          {!collapsed && <span>MailFlow</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && profile && (
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
            {profile.email}
            {role && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">{role}</span>}
          </div>
        )}
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}