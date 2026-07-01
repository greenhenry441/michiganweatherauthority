// Admin-only dispatcher health page. Shows recent self-test runs and a
// "run now" button that hits the public self-test route in-band.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dispatcher-health")({
  head: () => ({ meta: [{ title: "Dispatcher health — MWA admin" }] }),
  component: DispatcherHealth,
});

function DispatcherHealth() {
  const [running, setRunning] = useState(false);
  const runs = useQuery({
    queryKey: ["dispatcher-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatcher_test_runs")
        .select("id, ran_at, source, ok, total, passed, failed, duration_ms, details, error")
        .order("ran_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const runNow = async () => {
    setRunning(true);
    try {
      await fetch("/api/public/cron/dispatcher-self-test", { method: "POST" });
      await runs.refetch();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent" /> Dispatcher health
          </h1>
          <p className="text-sm text-muted-foreground">Automated targeting tests verify EAS &amp; weather pushes only reach the right users.</p>
        </div>
        <Button onClick={runNow} disabled={running} size="sm">
          <RefreshCw className={"h-4 w-4 mr-1 " + (running ? "animate-spin" : "")} /> Run now
        </Button>
      </header>

      {runs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {runs.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">No runs yet. Hit "Run now" or wait for the nightly cron.</p>
      )}

      <ul className="space-y-2">
        {(runs.data ?? []).map((r: any) => (
          <li key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {r.ok
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <XCircle className="h-5 w-5 text-destructive" />}
                <span className="font-mono text-xs">{new Date(r.ran_at).toLocaleString()}</span>
                <span className="text-[10px] uppercase font-mono text-muted-foreground">{r.source}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {r.passed}/{r.total} passed · {r.duration_ms}ms
              </div>
            </div>
            {!r.ok && (
              <div className="mt-2 text-[11px] font-mono text-destructive space-y-0.5">
                {(r.details ?? []).filter((d: any) => !d.ok).map((d: any, i: number) => (
                  <div key={i}>✗ {d.name}{d.detail ? ` — ${d.detail}` : ""}</div>
                ))}
                {r.error && <div>error: {r.error}</div>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
