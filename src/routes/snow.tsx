// Winter-weather dashboard. Pulls NWS gridpoint data for the selected city
// and projects snow accumulation, surface temps, and a rough school-closure
// likelihood score from snowfall + temp + wind. Pure derived view — no DB.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Snowflake, Thermometer, Wind } from "lucide-react";
import { MICHIGAN_CITIES, type MichiganCity } from "@/lib/michigan-cities";
import { getPoint } from "@/lib/weather-api";

export const Route = createFileRoute("/snow")({
  head: () => ({
    meta: [
      { title: "Snow & Ice Mode — Michigan Weather Authority" },
      { name: "description", content: "Snow accumulation forecast, road temperature, and school-closure likelihood for Michigan cities." },
      { property: "og:title", content: "Snow & Ice Mode — MWA" },
      { property: "og:description", content: "Live snow forecast, surface temp, and closure odds." },
    ],
  }),
  component: SnowPage,
});

async function fetchSnowGrid(city: MichiganCity) {
  const pt = await getPoint(city.lat, city.lon);
  const res = await fetch(pt.properties.forecastGridData, {
    headers: { "User-Agent": "MWA", Accept: "application/geo+json" },
  });
  if (!res.ok) throw new Error("grid " + res.status);
  return res.json();
}

type Series = { validTime: string; value: number | null };
function unwrap(p: any): Series[] {
  if (!p?.values) return [];
  return p.values.map((v: any) => ({ validTime: v.validTime, value: v.value }));
}
function next72h(series: Series[]): Series[] {
  const cutoff = Date.now() + 72 * 3600 * 1000;
  return series.filter((s) => new Date(s.validTime).getTime() <= cutoff);
}

function SnowPage() {
  const [city, setCity] = useState<MichiganCity>(MICHIGAN_CITIES[0]);
  const grid = useQuery({
    queryKey: ["snow-grid", city.zip],
    queryFn: () => fetchSnowGrid(city),
    staleTime: 5 * 60 * 1000,
  });

  const snow72 = next72h(unwrap(grid.data?.properties?.snowfallAmount)); // mm
  const totalMm = snow72.reduce((acc, s) => acc + (s.value ?? 0), 0);
  const totalIn = totalMm / 25.4;
  const temps = next72h(unwrap(grid.data?.properties?.temperature)); // °C
  const minC = temps.reduce<number>((acc, s) => Math.min(acc, s.value ?? acc), Infinity);
  const minF = isFinite(minC) ? minC * 9 / 5 + 32 : null;
  const winds = next72h(unwrap(grid.data?.properties?.windSpeed)); // km/h
  const maxKmh = winds.reduce<number>((acc, s) => Math.max(acc, s.value ?? acc), 0);
  const maxMph = maxKmh * 0.621371;

  // Naive but defensible closure score: 30% per inch of snow + cold/wind kickers, capped 0-100.
  let score = totalIn * 30;
  if (minF !== null && minF < 0) score += 25;
  if (minF !== null && minF < -10) score += 15;
  if (maxMph > 25) score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict =
    score >= 75 ? "Likely closure" :
    score >= 50 ? "Possible closure" :
    score >= 25 ? "Watch developing" : "Normal operations expected";

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6 space-y-5">
      <Link to="/" className="text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to MWA
      </Link>
      <header>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Winter Dashboard</p>
        <h1 className="font-display text-3xl tracking-tight flex items-center gap-2">
          <Snowflake className="h-7 w-7 text-accent" /> Snow & Ice Mode
        </h1>
        <p className="text-sm text-muted-foreground mt-1">72-hour snow projection, low temps, and school-closure likelihood — sourced from NWS gridpoint data.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {MICHIGAN_CITIES.slice(0, 12).map((c) => (
          <button
            key={c.zip}
            onClick={() => setCity(c)}
            className={"px-3 py-1.5 rounded-full text-xs font-mono " +
              (city.zip === c.zip ? "bg-accent text-accent-foreground" : "bg-secondary/60 hover:bg-secondary text-muted-foreground")}>
            {c.name}
          </button>
        ))}
      </div>

      {grid.isLoading && <p className="text-sm text-muted-foreground">Loading snow grid…</p>}
      {grid.isError && <p className="text-sm text-destructive">Couldn't load grid: {String(grid.error)}</p>}
      {grid.data && (
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat icon={<Snowflake className="h-4 w-4 text-sky-400" />} label="72-hr snowfall" value={`${totalIn.toFixed(1)}″`} sub={`${totalMm.toFixed(0)} mm`} />
          <Stat icon={<Thermometer className="h-4 w-4 text-rose-400" />} label="72-hr low" value={minF !== null ? `${minF.toFixed(0)}°F` : "—"} sub={isFinite(minC) ? `${minC.toFixed(1)}°C` : ""} />
          <Stat icon={<Wind className="h-4 w-4 text-slate-300" />} label="Peak wind" value={`${maxMph.toFixed(0)} mph`} sub={`${maxKmh.toFixed(0)} km/h`} />
        </div>
      )}

      <div className="rounded-2xl glass aurora-border p-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">School-closure score</p>
        <div className="flex items-end gap-3 mt-1">
          <span className="font-display text-5xl tracking-tight">{score}</span>
          <span className="text-sm text-muted-foreground mb-2">/ 100 — {verdict}</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${score}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Heuristic only — combines accumulation, low temperature, and wind. Always check your district's official channel.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground">
        {icon} {label}
      </div>
      <p className="font-display text-2xl mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
