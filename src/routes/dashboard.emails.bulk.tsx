import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { sanitizeHtml, applyPlaceholders } from "@/lib/sanitize";
import { Upload, Send, FileText, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/dashboard/emails/bulk")({
  component: BulkEmail,
});

interface Recipient {
  email: string;
  name: string;
  [key: string]: string;
}

interface SendResult {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

function BulkEmail() {
  const { profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Hi {{name}},</p><p>Write your message here.</p>");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<SendResult | null>(null);
  const [templates, setTemplates] = useState<
    { id: string; name: string; subject: string; html_body: string }[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Load templates
  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("templates")
      .select("id,name,subject,html_body")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as typeof templates);
  }, []);

  useState(() => {
    loadTemplates();
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsv = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      toast.error("Please upload a CSV or XLSX file");
      return;
    }

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data as Record<string, string>[];
          const mapped: Recipient[] = parsed
            .filter((row) => row.email || row.Email || row.EMAIL)
            .map((row) => {
              const email = (row.email || row.Email || row.EMAIL || "").trim();
              const name = (row.name || row.Name || row.NAME || "").trim();
              const extra: Record<string, string> = {};
              Object.entries(row).forEach(([key, val]) => {
                const lk = key.toLowerCase();
                if (lk !== "email" && lk !== "name" && val) {
                  extra[key] = val;
                }
              });
              return { email, name, ...extra };
            });
          if (mapped.length === 0) {
            toast.error("No valid recipients found. Ensure your file has an 'email' column.");
            return;
          }
          setRecipients(mapped);
          setResult(null);
          toast.success(`Loaded ${mapped.length} recipients`);
        },
        error: () => toast.error("Failed to parse CSV file"),
      });
    } else {
      // For XLSX, use dynamic import
      import("xlsx")
        .then((XLSX) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const parsed = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
            const mapped: Recipient[] = parsed
              .filter((row) => row.email || row.Email || row.EMAIL)
              .map((row) => {
                const email = (row.email || row.Email || row.EMAIL || "").trim();
                const name = (row.name || row.Name || row.NAME || "").trim();
                const extra: Record<string, string> = {};
                Object.entries(row).forEach(([key, val]) => {
                  const lk = key.toLowerCase();
                  if (lk !== "email" && lk !== "name" && val) {
                    extra[key] = String(val);
                  }
                });
                return { email, name, ...extra };
              });
            if (mapped.length === 0) {
              toast.error("No valid recipients found. Ensure your file has an 'email' column.");
              return;
            }
            setRecipients(mapped);
            setResult(null);
            toast.success(`Loaded ${mapped.length} recipients`);
          };
          reader.readAsBinaryString(file);
        })
        .catch(() => toast.error("Failed to load XLSX parser"));
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.html_body);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return toast.error("No organization");
    if (recipients.length === 0) return toast.error("Upload recipients first");
    if (!subject) return toast.error("Subject is required");

    setBusy(true);
    setSending(true);
    setProgress({ current: 0, total: recipients.length });
    setResult(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      setSending(false);
      return;
    }

    const sent = 0;
    let failed = 0;
    let pending = 0;
    const batchSize = 25;

    // Insert emails in batches
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const rows = batch.map((r) => ({
        to_email: r.email,
        to_name: r.name || null,
        subject: applyPlaceholders(subject, r),
        html_body: sanitizeHtml(applyPlaceholders(body, r)),
        status: "pending" as const,
        user_id: u.user.id,
        org_id: profile.org_id,
      }));

      const { error } = await supabase.from("emails").insert(rows);
      if (error) {
        failed += batch.length;
        toast.error(`Batch failed: ${error.message}`);
      } else {
        pending += batch.length;
      }
      setProgress({
        current: Math.min(i + batchSize, recipients.length),
        total: recipients.length,
      });
    }

    setResult({ total: recipients.length, sent, failed, pending });
    setSending(false);
    setBusy(false);

    if (pending > 0) {
      toast.success(
        `${pending} emails queued for sending. They will be processed by the SMTP server.`,
      );
    }
  };

  const onSaveDraft = async () => {
    if (!profile?.org_id) return toast.error("No organization");
    if (recipients.length === 0) return toast.error("Upload recipients first");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }

    const rows = recipients.map((r) => ({
      to_email: r.email,
      to_name: r.name || null,
      subject: applyPlaceholders(subject, r),
      html_body: sanitizeHtml(applyPlaceholders(body, r)),
      status: "draft" as const,
      user_id: u.user.id,
      org_id: profile.org_id,
    }));

    const { error } = await supabase.from("emails").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} drafts saved`);
  };

  const dummyRecipient: Record<string, string> = {
    name: "Jane Doe",
    email: "jane@example.com",
    company: "Acme Inc",
  };
  const previewHtml = sanitizeHtml(applyPlaceholders(body, dummyRecipient));
  const previewSubject = applyPlaceholders(subject, dummyRecipient);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk email</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV/XLSX, preview recipients, send in batches.
        </p>
      </div>

      <form onSubmit={onSend} className="space-y-6">
        {/* Template selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* File upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <Upload className="h-4 w-4" /> Choose CSV or XLSX
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              {recipients.length > 0 && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {recipients.length} recipients loaded
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              File must have an <code className="text-primary">email</code> column. Optional:{" "}
              <code className="text-primary">name</code>,{" "}
              <code className="text-primary">company</code>, or any custom field for{" "}
              <code className="text-primary">{"{{placeholders}}"}</code>.
            </p>
          </CardContent>
        </Card>

        {/* Recipients preview */}
        {recipients.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recipients ({recipients.length})</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setRecipients([])}>
                  <X className="h-4 w-4 mr-1" /> Clear all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.slice(0, 100).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.email}</TableCell>
                        <TableCell>{r.name || "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeRecipient(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recipients.length > 100 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground text-sm py-3"
                        >
                          Showing 100 of {recipients.length} recipients
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Hello {{name}}"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">HTML body</Label>
              <Textarea
                id="body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="text-primary">{"{{name}}"}</code>,{" "}
                <code className="text-primary">{"{{email}}"}</code>, or any column header as a
                placeholder.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (first recipient)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Subject: {previewSubject}</div>
            <div
              className="rounded-md border border-border p-4 bg-background prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>

        {/* Progress */}
        {sending && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 animate-spin text-primary" />
                Queuing emails... {progress.current} / {progress.total}
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-medium">Bulk email complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">{result.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-warning">{result.pending}</div>
                  <div className="text-xs text-muted-foreground">Queued</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-destructive">{result.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={busy || recipients.length === 0 || !subject}>
            <Send className="h-4 w-4 mr-2" /> Queue for sending ({recipients.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || recipients.length === 0}
            onClick={onSaveDraft}
          >
            <FileText className="h-4 w-4 mr-2" /> Save as drafts
          </Button>
        </div>
      </form>
    </div>
  );
}
