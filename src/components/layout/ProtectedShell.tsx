import { type ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  children: ReactNode;
  requireRole?: AppRole;
}

export function ProtectedShell({ children, requireRole }: Props) {
  const { user, role, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth/login" });
    else if (requireRole && role !== requireRole) nav({ to: "/unauthorized" });
  }, [user, role, loading, requireRole, nav]);

  if (loading || !user || (requireRole && role !== requireRole)) {
    return (
      <div className="min-h-screen p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border px-4 sticky top-0 bg-background/80 backdrop-blur z-30">
            <SidebarTrigger />
            <div className="font-medium text-sm text-muted-foreground">MailFlow</div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
