import { createFileRoute } from "@tanstack/react-router";
import { TemplateEditor } from "@/components/TemplateEditor";

export const Route = createFileRoute("/dashboard/templates/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <TemplateEditor templateId={id} />;
  },
});