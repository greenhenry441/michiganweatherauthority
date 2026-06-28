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

const SHARED_SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };

function sharedRank(a: SharedAlert): number {
  return SHARED_SEV_RANK[a.severity] ?? 2;
}

function sharedEventLabel(a: SharedAlert): string {
  if (a.custom_name) return a.custom_name;
  if (a.kind === "eas") return "EAS Alert";
  if (a.kind === "mwa-network") return "MWA Network Notification";
  // Fall back to capitalized type_id (e.g. "tornado-warning" -> "Tornado Warning")
  if (a.type_id) {
    return a.type_id
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return a.headline;
}

function sharedCounties(a: SharedAlert): string[] {
  const areas = a.areas.map((s) => s.toLowerCase());
  if (areas.some((s) => s === "statewide" || s.includes("statewide"))) {
    return [...MICHIGAN_COUNTIES];
  }
  const out: string[] = [];
  for (const c of MICHIGAN_COUNTIES) {
    const cl = c.toLowerCase();
    if (areas.some((a2) => a2.includes(cl))) out.push(c);
  }
  return out;
}

export function buildCountyAlertsFromShared(alerts: SharedAlert[]) {
  const out: Array<{ county: string; event: string; rank: number; partial: boolean }> = [];
  for (const a of alerts) {
    if (a.kind !== "weather") continue; // only color map for weather-style shared alerts
    const r = sharedRank(a);
    const ev = sharedEventLabel(a);
    for (const c of sharedCounties(a)) out.push({ county: c, event: ev, rank: r, partial: false });
  }
  return out;
}
