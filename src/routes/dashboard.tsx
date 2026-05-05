import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedShell } from "@/components/layout/ProtectedShell";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedShell>
      <Outlet />
    </ProtectedShell>
  ),
});