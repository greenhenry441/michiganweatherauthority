// Browser-only geolocation helpers. The hook lazily requests permission on
// demand (never on mount — that triggers an unwanted permission prompt),
// then snaps the raw GPS fix to the closest Michigan ZIP entry so the rest
// of the app can keep treating "current location" as a MichiganCity.
import { useCallback, useState } from "react";
import { MICHIGAN_CITIES, type MichiganCity } from "@/lib/michigan-cities";

export type GeoFix = { lat: number; lon: number; accuracy: number; at: number };

function haversineMi(a: GeoFix, b: { lat: number; lon: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestMichiganCity(fix: { lat: number; lon: number }): { city: MichiganCity; miles: number } {
  let best = MICHIGAN_CITIES[0];
  let bestD = Infinity;
  for (const c of MICHIGAN_CITIES) {
    const d = haversineMi(fix as GeoFix, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { city: best, miles: bestD };
}

export function useGeolocation() {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback((): Promise<GeoFix> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        const msg = "Geolocation isn't supported on this device";
        setError(msg); reject(new Error(msg)); return;
      }
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const f: GeoFix = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            at: Date.now(),
          };
          setFix(f); setLoading(false); resolve(f);
        },
        (err) => {
          const msg = err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location unavailable right now."
              : "Couldn't get your location.";
          setError(msg); setLoading(false); reject(err);
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
      );
    });
  }, []);

  return { fix, loading, error, request };
}
