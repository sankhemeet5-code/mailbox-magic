import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailNow } from "@/server/email.functions";
import { Send, FileEdit } from "lucide-react";

export const Route = createFileRoute("/dashboard/emails/new")({
  component: NewEmail,
});

function NewEmail() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const sendNow = useServerFn(sendEmailNow);
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Hi {{name}},</p><p>Write your message here.</p>");
  const [busy, setBusy] = useState(false);

  const insertEmail = async (status: "draft" | "pending") => {
    if (!profile?.org_id) throw new Error("No organization");
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("emails").insert({
      to_email: to.trim(),
      to_name: name.trim() || null,
      subject,
      html_body: sanitizeHtml(body),
      status,
      user_id: u.user!.id,
      org_id: profile.org_id,
    }).select("id").single();
    if (error) throw error;
    return data.id as string;
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await insertEmail("draft");
      toast.success("Saved as draft");
      nav({ to: "/dashboard/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  const onSend = async () => {
    setBusy(true);
    try {
      const id = await insertEmail("pending");
      const res = await sendNow({ data: { emailId: id } });
      if (!res.ok) toast.error(res.error ?? "Send failed");
      else toast.success("Email sent!");
      nav({ to: "/dashboard/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New email</h1>
        <p className="text-sm text-muted-foreground">Compose and send a single message.</p>
      </div>
      <form onSubmit={onSave} className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="to">To (email)</Label>
                <Input id="to" type="email" required value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">HTML body</Label>
              <Textarea id="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Tip: HTML supported. Sanitized before sending.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border border-border p-4 bg-background prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" variant="outline" disabled={busy}><FileEdit className="h-4 w-4 mr-2" />Save draft</Button>
          <Button type="button" onClick={onSend} disabled={busy || !to || !subject}><Send className="h-4 w-4 mr-2" />Send now</Button>
        </div>
      </form>
    </div>
  );
}