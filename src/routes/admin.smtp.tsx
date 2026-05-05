import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { encryptSmtpPassword } from "@/lib/email-fns";
import { Trash2, Server } from "lucide-react";

export const Route = createFileRoute("/admin/smtp")({
  component: SmtpPage,
});

interface Smtp {
  id: string;
  org_id: string;
  host: string;
  port: number;
  username: string;
  from_name: string;
  from_email: string;
  is_active: boolean;
}

function SmtpPage() {
  const { profile } = useAuth();
  const encryptFn = useServerFn(encryptSmtpPassword);
  const [items, setItems] = useState<Smtp[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    from_name: "",
    from_email: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("smtp_accounts")
      .select("id,org_id,host,port,username,from_name,from_email,is_active")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Smtp[]);
  };
  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile?.org_id) return toast.error("No organization");
    setBusy(true);
    try {
      const { encrypted } = await encryptFn({ data: { password: form.password } });
      const { error } = await supabase.from("smtp_accounts").insert({
        org_id: profile.org_id,
        host: form.host,
        port: form.port,
        username: form.username,
        encrypted_password: encrypted,
        from_name: form.from_name,
        from_email: form.from_email,
        is_active: true,
      });
      if (error) throw error;
      toast.success("SMTP account added");
      setForm({ host: "", port: 587, username: "", password: "", from_name: "", from_email: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (id: string, val: boolean) => {
    const { error } = await supabase.from("smtp_accounts").update({ is_active: val }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("smtp_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      load();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">SMTP accounts</h1>
        <p className="text-sm text-muted-foreground">
          Configure outbound mail for your organization. Passwords are encrypted at rest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add SMTP account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input
                required
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                required
                value={form.port}
                onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>From name</Label>
              <Input
                required
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Acme Inc"
              />
            </div>
            <div className="space-y-2">
              <Label>From email</Label>
              <Input
                type="email"
                required
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="hello@acme.com"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving..." : "Add account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {!items ? (
          <Skeleton className="h-32" />
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Server className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No SMTP accounts yet.</p>
            </CardContent>
          </Card>
        ) : (
          items.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {s.from_name}{" "}
                    <span className="text-muted-foreground font-normal text-sm">
                      &lt;{s.from_email}&gt;
                    </span>{" "}
                    {s.is_active && (
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {s.host}:{s.port} · {s.username}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
