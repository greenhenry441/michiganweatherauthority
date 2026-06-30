import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Camera, Cloud, Tornado, Snowflake, Droplets, Wind, AlertTriangle, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listReports, leaderboardThisMonth } from "@/lib/spotter-reports.functions";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Storm Reports — MWA Spotter Network" },
      { name: "description", content: "Live ground-truth storm reports from the Michigan Weather Authority spotter network." },
      { property: "og:title", content: "MWA Spotter Reports" },
      { property: "og:description", content: "Crowd-sourced storm reports across Michigan — hail, wind, flooding, funnels." },
    ],
  }),
  component: ReportsPage,
});

const KIND_META: Record<string, { icon: any; label: string; color: string }> = {
  tornado:     { icon: Tornado,        label: "Tornado",        color: "text-red-400" },
  funnel:      { icon: Tornado,        label: "Funnel cloud",   color: "text-orange-400" },
  wall_cloud:  { icon: Cloud,          label: "Wall cloud",     color: "text-orange-300" },
  hail:        { icon: AlertTriangle,  label: "Hail",           color: "text-cyan-300" },
  wind_damage: { icon: Wind,           label: "Wind damage",    color: "text-yellow-300" },
  flooding:    { icon: Droplets,       label: "Flooding",       color: "text-blue-300" },
  heavy_snow:  { icon: Snowflake,      label: "Heavy snow",     color: "text-blue-200" },
  ice:         { icon: Snowflake,      label: "Ice",            color: "text-blue-100" },
  other:       { icon: Cloud,          label: "Other",          color: "text-muted-foreground" },
};

function ReportsPage() {
  const fetchReports = useServerFn(listReports);
  const fetchBoard = useServerFn(leaderboardThisMonth);
  const reports = useQuery({ queryKey: ["reports"], queryFn: () => fetchReports({ data: { limit: 100 } as any }) });
  const board = useQuery({ queryKey: ["report-leaderboard"], queryFn: () => fetchBoard() });

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5 min-h-11 px-2">
          <ArrowLeft className="h-4 w-4" /> Back to MWA
        </Link>
        <Link to="/spotter">
          <Button size="sm" className="min-h-11"><Plus className="h-4 w-4 mr-1.5" /> Submit report</Button>
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl tracking-tight text-glow">Spotter Reports</h1>
        <p className="text-sm text-muted-foreground">Live ground-truth from the MWA spotter network.</p>
      </div>

      <section className="grid md:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-3">
          {reports.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {reports.data && reports.data.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No reports yet. Be the first to log one.
            </div>
          )}
          {reports.data?.map((r: any) => {
            const meta = KIND_META[r.kind] ?? KIND_META.other;
            const Icon = meta.icon;
            return (
              <Link
                key={r.id}
                to="/reports/$id"
                params={{ id: r.id }}
                className="block rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 grid place-items-center shrink-0">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display tracking-wide text-sm">{meta.label}</span>
                      {r.measurement && <Badge variant="outline" className="text-[10px]">{r.measurement}</Badge>}
                      {r.status === "confirmed" && <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">Confirmed</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {r.location_label || `${r.lat.toFixed(2)}, ${r.lon.toFixed(2)}`}
                      <span>·</span>
                      <span>{relTime(r.created_at)}</span>
                    </div>
                    {r.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.notes}</p>}
                  </div>
                  {r.photo_url && (
                    <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                      <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>👍 {r.confirmed_count}</span>
                  <span>👎 {r.doubt_count}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display tracking-wider uppercase text-xs text-accent flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> Top spotters · this month
            </h2>
            <ol className="mt-3 space-y-1.5 text-sm">
              {board.data?.length ? board.data.slice(0, 10).map((u: any, i: number) => (
                <li key={u.handle} className="flex justify-between gap-2">
                  <span className="font-mono text-muted-foreground">#{i + 1}</span>
                  <span className="flex-1 truncate font-mono text-xs">{u.handle}…</span>
                  <span className="text-xs text-accent">{u.confirms} ✓ · {u.reports} reports</span>
                </li>
              )) : <li className="text-xs text-muted-foreground">No data yet.</li>}
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
            <p><Camera className="h-3.5 w-3.5 inline mr-1 text-accent" /> Tap "Submit report" to log a sighting with optional photo.</p>
            <p>Reports help confirm radar signatures and warn neighbors faster than NWS.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function relTime(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "just now";
  if (d < 3600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}
