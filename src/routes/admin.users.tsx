import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Users, Plus, Shield, UserCircle, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

interface Row {
  id: string;
  email: string;
  org_id: string | null;
  created_at: string;
  roles: string[];
}

function UsersAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("user");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,email,org_id,created_at"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const byUser: Record<string, string[]> = {};
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      (byUser[r.user_id] ||= []).push(r.role);
    });
    setRows(
      (profs ?? []).map(
        (p: { id: string; email: string; org_id: string | null; created_at: string }) => ({
          ...p,
          roles: byUser[p.id] ?? [],
        }),
      ),
    );
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (userId: string, role: "admin" | "user", add: boolean) => {
    if (add) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
      toast.success(`Added ${role} role`);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) return toast.error(error.message);
      toast.success(`Removed ${role} role`);
    }
    load();
  };

  const onInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return toast.error("Email is required");
    setBusy(true);

    // Sign up the user via Supabase auth
    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail,
      password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 10),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: { invited: true },
      },
    });

    if (error) {
      // If user already exists, try to just add the role
      if (error.message.includes("already registered")) {
        toast.error("User already exists. Use role management below to adjust their role.");
        setBusy(false);
        return;
      }
      toast.error(error.message);
      setBusy(false);
      return;
    }

    if (data.user && inviteRole === "admin") {
      // Add admin role for the new user
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "admin" });
      if (roleErr) toast.error(`User created but failed to add admin role: ${roleErr.message}`);
    }

    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail("");
    setInviteRole("user");
    setDialogOpen(false);
    setBusy(false);
    setTimeout(load, 1000);
  };

  const removeUser = async (userId: string) => {
    // Remove user roles first, then profile
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("User removed from organization");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage users and their roles.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" /> Invite user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite new user</DialogTitle>
            </DialogHeader>
            <form onSubmit={onInviteUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                An invitation email will be sent. The user will set their own password on first
                login.
              </p>
              <div className="flex gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Inviting..." : "Send invitation"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!rows ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.roles.map((x) => (
                          <Badge
                            key={x}
                            variant="outline"
                            className={
                              x === "admin"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {x === "admin" ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : (
                              <UserCircle className="h-3 w-3 mr-1" />
                            )}
                            {x}
                          </Badge>
                        ))}
                        {r.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">No role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!r.roles.includes("admin") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => toggleRole(r.id, "admin", true)}
                          >
                            <Shield className="h-3 w-3 mr-1" /> Make admin
                          </Button>
                        )}
                        {r.roles.includes("admin") && r.roles.includes("user") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => toggleRole(r.id, "admin", false)}
                          >
                            Remove admin
                          </Button>
                        )}
                        {!r.roles.includes("user") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => toggleRole(r.id, "user", true)}
                          >
                            Add user role
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => removeUser(r.id)}
                          title="Remove user"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
