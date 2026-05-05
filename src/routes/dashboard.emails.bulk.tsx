import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/dashboard/emails/bulk")({
  component: () => <ComingSoon title="Bulk email" description="Upload CSV/XLSX, preview recipients, send in batches." />,
});