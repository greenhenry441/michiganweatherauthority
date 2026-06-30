import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Maximize2, Pause, Play, Radar, Zap, AlertTriangle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/chase")({
  head: () => ({
    meta: [
      { title: "Storm Chase Mode — MWA" },
      { name: "description", content: "Full-screen storm chase dashboard with radar, lightning, and live alerts for Michigan." },
      { property: "og:title", content: "MWA Storm Chase Mode" },
      { property: "og:description", content: "Auto-refreshing radar, lightning, and warnings dashboard for storm chasers." },
    ],
  }),
  component: ChasePage,
});

function ChasePage() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(30);
  const radarRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (paused) return;
    setCount(30);
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { setTick((t) => t + 1); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paused, tick]);

  const goFull = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
    else if (document.fullscreenElement) document.exitFullscreen();
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-background/80 backdrop-blur">
        <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Exit chase
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            <RefreshCw className={`h-3 w-3 mr-1 ${paused ? "" : "animate-spin"}`} /> {paused ? "PAUSED" : `${count}s`}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTick((t) => t + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={goFull}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-2 p-2">
        <section className="rounded-lg overflow-hidden border border-border bg-card aspect-video lg:aspect-auto lg:h-[calc(100vh-90px)]">
          <iframe
            key={tick}
            ref={radarRef}
            src="https://embed.windy.com/embed2.html?lat=44.3&lon=-85.6&detailLat=44.3&detailLon=-85.6&width=650&height=450&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1"
            className="h-full w-full"
            title="Live radar"
          />
        </section>

        <aside className="space-y-2">
          <div className="rounded-lg border border-border bg-card p-3">
            <h2 className="font-display tracking-wider uppercase text-xs text-accent flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Lightning · last 10 min
            </h2>
            <iframe
              key={`l-${tick}`}
              src="https://map.blitzortung.org/#7.2/44.3/-85.6"
              className="w-full h-56 mt-2 rounded"
              title="Lightning"
            />
          </div>
          <ActiveAlerts tick={tick} />
          <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-accent" /> Storm chase mode auto-refreshes every 30s.</p>
            <p className="mt-1">Tap pause for screenshots. Hit fullscreen for dashboard view.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActiveAlerts({ tick }: { tick: number }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
    fetch("https://api.weather.gov/alerts/active?area=MI", { headers: { Accept: "application/geo+json" } })
      .then((r) => r.json())
      .then((j) => setAlerts((j.features || []).slice(0, 12)))
      .catch(() => setAlerts([]));
  }, [tick]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h2 className="font-display tracking-wider uppercase text-xs text-accent flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" /> Active MI alerts
      </h2>
      <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto">
        {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts.</p>}
        {alerts.map((f) => {
          const p = f.properties;
          const sev = (p.severity || "").toLowerCase();
          const color =
            sev === "extreme" ? "text-red-400 border-red-500/40" :
            sev === "severe" ? "text-orange-300 border-orange-500/40" :
            sev === "moderate" ? "text-yellow-300 border-yellow-500/40" :
            "text-muted-foreground border-border";
          return (
            <div key={p.id} className={`text-xs rounded border px-2 py-1.5 ${color}`}>
              <div className="font-medium">{p.event}</div>
              <div className="text-[10px] opacity-80 truncate">{p.areaDesc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
