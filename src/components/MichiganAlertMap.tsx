import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { colorForEvent, isLightColor } from "@/lib/nws-colors";

interface CountyAlertInfo {
  county: string; // lowercase
  event: string;
  rank: number;
}

interface Props {
  alertsByCounty: CountyAlertInfo[]; // multiple per county allowed; highest rank wins
  width?: number;
  height?: number;
}

interface FC {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: { name: string };
    geometry: any;
  }>;
}

export function MichiganAlertMap({ alertsByCounty, width = 520, height = 560 }: Props) {
  const [geo, setGeo] = useState<FC | null>(null);
  const [hover, setHover] = useState<{ name: string; event?: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/mi-counties.geojson")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setGeo(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Build best alert per county
  const countyMap = useMemo(() => {
    const m = new Map<string, CountyAlertInfo>();
    for (const a of alertsByCounty) {
      const k = a.county.toLowerCase();
      const prev = m.get(k);
      if (!prev || a.rank > prev.rank) m.set(k, a);
    }
    return m;
  }, [alertsByCounty]);

  const { path, features } = useMemo(() => {
    if (!geo) return { path: null as any, features: [] };
    const projection = geoMercator().fitSize([width, height], geo as any);
    const path = geoPath(projection);
    return { path, features: geo.features };
  }, [geo, width, height]);

  if (!geo || !path) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 grid place-items-center" style={{ minHeight: height }}>
        <p className="text-xs font-mono text-muted-foreground">Loading Michigan counties…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">
          Michigan Counties · Active Alerts
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground">{countyMap.size}/83 counties</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Michigan counties alert map">
          {features.map((f) => {
            const name = f.properties.name;
            const info = countyMap.get(name.toLowerCase());
            const fill = info ? colorForEvent(info.event) : "hsl(var(--storm))";
            const stroke = info ? "#000" : "hsl(var(--border))";
            return (
              <path
                key={f.id}
                d={path(f as any) || ""}
                fill={fill}
                stroke={stroke}
                strokeWidth={info ? 0.6 : 0.4}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement!).getBoundingClientRect();
                  setHover({ name, event: info?.event, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              />
            );
          })}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-border bg-popover px-2 py-1 text-[11px] shadow-lg"
            style={{ left: Math.min(hover.x + 10, width - 160), top: Math.max(hover.y - 30, 0) }}
          >
            <div className="font-semibold">{hover.name} County</div>
            <div className="text-muted-foreground">{hover.event ?? "No active alert"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
