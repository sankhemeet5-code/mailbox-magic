import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/dashboard/campaigns")({
  component: () => <ComingSoon title="Campaigns" description="Manage scheduled and ongoing campaigns." />,
});