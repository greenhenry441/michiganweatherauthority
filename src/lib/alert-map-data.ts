import type { NWSAlert } from "@/lib/weather-api";
import type { SharedAlert } from "@/lib/alerts-store";
import { MICHIGAN_COUNTIES } from "@/lib/michigan-counties";

const SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };

const PARTIAL_KEYWORDS =
  /(portion|portions of|part of|northern|southern|eastern|western|northeast|northwest|southeast|southwest|north central|south central|central)/;

function rank(a: NWSAlert): number {
  const s = (a.properties.severity ?? "").toLowerCase();
  return SEV_RANK[s] ?? (a.properties.event.toLowerCase().includes("warning") ? 3 : 2);
}

function countiesFor(a: NWSAlert): Array<{ county: string; partial: boolean }> {
  const raw = a.properties.areaDesc ?? "";
  const text = raw.toLowerCase();
  const segments = raw.split(/;|,/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const found = new Map<string, boolean>();
  for (const c of MICHIGAN_COUNTIES) {
    const cl = c.toLowerCase();
    let matched = false;
    let partial = false;
    for (const seg of segments) {
      if (seg.includes(cl)) {
        matched = true;
        if (PARTIAL_KEYWORDS.test(seg)) partial = true;
      }
    }
    if (!matched && text.includes(cl)) {
      matched = true;
      const idx = text.indexOf(cl);
      const window = text.slice(Math.max(0, idx - 40), idx);
      if (PARTIAL_KEYWORDS.test(window)) partial = true;
    }
    if (matched) {
      const prev = found.get(c);
      found.set(c, prev === false ? false : partial);
    }
  }
  return Array.from(found.entries()).map(([county, partial]) => ({ county, partial }));
}

export function buildCountyAlertsFromNWS(alerts: NWSAlert[]) {
  const out: Array<{ county: string; event: string; rank: number; partial: boolean }> = [];
  for (const a of alerts) {
    const r = rank(a);
    const ev = a.properties.event;
    for (const c of countiesFor(a)) out.push({ county: c.county, event: ev, rank: r, partial: c.partial });
  }
  return out;
}

export function buildPolygonsFromNWS(alerts: NWSAlert[]) {
  const out: Array<{ event: string; rank: number; geometry: any; areaDesc?: string }> = [];
  for (const a of alerts) {
    const g = a.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    out.push({ event: a.properties.event, rank: rank(a), geometry: g, areaDesc: a.properties.areaDesc });
  }
  return out;
}
