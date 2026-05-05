import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
  component: () => (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 grid place-items-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  ),
});
