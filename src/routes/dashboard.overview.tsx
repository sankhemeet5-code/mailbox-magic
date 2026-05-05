import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Clock, FileEdit, AlertCircle, Megaphone, Activity } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/dashboard/overview")({
  component: Overview,
});

interface EmailRow {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  campaign_id: string | null;
}

function Overview() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailRow[] | null>(null);
  const [campaignsCount, setCampaignsCount] = useState({ total: 0, active: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: c }] = await Promise.all([
        supabase
          .from("emails")
          .select("id,to_email,subject,status,sent_at,created_at,campaign_id")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("campaigns").select("id,status"),
      ]);
      setEmails((e ?? []) as EmailRow[]);
      setCampaignsCount({
        total: c?.length ?? 0,
        active: (c ?? []).filter(
          (x: { status: string }) => x.status === "running" || x.status === "scheduled",
        ).length,
      });
    })();
  }, [user]);

  if (!emails) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const counts = {
    sent: emails.filter((x) => x.status === "sent").length,
    pending: emails.filter((x) => x.status === "pending").length,
    draft: emails.filter((x) => x.status === "draft").length,
    failed: emails.filter((x) => x.status === "failed").length,
  };

  // 30-day line data
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      day: key.slice(5),
      sent: emails.filter((x) => x.sent_at?.slice(0, 10) === key).length,
    };
  });

  const donut = [
    { name: "Sent", value: counts.sent, color: "var(--success)" },
    { name: "Pending", value: counts.pending, color: "var(--warning)" },
    { name: "Failed", value: counts.failed, color: "var(--destructive)" },
    { name: "Draft", value: counts.draft, color: "var(--muted-foreground)" },
  ];

  const stats = [
    { label: "Sent", value: counts.sent, icon: Send, color: "text-success" },
    { label: "Pending", value: counts.pending, icon: Clock, color: "text-warning" },
    { label: "Drafts", value: counts.draft, icon: FileEdit, color: "text-muted-foreground" },
    { label: "Failed", value: counts.failed, icon: AlertCircle, color: "text-destructive" },
    { label: "Campaigns", value: campaignsCount.total, icon: Megaphone, color: "text-primary" },
    { label: "Active", value: campaignsCount.active, icon: Activity, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Your email activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sent emails — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={days}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="oklch(0.55 0.22 265)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {donut.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent emails</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.slice(0, 10).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.to_email}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.subject}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {e.sent_at ? new Date(e.sent_at).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {emails.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No emails yet. Send your first!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    sent: "bg-success/15 text-success border-success/20",
    pending: "bg-warning/15 text-warning border-warning/20",
    failed: "bg-destructive/15 text-destructive border-destructive/20",
    draft: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={variants[status] ?? ""}>
      {status}
    </Badge>
  );
}
