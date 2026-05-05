import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "@/components/TemplateEditor";

export const Route = createFileRoute("/dashboard/templates/new")({
  component: () => <TemplateEditor />,
});
