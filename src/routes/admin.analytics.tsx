import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart,
  Bar,
} from "recharts";
import {
  Send,
  Clock,
  FileEdit,
  AlertCircle,
  Megaphone,
  Activity,
  Users,
  Server,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

interface EmailRow {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  campaign_id: string | null;
  user_id: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
}

interface UserRow {
  id: string;
  email: string;
}

function AdminAnalytics() {
  const [emails, setEmails] = useState<EmailRow[] | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [smtpCount, setSmtpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: c }, { data: u }, { data: s }] = await Promise.all([
        supabase
          .from("emails")
          .select("id,to_email,subject,status,sent_at,created_at,campaign_id,user_id")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("campaigns").select("id,name,status"),
        supabase.from("profiles").select("id,email"),
        supabase.from("smtp_accounts").select("id", { count: "exact" }),
      ]);
      setEmails((e ?? []) as EmailRow[]);
      setCampaigns((c ?? []) as CampaignRow[]);
      setUsers((u ?? []) as UserRow[]);
      setSmtpCount(s?.length ?? 0);
      setLoading(false);
    })();
  }, []);

  if (loading || !emails) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const filteredEmails =
    statusFilter === "all" ? emails : emails.filter((x) => x.status === statusFilter);

  const counts = {
    sent: emails.filter((x) => x.status === "sent").length,
    pending: emails.filter((x) => x.status === "pending").length,
    draft: emails.filter((x) => x.status === "draft").length,
    failed: emails.filter((x) => x.status === "failed").length,
  };

  const campaignCounts = {
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    running: campaigns.filter((c) => c.status === "running").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
  };

  // 30-day line data
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      day: key.slice(5),
      sent: emails.filter((x) => x.sent_at?.slice(0, 10) === key).length,
      failed: emails.filter((x) => x.status === "failed" && x.created_at?.slice(0, 10) === key)
        .length,
    };
  });

  // Per-user email stats
  const userMap: Record<string, string> = {};
  users.forEach((u) => {
    userMap[u.id] = u.email;
  });

  const perUser: Record<
    string,
    { email: string; sent: number; pending: number; failed: number; draft: number }
  > = {};
  emails.forEach((e) => {
    if (!perUser[e.user_id]) {
      perUser[e.user_id] = {
        email: userMap[e.user_id] || "Unknown",
        sent: 0,
        pending: 0,
        failed: 0,
        draft: 0,
      };
    }
    if (e.status in perUser[e.user_id]) {
      perUser[e.user_id][e.status as keyof Omit<(typeof perUser)[string], "email">]++;
    }
  });
  const perUserData = Object.values(perUser).sort(
    (a, b) => b.sent + b.pending + b.failed + b.draft - (a.sent + a.pending + a.failed + a.draft),
  );

  const donut = [
    { name: "Sent", value: counts.sent, color: "oklch(0.65 0.18 150)" },
    { name: "Pending", value: counts.pending, color: "oklch(0.78 0.18 75)" },
    { name: "Failed", value: counts.failed, color: "oklch(0.577 0.245 27.325)" },
    { name: "Draft", value: counts.draft, color: "oklch(0.50 0.03 260)" },
  ];

  const campaignDonut = [
    { name: "Draft", value: campaignCounts.draft, color: "oklch(0.50 0.03 260)" },
    { name: "Scheduled", value: campaignCounts.scheduled, color: "oklch(0.78 0.18 75)" },
    { name: "Running", value: campaignCounts.running, color: "oklch(0.55 0.22 265)" },
    { name: "Completed", value: campaignCounts.completed, color: "oklch(0.65 0.18 150)" },
  ];

  const stats = [
    { label: "Total Emails", value: emails.length, icon: Send, color: "text-primary" },
    { label: "Sent", value: counts.sent, icon: CheckCircle, color: "text-success" },
    { label: "Pending", value: counts.pending, icon: Clock, color: "text-warning" },
    { label: "Drafts", value: counts.draft, icon: FileEdit, color: "text-muted-foreground" },
    { label: "Failed", value: counts.failed, icon: AlertCircle, color: "text-destructive" },
    { label: "Campaigns", value: campaignCounts.total, icon: Megaphone, color: "text-primary" },
    { label: "Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "SMTP Accounts", value: smtpCount, icon: Server, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin analytics</h1>
          <p className="text-sm text-muted-foreground">
            Full analytics across all users and organizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <CardTitle className="text-base">Email activity — last 30 days</CardTitle>
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
                  stroke="oklch(0.65 0.18 150)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="oklch(0.577 0.245 27.325)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email status</CardTitle>
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

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Per-user email volume</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perUserData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="email"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="sent" stackId="a" fill="oklch(0.65 0.18 150)" />
                <Bar dataKey="pending" stackId="a" fill="oklch(0.78 0.18 75)" />
                <Bar dataKey="failed" stackId="a" fill="oklch(0.577 0.245 27.325)" />
                <Bar dataKey="draft" stackId="a" fill="oklch(0.50 0.03 260)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign status</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={campaignDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {campaignDonut.map((d, i) => (
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Recent emails{" "}
              {statusFilter !== "all" && (
                <Badge variant="outline" className="ml-2">
                  {statusFilter}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.slice(0, 20).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.to_email}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.subject}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {userMap[e.user_id] || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(e.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredEmails.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No emails found.
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

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
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
