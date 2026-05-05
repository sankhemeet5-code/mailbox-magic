import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";
import { Plus, FileText, Trash2, Pencil, Eye, Copy } from "lucide-react";

export const Route = createFileRoute("/dashboard/templates")({
  component: TemplatesPage,
});

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

function TemplatesPage() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Hi {{name}},</p><p>Your message here.</p>");

  const load = async () => {
    const { data } = await supabase
      .from("templates")
      .select("id,name,subject,html_body,created_at,updated_at")
      .order("updated_at", { ascending: false });
    setTemplates((data ?? []) as Template[]);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName("");
    setSubject("");
    setBody("<p>Hi {{name}},</p><p>Your message here.</p>");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setName(t.name);
    setSubject(t.subject);
    setBody(t.html_body);
    setEditingId(t.id);
    setDialogOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return toast.error("No organization");
    if (!name || !subject) return toast.error("Name and subject are required");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("templates")
        .update({ name, subject, html_body: body, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      toast.success("Template updated");
    } else {
      const { error } = await supabase
        .from("templates")
        .insert({ name, subject, html_body: body, user_id: u.user.id, org_id: profile.org_id });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      toast.success("Template created");
    }

    setDialogOpen(false);
    resetForm();
    setBusy(false);
    load();
  };

  const onDelete = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Template deleted");
      load();
    }
  };

  const onDuplicate = async (t: Template) => {
    if (!profile?.org_id) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase.from("templates").insert({
      name: `${t.name} (copy)`,
      subject: t.subject,
      html_body: t.html_body,
      user_id: u.user.id,
      org_id: profile.org_id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Template duplicated");
      load();
    }
  };

  const openPreview = (t: Template) => {
    setPreviewTemplate(t);
    setPreviewOpen(true);
  };

  const dummyData = { name: "Jane Doe", email: "jane@example.com", company: "Acme Inc" };
  const previewHtml = previewTemplate
    ? sanitizeHtml(
        previewTemplate.html_body.replace(
          /\{\{(\w+)\}\}/g,
          (_, key) => dummyData[key as keyof typeof dummyData] || `{{${key}}}`,
        ),
      )
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create reusable email templates with placeholders.
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit template" : "Create template"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Template name</Label>
                <Input
                  id="tpl-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-subject">Subject line</Label>
                <Input
                  id="tpl-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to {{company}}, {{name}}!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-body">HTML body</Label>
                <Textarea
                  id="tpl-body"
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="text-primary">{"{{name}}"}</code>,{" "}
                  <code className="text-primary">{"{{email}}"}</code>, or any custom field as
                  placeholders.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : editingId ? "Update template" : "Create template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Subject: {previewTemplate?.subject}</div>
            <div
              className="rounded-md border p-4 bg-background prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {!templates ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No templates yet.</p>
            <Button className="mt-4" onClick={openCreate}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {t.name}
                      <Badge variant="outline" className="text-xs">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Subject: {t.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.html_body
                        .replace(/<[^>]*>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim()
                        .slice(0, 120)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openPreview(t)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onDuplicate(t)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onDelete(t.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
