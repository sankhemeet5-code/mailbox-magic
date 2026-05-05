import { createFileRoute, Link } from "@tanstack/react-router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { sanitizeHtml, applyPlaceholders } from "@/lib/sanitize";
import {
  Plus,
  Megaphone,
  Trash2,
  Play,
  Clock,
  CheckCircle2,
  FileEdit,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/dashboard/campaigns")({
  component: CampaignsPage,
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  template_id: string | null;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
}

interface Recipient {
  email: string;
  name: string;
  [key: string]: string;
}

const statusConfig: Record<string, { label: string; className: string; icon: typeof Play }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileEdit },
  scheduled: {
    label: "Scheduled",
    className: "bg-warning/15 text-warning border-warning/20",
    icon: Clock,
  },
  running: {
    label: "Running",
    className: "bg-primary/15 text-primary border-primary/20",
    icon: Play,
  },
  completed: {
    label: "Completed",
    className: "bg-success/15 text-success border-success/20",
    icon: CheckCircle2,
  },
};

function CampaignsPage() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // New campaign form
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("<p>Hi {{name}},</p><p>Your message here.</p>");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id,name,status,scheduled_at,created_at,template_id")
      .order("created_at", { ascending: false });
    setCampaigns((data ?? []) as Campaign[]);
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("templates")
      .select("id,name,subject,html_body")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as Template[]);
  };

  useEffect(() => {
    loadCampaigns();
    loadTemplates();
  }, []);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.html_body);
    }
  };

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
                if (lk !== "email" && lk !== "name" && val) extra[key] = val;
              });
              return { email, name, ...extra };
            });
          if (mapped.length === 0) {
            toast.error("No valid recipients found. Ensure your file has an 'email' column.");
            return;
          }
          setRecipients(mapped);
          toast.success(`Loaded ${mapped.length} recipients`);
        },
        error: () => toast.error("Failed to parse CSV file"),
      });
    } else {
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
                  if (lk !== "email" && lk !== "name" && val) extra[key] = String(val);
                });
                return { email, name, ...extra };
              });
            if (mapped.length === 0) {
              toast.error("No valid recipients found.");
              return;
            }
            setRecipients(mapped);
            toast.success(`Loaded ${mapped.length} recipients`);
          };
          reader.readAsBinaryString(file);
        })
        .catch(() => toast.error("Failed to load XLSX parser"));
    }
  };

  const onCreateCampaign = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return toast.error("No organization");
    if (!name) return toast.error("Campaign name is required");
    if (recipients.length === 0) return toast.error("Upload recipients first");

    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }

    const scheduledAt =
      scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : null;

    const status = scheduledAt ? "scheduled" : "draft";

    // Create campaign
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        name,
        template_id: templateId || null,
        status,
        scheduled_at: scheduledAt,
        user_id: u.user.id,
        org_id: profile.org_id,
      })
      .select("id")
      .single();

    if (campErr || !campaign) {
      toast.error(campErr?.message || "Failed to create campaign");
      setBusy(false);
      return;
    }

    // Insert recipients into recipient_lists
    const recipientRows = recipients.map((r) => ({
      campaign_id: campaign.id,
      email: r.email,
      name: r.name || null,
      extra_fields: Object.fromEntries(
        Object.entries(r).filter(([k]) => k !== "email" && k !== "name"),
      ),
    }));

    const { error: recErr } = await supabase.from("recipient_lists").insert(recipientRows);
    if (recErr) {
      toast.error(`Recipients error: ${recErr.message}`);
      setBusy(false);
      return;
    }

    // Insert emails for each recipient
    const emailRows = recipients.map((r) => ({
      campaign_id: campaign.id,
      to_email: r.email,
      to_name: r.name || null,
      subject: applyPlaceholders(subject, r),
      html_body: sanitizeHtml(applyPlaceholders(body, r)),
      status: scheduledAt ? "pending" : "draft",
      user_id: u.user.id,
      org_id: profile.org_id,
    }));

    // Insert in batches of 25
    for (let i = 0; i < emailRows.length; i += 25) {
      const batch = emailRows.slice(i, i + 25);
      await supabase.from("emails").insert(batch);
    }

    toast.success(`Campaign "${name}" created with ${recipients.length} recipients`);
    resetForm();
    setDialogOpen(false);
    setBusy(false);
    loadCampaigns();
  };

  const onStartCampaign = async (id: string) => {
    // Update campaign status to running and all draft/pending emails to pending
    const { error: campErr } = await supabase
      .from("campaigns")
      .update({ status: "running" })
      .eq("id", id);
    if (campErr) return toast.error(campErr.message);

    // Update all draft emails in this campaign to pending
    await supabase
      .from("emails")
      .update({ status: "pending" })
      .eq("campaign_id", id)
      .eq("status", "draft");

    toast.success("Campaign started! Emails are being queued.");
    loadCampaigns();
  };

  const onDeleteCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Campaign deleted");
      loadCampaigns();
    }
  };

  const resetForm = () => {
    setName("");
    setTemplateId("");
    setSubject("");
    setBody("<p>Hi {{name}},</p><p>Your message here.</p>");
    setRecipients([]);
    setScheduleDate("");
    setScheduleTime("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Create and manage email campaigns.</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={onCreateCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="camp-name">Campaign name</Label>
                <Input
                  id="camp-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Welcome Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label>Template (optional)</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-subject">Subject</Label>
                <Input
                  id="camp-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-body">HTML body</Label>
                <Textarea
                  id="camp-body"
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="text-primary">{"{{name}}"}</code>,{" "}
                  <code className="text-primary">{"{{email}}"}</code>, or any column header.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Upload recipients</Label>
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="camp-file"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <Upload className="h-4 w-4" /> Choose CSV or XLSX
                  </Label>
                  <Input
                    id="camp-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {recipients.length > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/20"
                    >
                      {recipients.length} recipients
                    </Badge>
                  )}
                </div>
              </div>

              {recipients.length > 0 && (
                <div className="rounded-md border p-3 max-h-32 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients.slice(0, 20).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{r.email}</TableCell>
                          <TableCell className="text-sm">{r.name || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {recipients.length > 20 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-center text-muted-foreground text-xs"
                          >
                            +{recipients.length - 20} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sched-date">Schedule date (optional)</Label>
                  <Input
                    id="sched-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sched-time">Schedule time</Label>
                  <Input
                    id="sched-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={busy || recipients.length === 0}>
                  {busy ? "Creating..." : scheduleDate ? "Schedule campaign" : "Create campaign"}
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

      {!campaigns ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No campaigns yet.</p>
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              Create your first campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => {
            const cfg = statusConfig[c.status] || statusConfig.draft;
            const Icon = cfg.icon;
            return (
              <Card key={c.id}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {c.name}
                      <Badge variant="outline" className={cfg.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created {new Date(c.created_at).toLocaleDateString()}
                      {c.scheduled_at &&
                        ` · Scheduled ${new Date(c.scheduled_at).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === "draft" && (
                      <Button size="sm" onClick={() => onStartCampaign(c.id)}>
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => onDeleteCampaign(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
