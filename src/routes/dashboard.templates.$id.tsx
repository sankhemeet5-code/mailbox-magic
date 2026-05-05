import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "@/components/TemplateEditor";

function TemplateEditPage() {
  const { id } = Route.useParams();
  return <TemplateEditor templateId={id} />;
}

export const Route = createFileRoute("/dashboard/templates/$id")({
  component: TemplateEditPage,
});
