import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="font-medium">Coming in the next phase</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            This page will be built out in the next slice. For now, the foundation, auth, templates,
            and single-email send are live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
