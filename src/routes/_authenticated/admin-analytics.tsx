import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, Send, AlertTriangle, BarChart3 } from "lucide-react";
import { getAdminAnalytics } from "@/lib/admin-analytics.functions";

export const Route = createFileRoute("/_authenticated/admin-analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics — MWA" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const fetch = useServerFn(getAdminAnalytics);
  const q = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fetch() });

  if (q.isError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">{(q.error as Error).message}</p>
        <Link to="/" className="text-xs text-accent underline">← Home</Link>
      </div>
    );
  }
  const d: any = q.data;

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/command" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Command
        </Link>
        <nav className="flex gap-2 text-xs">
          <Link to="/admin-scheduler" className="text-accent hover:underline">Scheduler</Link>
          <Link to="/admin-audit" className="text-accent hover:underline">Audit</Link>
          <Link to="/admin-subscribers" className="text-accent hover:underline">Subscribers</Link>
        </nav>
      </div>
      <h1 className="font-display text-3xl tracking-tight text-glow flex items-center gap-2">
        <BarChart3 className="h-7 w-7" /> Analytics
      </h1>
      {!d ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={Users} label="Push subscriptions" value={d.subs.total} />
            <Stat icon={Users} label="Unique users" value={d.subs.uniqueUsers} />
            <Stat icon={AlertTriangle} label="Alerts (30d)" value={d.alertsTotal} />
            <Stat icon={Send} label="Push success rate" value={`${d.delivery.ok + d.delivery.failed === 0 ? 0 : Math.round(d.delivery.ok / (d.delivery.ok + d.delivery.failed) * 100)}%`} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display tracking-wider uppercase text-xs text-accent">Alerts by day (30d)</h2>
            <Bars data={d.alertsByDay} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display tracking-wider uppercase text-xs text-accent">Spotter reports by day (30d)</h2>
            <Bars data={d.reportsByDay} />
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display tracking-wider uppercase text-xs text-accent">Top counties hit</h2>
            <ul className="mt-2 divide-y divide-border">
              {d.topCounties.map((c: any) => (
                <li key={c.name} className="flex justify-between py-1.5 text-sm">
                  <span>{c.name}</span><span className="font-mono text-accent">{c.count}</span>
                </li>
              ))}
              {d.topCounties.length === 0 && <li className="text-xs text-muted-foreground">No data.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-accent">
        <Icon className="h-4 w-4" />
        <span className="font-mono uppercase text-[10px] tracking-wider">{label}</span>
      </div>
      <div className="mt-2 font-display text-3xl tracking-tight">{value}</div>
    </div>
  );
}
function Bars({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-3 flex items-end gap-1 h-32">
      {data.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
      {data.map((d) => (
        <div key={d.day} title={`${d.day} · ${d.count}`} className="flex-1 bg-accent/30 hover:bg-accent rounded-sm" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
      ))}
    </div>
  );
}
