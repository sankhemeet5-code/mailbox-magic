import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Mail, Send, BarChart3, Users, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-40 bg-background/80">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid place-items-center h-8 w-8 rounded-lg text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Mail className="h-4 w-4" />
            </span>
            MailFlow
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth/login">Sign in</Link></Button>
            <Button asChild><Link to="/auth/register">Get started</Link></Button>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" /> Bulk mail, campaigns & analytics
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Send beautiful campaigns at <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>scale</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Compose, schedule, and track every email. Manage SMTP accounts, templates, and recipient lists from one clean dashboard.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild size="lg" className="shadow-lg" style={{ boxShadow: "var(--shadow-elegant)" }}>
            <Link to="/auth/register">Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth/login">Sign in</Link></Button>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Send, title: "Single & Bulk Send", desc: "Compose one-off emails or upload CSV/XLSX for thousands at once." },
          { icon: BarChart3, title: "Real-time Analytics", desc: "Track sent, pending, failed and per-campaign performance." },
          { icon: ShieldCheck, title: "Secure SMTP", desc: "Encrypted SMTP credentials and per-org isolation built in." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
            <div className="h-10 w-10 rounded-lg grid place-items-center text-primary-foreground mb-4" style={{ background: "var(--gradient-primary)" }}>
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

// avoid unused import warnings if user strips
void redirect;
void Users;