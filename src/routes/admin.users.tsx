import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/users")({
  component: UsersAdmin,
});

interface Row { id: string; email: string; org_id: string | null; created_at: string; roles: string[]; }

function UsersAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    (async () => {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id,email,org_id,created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const byUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: { user_id: string; role: string }) => {
        (byUser[r.user_id] ||= []).push(r.role);
      });
      setRows((profs ?? []).map((p: { id: string; email: string; org_id: string | null; created_at: string }) => ({ ...p, roles: byUser[p.id] ?? [] })));
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">All users in the system. Role management UI in next phase.</p>
      </div>
      <Card><CardContent className="p-0">
        {!rows ? <div className="p-6"><Skeleton className="h-32" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell>{r.roles.map((x) => <Badge key={x} variant="outline" className="mr-1">{x}</Badge>)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}