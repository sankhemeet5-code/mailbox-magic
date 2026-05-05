import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/admin/campaigns")({
  component: () => <ComingSoon title="All campaigns" description="View campaigns from all users." />,
});