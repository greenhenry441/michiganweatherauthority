import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { colorForEvent, isLightColor } from "@/lib/nws-colors";

export interface CountyAlertInfo {
  county: string; // lowercase county name
  event: string;
  rank: number;
  partial?: boolean; // true if alert covers only part of the county
}

export interface AlertPolygon {
  event: string;
  rank: number;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: any };
  areaDesc?: string;
}

interface Props {
  alertsByCounty: CountyAlertInfo[];
  polygons?: AlertPolygon[];
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

export function MichiganAlertMap({ alertsByCounty, polygons = [], width = 520, height = 560 }: Props) {
  const [geo, setGeo] = useState<FC | null>(null);
  const [hover, setHover] = useState<{ name: string; event?: string; partial?: boolean; x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/geo/mi-counties.geojson")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setGeo(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Best alert per county (highest rank wins). Partial flag preserved when all matching alerts are partial.
  const countyMap = useMemo(() => {
    const m = new Map<string, CountyAlertInfo>();
    for (const a of alertsByCounty) {
      const k = a.county.toLowerCase();
      const prev = m.get(k);
      if (!prev || a.rank > prev.rank) {
        m.set(k, { ...a, partial: a.partial && (!prev || prev.partial !== false) });
      } else if (prev && !a.partial) {
        // any full-coverage alert overrides partial flag
        m.set(k, { ...prev, partial: false });
      }
    }
    return m;
  }, [alertsByCounty]);

  const projection = useMemo(() => {
    if (!geo) return null;
    return geoMercator().fitSize([width, height], geo as any);
  }, [geo, width, height]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // Sort polygons by rank ascending so highest-severity draws on top.
  const sortedPolys = useMemo(
    () => [...polygons].sort((a, b) => a.rank - b.rank),
    [polygons]
  );

  if (!geo || !path || !projection) {
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
        <span className="text-[10px] font-mono text-muted-foreground">
          {countyMap.size}/83 counties · {polygons.length} polygon{polygons.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Michigan counties alert map">
          <defs>
            <pattern id="partial-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="currentColor" fillOpacity="0.35" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#000" strokeWidth="1.5" strokeOpacity="0.4" />
            </pattern>
          </defs>
          {/* Base layer: counties */}
          {geo.features.map((f) => {
            const name = f.properties.name;
            const info = countyMap.get(name.toLowerCase());
            const baseFill = info ? colorForEvent(info.event) : "hsl(var(--storm))";
            const fill = info?.partial ? "hsl(var(--storm))" : baseFill;
            return (
              <path
                key={f.id}
                d={path(f as any) || ""}
                fill={fill}
                stroke={info ? "#000" : "hsl(var(--border))"}
                strokeWidth={info ? 0.6 : 0.4}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement!).getBoundingClientRect();
                  setHover({ name, event: info?.event, partial: info?.partial, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            );
          })}
          {/* Partial overlay hatch: stripe partial counties using their alert color */}
          {geo.features.map((f) => {
            const info = countyMap.get(f.properties.name.toLowerCase());
            if (!info?.partial) return null;
            const c = colorForEvent(info.event);
            return (
              <path
                key={`p-${f.id}`}
                d={path(f as any) || ""}
                style={{ color: c }}
                fill="url(#partial-hatch)"
                stroke="none"
                pointerEvents="none"
              />
            );
          })}
          {/* Alert polygons (precise NWS-issued geometry) */}
          {sortedPolys.map((p, i) => {
            const feature = { type: "Feature", geometry: p.geometry, properties: {} } as any;
            const d = path(feature);
            if (!d) return null;
            const c = colorForEvent(p.event);
            return (
              <path
                key={`poly-${i}`}
                d={d}
                fill={c}
                fillOpacity={0.55}
                stroke="#000"
                strokeWidth={0.9}
                pointerEvents="none"
              />
            );
          })}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-border bg-popover px-2 py-1 text-[11px] shadow-lg"
            style={{ left: Math.min(hover.x + 10, width - 180), top: Math.max(hover.y - 30, 0) }}
          >
            <div className="font-semibold">{hover.name} County</div>
            <div className="text-muted-foreground">
              {hover.event ? `${hover.event}${hover.partial ? " · partial" : ""}` : "No active alert"}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#FF0000" }} /> Full county
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-sm border border-black/40"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,#FF0000 0 2px,transparent 2px 4px)" }}
          />
          Partial county
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-black/60" style={{ background: "rgba(255,0,0,0.55)" }} /> NWS polygon
        </span>
      </div>
    </div>
  );
}
