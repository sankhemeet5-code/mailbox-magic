import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Megaphone, Trash2, Play, Clock, CheckCircle2, FileEdit, User } from "lucide-react";

export const Route = createFileRoute("/admin/campaigns")({
  component: AdminCampaigns,
});

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  user_id: string;
  profiles: { email: string } | null;
  email_count: number;
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

function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCampaigns = async () => {
    setLoading(true);
    const { data: camps } = await supabase
      .from("campaigns")
      .select("id,name,status,scheduled_at,created_at,user_id")
      .order("created_at", { ascending: false });

    if (!camps) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    // Get email counts per campaign
    const { data: emailCounts } = await supabase.from("emails").select("campaign_id");

    const countMap: Record<string, number> = {};
    (emailCounts ?? []).forEach((e: { campaign_id: string | null }) => {
      if (e.campaign_id) countMap[e.campaign_id] = (countMap[e.campaign_id] || 0) + 1;
    });

    // Get user profiles
    const userIds = [...new Set(camps.map((c) => c.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id,email").in("id", userIds);

    const profMap: Record<string, string> = {};
    (profs ?? []).forEach((p: { id: string; email: string }) => {
      profMap[p.id] = p.email;
    });

    const rows: CampaignRow[] = camps.map((c) => ({
      ...c,
      profiles: profMap[c.user_id] ? { email: profMap[c.user_id] } : null,
      email_count: countMap[c.id] || 0,
    }));

    setCampaigns(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const onStartCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").update({ status: "running" }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase
      .from("emails")
      .update({ status: "pending" })
      .eq("campaign_id", id)
      .eq("status", "draft");
    toast.success("Campaign started");
    loadCampaigns();
  };

  const onCompleteCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").update({ status: "completed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Campaign marked as completed");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All campaigns</h1>
        <p className="text-sm text-muted-foreground">View and manage campaigns from all users.</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No campaigns yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emails</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const cfg = statusConfig[c.status] || statusConfig.draft;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {c.profiles?.email || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.email_count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {c.status === "draft" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onStartCampaign(c.id)}
                              title="Start campaign"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {c.status === "running" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => onCompleteCampaign(c.id)}
                              title="Mark completed"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onDeleteCampaign(c.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
