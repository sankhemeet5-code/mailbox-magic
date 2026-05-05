import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sanitizeHtml, applyPlaceholders } from "@/lib/sanitize";
import { Skeleton } from "@/components/ui/skeleton";

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Hello {{name}}");
  const [body, setBody] = useState(
    "<p>Hi {{name}},</p><p>This is your message from {{company}}.</p>",
  );
  const [loading, setLoading] = useState(!!templateId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    (async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("name,subject,html_body")
        .eq("id", templateId)
        .maybeSingle();
      if (error || !data) toast.error("Template not found");
      else {
        setName(data.name);
        setSubject(data.subject);
        setBody(data.html_body);
      }
      setLoading(false);
    })();
  }, [templateId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return toast.error("No organization");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      name,
      subject,
      html_body: sanitizeHtml(body),
      user_id: u.user!.id,
      org_id: profile.org_id,
    };
    const { error } = templateId
      ? await supabase
          .from("templates")
          .update({ name, subject, html_body: sanitizeHtml(body) })
          .eq("id", templateId)
      : await supabase.from("templates").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    nav({ to: "/dashboard/templates" });
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96" />
      </div>
    );

  const dummy = { name: "Jane Doe", company: "Acme Inc", custom_field: "VIP" };
  const previewHtml = sanitizeHtml(applyPlaceholders(body, dummy));
  const previewSubject = applyPlaceholders(subject, dummy);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{templateId ? "Edit template" : "New template"}</h1>
        <p className="text-sm text-muted-foreground">
          Use <code className="text-primary">{`{{name}}`}</code>,{" "}
          <code className="text-primary">{`{{company}}`}</code>, or any custom field.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tname">Name</Label>
              <Input
                id="tname"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tsubj">Subject</Label>
              <Input
                id="tsubj"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tbody">HTML body</Label>
              <Textarea
                id="tbody"
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving..." : "Save template"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => nav({ to: "/dashboard/templates" })}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Subject</div>
            <div className="font-medium mb-4">{previewSubject}</div>
            <div
              className="rounded-md border border-border p-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Preview uses dummy data: {JSON.stringify(dummy)}
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
