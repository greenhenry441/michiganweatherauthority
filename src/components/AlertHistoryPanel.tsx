import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Filter } from "lucide-react";
import { colorForEvent, isLightColor } from "@/lib/nws-colors";

interface HistoryAlert {
  id: string;
  event: string;
  headline: string;
  areaDesc: string;
  sent: string;
  expires: string;
  severity: string;
}

async function fetchAlertHistory(): Promise<HistoryAlert[]> {
  // Last 30d of MI alerts (NWS API returns recent active + recently expired by default with limit)
  const r = await fetch("https://api.weather.gov/alerts?area=MI&limit=500", {
    headers: { Accept: "application/geo+json" },
  });
  if (!r.ok) throw new Error(`history ${r.status}`);
  const j = await r.json();
  return (j.features ?? []).map((f: any) => ({
    id: f.properties.id,
    event: f.properties.event,
    headline: f.properties.headline ?? "",
    areaDesc: f.properties.areaDesc ?? "",
    sent: f.properties.sent,
    expires: f.properties.expires,
    severity: f.properties.severity ?? "",
  }));
}

const FILTERS = ["All", "Warning", "Watch", "Advisory", "Statement"] as const;

export function AlertHistoryPanel() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const q = useQuery({ queryKey: ["alert-history-mi"], queryFn: fetchAlertHistory, staleTime: 5 * 60 * 1000 });

  const items = useMemo(() => {
    const list = q.data ?? [];
    if (filter === "All") return list;
    return list.filter((a) => a.event.toLowerCase().includes(filter.toLowerCase()));
  }, [q.data, filter]);

  return (
    <div className="rounded-2xl glass aurora-border p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" /> Alert History
          </h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            {q.isLoading ? "Loading…" : `${items.length} of ${q.data?.length ?? 0} recent Michigan alerts`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-storm/60 p-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded-full transition-colors " +
                (filter === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[460px] overflow-y-auto pr-1">
        <ol className="relative border-l border-border/60 ml-2 space-y-2">
          {items.slice(0, 100).map((a) => {
            const bg = colorForEvent(a.event);
            const fg = isLightColor(bg) ? "#000" : "#fff";
            return (
              <li key={a.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ background: bg }} />
                <div className="rounded-lg border border-border/60 bg-storm/60 p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider" style={{ background: bg, color: fg }}>
                      {a.event}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(a.sent).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2">{a.headline}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 line-clamp-1">{a.areaDesc}</p>
                </div>
              </li>
            );
          })}
        </ol>
        {!q.isLoading && items.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-10">No alerts match this filter.</p>
        )}
      </div>
    </div>
  );
}
