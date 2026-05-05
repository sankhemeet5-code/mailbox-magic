import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/admin/analytics")({
  component: () => <ComingSoon title="Admin analytics" description="Full analytics across all users and orgs." />,
});