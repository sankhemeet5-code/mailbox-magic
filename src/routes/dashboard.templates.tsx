import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/templates")({
  component: TemplatesList,
});

interface Tpl { id: string; name: string; subject: string; created_at: string; }

function TemplatesList() {
  const [items, setItems] = useState<Tpl[] | null>(null);

  const load = async () => {
    const { data } = await supabase.from("templates").select("id,name,subject,created_at").order("created_at", { ascending: false });
    setItems((data ?? []) as Tpl[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable email templates with placeholders.</p>
        </div>
        <Button asChild><Link to="/dashboard/templates/new"><Plus className="h-4 w-4 mr-2" />New template</Link></Button>
      </div>

      {!items ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No templates yet.</p>
          <Button asChild className="mt-4"><Link to="/dashboard/templates/new">Create your first</Link></Button>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{t.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button asChild size="icon" variant="ghost"><Link to="/dashboard/templates/$id" params={{ id: t.id }}><Pencil className="h-4 w-4" /></Link></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}