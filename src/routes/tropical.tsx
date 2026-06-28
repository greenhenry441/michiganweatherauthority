import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wind, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/tropical")({
  head: () => ({
    meta: [
      { title: "Tropical Tracker — Michigan Weather Authority" },
      { name: "description", content: "Live NHC active tropical systems, Atlantic and Eastern Pacific basins." },
      { property: "og:title", content: "MWA Tropical Tracker" },
      { property: "og:description", content: "Active hurricanes, tropical storms, and disturbances." },
    ],
  }),
  component: TropicalPage,
});

interface NhcStorm {
  id: string;
  binNumber?: string;
  name: string;
  classification: string;
  intensity: string;
  pressure: string;
  latitudeNumeric: number;
  longitudeNumeric: number;
  movementDir?: number;
  movementSpeed?: number;
  lastUpdate: string;
  publicAdvisory?: { url?: string };
  forecastGraphics?: { url?: string };
}

async function fetchStorms(): Promise<NhcStorm[]> {
  const res = await fetch("https://www.nhc.noaa.gov/CurrentStorms.json", { cache: "no-store" });
  if (!res.ok) throw new Error("NHC feed unavailable");
  const data = await res.json();
  return (data.activeStorms ?? []) as NhcStorm[];
}

function TropicalPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["nhc-storms"],
    queryFn: fetchStorms,
    refetchInterval: 5 * 60_000,
  });

  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            <Wind className="h-4 w-4" /> nhc · live feed
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Tropical</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">Tropical Tracker.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Active named systems straight from the National Hurricane Center. Atlantic &amp; East Pacific basins, refreshed every 5 minutes.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent hover:underline">
              <RefreshCw className={"h-3 w-3 " + (isFetching ? "animate-spin" : "")} /> Refresh
            </button>
            <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent">
              nhc.noaa.gov <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="hairline mt-8" />
        </div>

        {isLoading && <p className="text-muted-foreground">Loading active systems…</p>}
        {error && <p className="text-severe">Could not load NHC feed. Try again later.</p>}
        {data && data.length === 0 && (
          <div className="glass aurora-border liquid rounded-2xl p-8 text-center">
            <p className="font-display text-2xl mb-2">All quiet.</p>
            <p className="text-muted-foreground">No active tropical systems right now.</p>
          </div>
        )}
        {data && data.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-4">
            {data.map((s) => (
              <li key={s.id} className="glass aurora-border liquid rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">{s.classification} · {s.binNumber ?? s.id}</p>
                    <h2 className="font-display text-3xl">{s.name}</h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded border border-amber-alert/60 text-amber-alert">
                    {s.intensity ?? "—"} kt
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <Stat label="Pressure" value={`${s.pressure ?? "—"} mb`} />
                  <Stat label="Movement" value={s.movementSpeed ? `${s.movementSpeed} kt` : "—"} />
                  <Stat label="Lat" value={s.latitudeNumeric?.toFixed(1) ?? "—"} />
                  <Stat label="Lon" value={s.longitudeNumeric?.toFixed(1) ?? "—"} />
                </dl>
                <p className="text-[11px] text-muted-foreground mt-3 font-mono">Updated {new Date(s.lastUpdate).toLocaleString()}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.publicAdvisory?.url && (
                    <a href={s.publicAdvisory.url} target="_blank" rel="noreferrer" className="text-[11px] font-mono uppercase tracking-wider text-accent hover:underline inline-flex items-center gap-1">
                      Advisory <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.forecastGraphics?.url && (
                    <a href={s.forecastGraphics.url} target="_blank" rel="noreferrer" className="text-[11px] font-mono uppercase tracking-wider text-accent hover:underline inline-flex items-center gap-1">
                      Cone graphic <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg">{value}</dd>
    </div>
  );
}
