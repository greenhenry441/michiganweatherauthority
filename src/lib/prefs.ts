import { useEffect, useState } from "react";

export type TempUnit = "F" | "C";
export type WindUnit = "mph" | "kph" | "knots";
export type PressureUnit = "inHg" | "mb";
export type Density = "comfortable" | "compact";
export type TickerSpeed = "slow" | "normal" | "fast" | "off";
export type GlassIntensity = "low" | "med" | "high";
export type AlertTone = "chime" | "siren" | "blip" | "duck" | "off";

export interface QuietHours {
  enabled: boolean;
  start: string; // "22:00"
  end: string;   // "07:00"
  allowExtreme: boolean;
}

export interface Prefs {
  tempUnit: TempUnit;
  windUnit: WindUnit;
  pressureUnit: PressureUnit;
  density: Density;
  reduceMotion: boolean;
  tickerSpeed: TickerSpeed;
  show24Hour: boolean;
  showRadarOnHome: boolean;
  showMeteogramOnHome: boolean;
  showAlertHistoryOnHome: boolean;
  defaultCityZip: string;
  autoRefreshMin: number; // minutes; 0 = off
  glassIntensity: GlassIntensity;
  toneWarning: AlertTone;
  toneEAS: AlertTone;
  toneTest: AlertTone;
  hapticsOn: boolean;
  quiet: QuietHours;
  dataRefreshSec: number; // 0 = default, otherwise overrides
  compactNav: boolean;
  showStormReportsBanner: boolean;
  experimentalFeatures: boolean;
}

export const DEFAULT_PREFS: Prefs = {
  tempUnit: "F",
  windUnit: "mph",
  pressureUnit: "inHg",
  density: "comfortable",
  reduceMotion: false,
  tickerSpeed: "normal",
  show24Hour: false,
  showRadarOnHome: true,
  showMeteogramOnHome: true,
  showAlertHistoryOnHome: true,
  defaultCityZip: "",
  autoRefreshMin: 5,
  glassIntensity: "med",
  toneWarning: "siren",
  toneEAS: "chime",
  toneTest: "blip",
  hapticsOn: true,
  quiet: { enabled: false, start: "22:00", end: "07:00", allowExtreme: true },
  dataRefreshSec: 0,
  compactNav: false,
  showStormReportsBanner: true,
  experimentalFeatures: false,
};

const KEY = "mwa-prefs-v1";

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed, quiet: { ...DEFAULT_PREFS.quiet, ...(parsed.quiet ?? {}) } };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyVisualPrefs(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const blur = p.glassIntensity === "low" ? "8px" : p.glassIntensity === "high" ? "24px" : "16px";
  const sat = p.glassIntensity === "low" ? "120%" : p.glassIntensity === "high" ? "180%" : "150%";
  root.style.setProperty("--glass-blur", blur);
  root.style.setProperty("--glass-sat", sat);
  if (p.reduceMotion) root.dataset.reduceMotion = "1"; else delete root.dataset.reduceMotion;
  if (p.compactNav) root.dataset.compactNav = "1"; else delete root.dataset.compactNav;
}

export function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    applyVisualPrefs(p);
    window.dispatchEvent(new CustomEvent("mwa-prefs", { detail: p }));
  } catch {}
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    const loaded = loadPrefs();
    setP(loaded);
    applyVisualPrefs(loaded);
    const onChange = (e: Event) => setP((e as CustomEvent<Prefs>).detail);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setP(loadPrefs()); };
    window.addEventListener("mwa-prefs", onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("mwa-prefs", onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const patch = (next: Partial<Prefs>) => {
    const merged = { ...p, ...next, quiet: { ...p.quiet, ...(next.quiet ?? {}) } };
    setP(merged);
    savePrefs(merged);
  };
  return [p, patch];
}

// ---- helpers ----
export function isQuietNow(q: QuietHours, now = new Date()): boolean {
  if (!q.enabled) return false;
  const [sh, sm] = q.start.split(":").map(Number);
  const [eh, em] = q.end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  return start < end ? (cur >= start && cur < end) : (cur >= start || cur < end);
}

export function playTone(tone: AlertTone) {
  if (tone === "off" || typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    if (tone === "chime") {
      o.type = "sine"; o.frequency.setValueAtTime(880, now);
      o.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      o.stop(now + 0.65);
    } else if (tone === "siren") {
      o.type = "sawtooth"; o.frequency.setValueAtTime(520, now);
      o.frequency.linearRampToValueAtTime(880, now + 0.35);
      o.frequency.linearRampToValueAtTime(520, now + 0.7);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      o.stop(now + 0.78);
    } else if (tone === "duck") {
      o.type = "square"; o.frequency.setValueAtTime(220, now);
      o.frequency.linearRampToValueAtTime(140, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      o.stop(now + 0.35);
    } else {
      o.type = "sine"; o.frequency.value = 880;
      g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
      o.stop(now + 0.34);
    }
    o.start(now);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

// ---- conversions ----
export const fToC = (f: number) => (f - 32) * (5 / 9);
export const mphToKph = (m: number) => m * 1.609344;
export const mphToKnots = (m: number) => m * 0.868976;
export const inHgToMb = (i: number) => i * 33.8639;

export function formatTemp(f: number | null | undefined, unit: TempUnit) {
  if (f == null || !isFinite(f)) return "—";
  return unit === "F" ? `${Math.round(f)}°F` : `${Math.round(fToC(f))}°C`;
}
export function formatWind(mph: number | null | undefined, unit: WindUnit) {
  if (mph == null || !isFinite(mph)) return "—";
  if (unit === "mph") return `${Math.round(mph)} mph`;
  if (unit === "kph") return `${Math.round(mphToKph(mph))} kph`;
  return `${Math.round(mphToKnots(mph))} kt`;
}
export function formatPressure(inHg: number | null | undefined, unit: PressureUnit) {
  if (inHg == null || !isFinite(inHg)) return "—";
  return unit === "inHg" ? `${inHg.toFixed(2)} inHg` : `${Math.round(inHgToMb(inHg))} mb`;
}
