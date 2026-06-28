import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ThermometerSun, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/climate")({
  head: () => ({
    meta: [
      { title: "Climate & Records — Michigan Weather Authority" },
      { name: "description", content: "Monthly climate normals and recent records for Michigan cities." },
      { property: "og:title", content: "MWA Climate & Records" },
      { property: "og:description", content: "30-year normals and live climate data for Michigan cities." },
    ],
  }),
  component: ClimatePage,
});

interface City { name: string; lat: number; lon: number; office: string; nceiId: string; }
const CITIES: City[] = [
  { name: "Detroit",      lat: 42.331, lon: -83.046, office: "DTX", nceiId: "USW00094847" },
  { name: "Grand Rapids", lat: 42.963, lon: -85.668, office: "GRR", nceiId: "USW00094860" },
  { name: "Lansing",      lat: 42.733, lon: -84.555, office: "GRR", nceiId: "USW00014836" },
  { name: "Flint",        lat: 43.013, lon: -83.687, office: "DTX", nceiId: "USW00014826" },
  { name: "Traverse City",lat: 44.763, lon: -85.620, office: "APX", nceiId: "USW00014850" },
  { name: "Marquette",    lat: 46.532, lon: -87.395, office: "MQT", nceiId: "USW00094851" },
  { name: "Sault Ste. Marie", lat: 46.500, lon: -84.348, office: "MQT", nceiId: "USW00014847" },
  { name: "Houghton",     lat: 47.169, lon: -88.510, office: "MQT", nceiId: "USW00094814" },
];

async function fetchClimate(city: City) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${new Date(Date.now() - 366 * 86400_000).toISOString().slice(0, 10)}` +
    `&end_date=${new Date(Date.now() - 86400_000).toISOString().slice(0, 10)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FDetroit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Climate API unavailable");
  return res.json();
}

function ClimatePage() {
  const [city, setCity] = useState<City>(CITIES[0]);
  const { data, isLoading } = useQuery({ queryKey: ["climate", city.name], queryFn: () => fetchClimate(city) });

  const stats = data?.daily ? computeStats(data.daily) : null;

  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            <ThermometerSun className="h-4 w-4" /> mwa · climate
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Climate</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">Climate &amp; Records.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            12-month rolling stats and high/low extremes for major Michigan cities. Powered by Open-Meteo's reanalysis archive.
          </p>
          <div className="hairline mt-8" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => setCity(c)}
              className={
                "text-xs font-mono px-3 py-1.5 rounded-md border transition-colors " +
                (c.name === city.name
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border/60 hover:border-accent/60")
              }
            >
              {c.name}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-muted-foreground">Loading climate data…</p>}
        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Hottest" value={`${stats.maxHigh.toFixed(0)}°F`} sub={stats.maxHighDate} />
            <StatCard label="Coldest" value={`${stats.minLow.toFixed(0)}°F`} sub={stats.minLowDate} />
            <StatCard label="Avg high (12mo)" value={`${stats.avgHigh.toFixed(1)}°F`} />
            <StatCard label="Avg low (12mo)" value={`${stats.avgLow.toFixed(1)}°F`} />
            <StatCard label="Wettest day" value={`${stats.maxPrecip.toFixed(2)}″`} sub={stats.maxPrecipDate} />
            <StatCard label="Total precip" value={`${stats.totalPrecip.toFixed(1)}″`} />
            <StatCard label="Snowiest day" value={`${stats.maxSnow.toFixed(1)}″`} sub={stats.maxSnowDate} />
            <StatCard label="Total snow" value={`${stats.totalSnow.toFixed(1)}″`} />
          </div>
        )}

        <div className="glass aurora-border liquid rounded-2xl p-5">
          <h3 className="font-display text-xl mb-3">Official NWS climate pages</h3>
          <div className="flex flex-wrap gap-2">
            <a href={`https://www.weather.gov/${city.office.toLowerCase()}/climate`} target="_blank" rel="noreferrer" className="text-xs font-mono uppercase tracking-wider text-accent hover:underline inline-flex items-center gap-1">
              {city.office} office climate <ExternalLink className="h-3 w-3" />
            </a>
            <a href={`https://www.ncei.noaa.gov/access/past-weather/${city.name.replace(/ /g, "%20")}`} target="_blank" rel="noreferrer" className="text-xs font-mono uppercase tracking-wider text-accent hover:underline inline-flex items-center gap-1">
              NCEI past weather <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass aurora-border liquid rounded-2xl p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-3xl mt-1">{value}</p>
      {sub && <p className="text-[11px] font-mono text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function computeStats(daily: any) {
  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum, snowfall_sum } = daily;
  let maxHigh = -Infinity, minLow = Infinity, maxPrecip = 0, maxSnow = 0;
  let maxHighIdx = 0, minLowIdx = 0, maxPrecipIdx = 0, maxSnowIdx = 0;
  let sumHigh = 0, sumLow = 0, totalPrecip = 0, totalSnow = 0, hiN = 0, loN = 0;
  for (let i = 0; i < time.length; i++) {
    const h = temperature_2m_max[i]; const l = temperature_2m_min[i];
    const p = precipitation_sum[i] ?? 0; const s = snowfall_sum[i] ?? 0;
    if (h != null) { if (h > maxHigh) { maxHigh = h; maxHighIdx = i; } sumHigh += h; hiN++; }
    if (l != null) { if (l < minLow) { minLow = l; minLowIdx = i; } sumLow += l; loN++; }
    if (p > maxPrecip) { maxPrecip = p; maxPrecipIdx = i; }
    if (s > maxSnow) { maxSnow = s; maxSnowIdx = i; }
    totalPrecip += p; totalSnow += s;
  }
  return {
    maxHigh, maxHighDate: time[maxHighIdx],
    minLow, minLowDate: time[minLowIdx],
    maxPrecip, maxPrecipDate: time[maxPrecipIdx],
    maxSnow, maxSnowDate: time[maxSnowIdx],
    avgHigh: sumHigh / Math.max(1, hiN), avgLow: sumLow / Math.max(1, loN),
    totalPrecip, totalSnow,
  };
}
