import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Activity } from "lucide-react";
import { getAuditLog } from "@/lib/admin-analytics.functions";

export const Route = createFileRoute("/admin-audit")({
  head: () => ({ meta: [{ title: "Admin · Audit log — MWA" }, { name: "robots", content: "noindex" }] }),
  component: AdminAudit,
});

function AdminAudit() {
  const fetch = useServerFn(getAuditLog);
  const q = useQuery({ queryKey: ["admin-audit"], queryFn: () => fetch() });
  const d: any = q.data;
  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/command" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Command
        </Link>
        <nav className="flex gap-2 text-xs">
          <Link to="/admin-analytics" className="text-accent hover:underline">Analytics</Link>
          <Link to="/admin-scheduler" className="text-accent hover:underline">Scheduler</Link>
          <Link to="/admin-subscribers" className="text-accent hover:underline">Subscribers</Link>
        </nav>
      </div>
      <h1 className="font-display text-3xl tracking-tight text-glow flex items-center gap-2">
        <Activity className="h-7 w-7" /> Audit Log
      </h1>
      <section className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Issued alerts (100 most recent)</div>
        {d?.alerts?.map((a: any) => (
          <div key={a.id} className="p-3">
            <div className="text-sm font-medium">{a.headline}</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {a.severity} · {a.source} · {a.issuer} · {new Date(a.issued_at).toLocaleString()} → {new Date(a.expires_at).toLocaleString()}
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">Scheduled alerts</div>
        {d?.scheduled?.map((s: any) => (
          <div key={s.id} className="p-3">
            <div className="text-sm">{s.status} · {new Date(s.send_at).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground font-mono">by {s.created_by.slice(0, 8)}…</div>
            {s.error && <div className="text-[11px] text-destructive mt-1">{s.error}</div>}
          </div>
        ))}
      </section>
    </div>
  );
}
