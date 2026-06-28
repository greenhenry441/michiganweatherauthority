import { useEffect, useState } from "react";

export type TempUnit = "F" | "C";
export type WindUnit = "mph" | "kph" | "knots";
export type PressureUnit = "inHg" | "mb";
export type Density = "comfortable" | "compact";
export type TickerSpeed = "slow" | "normal" | "fast" | "off";

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
};

const KEY = "mwa-prefs-v1";

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("mwa-prefs", { detail: p }));
  } catch {}
}

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [p, setP] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    setP(loadPrefs());
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
    const merged = { ...p, ...next };
    setP(merged);
    savePrefs(merged);
  };
  return [p, patch];
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
