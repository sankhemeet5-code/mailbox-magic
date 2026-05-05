import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/layout/ProtectedShell";

export const Route = createFileRoute("/admin")({
  component: () => (
    <ProtectedShell requireRole="admin">
      <Outlet />
    </ProtectedShell>
  ),
});
