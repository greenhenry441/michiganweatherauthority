import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, MapPin, Radio, RefreshCw, Search, Wind, Droplets,
  Thermometer, Sunrise, Eye, Gauge, Megaphone, ListOrdered,
  Sun, Activity, UserCircle2, FileText, LogIn, Sunset, Cloud, Bell, BellOff,
} from "lucide-react";
import { MICHIGAN_CITIES, type MichiganCity } from "@/lib/michigan-cities";
import {
  getCityWeather, getMichiganAlerts, getExtraStats,
  aqiCategory, uvCategory, type NWSAlert, type ExtraStats,
} from "@/lib/weather-api";
import { useSharedAlerts, type SharedAlert } from "@/lib/alerts-store";
import { getAlertType } from "@/lib/nws-alert-types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Michigan Weather Authority — Live Forecasts & Alerts" },
      { name: "description", content: "Live weather, forecasts, alerts, air quality, and UV for every city in Michigan from the Michigan Weather Authority (MWA)." },
      { property: "og:title", content: "Michigan Weather Authority" },
      { property: "og:description", content: "Live weather, forecasts, alerts, air quality, and UV for every city in Michigan." },
    ],
  }),
  component: HomePage,
});

type AlertEntry =
  | { kind: "shared"; alert: SharedAlert }
  | { kind: "nws"; alert: NWSAlert };

function severityFromEvent(event: string) {
  const e = event.toLowerCase();
  if (e.includes("tornado") || e.includes("flash flood") || e.includes("blizzard")) return "bg-severe text-white";
  if (e.includes("warning")) return "bg-warning text-white";
  if (e.includes("watch")) return "bg-watch text-black";
  if (e.includes("advisory")) return "bg-advisory text-black";
  return "bg-statement text-white";
}

function severityFromShared(a: SharedAlert) {
  if (a.severity === "extreme") return "bg-severe text-white";
  if (a.category === "warning") return "bg-warning text-white";
  if (a.category === "watch") return "bg-watch text-black";
  if (a.category === "advisory") return "bg-advisory text-black";
  return "bg-statement text-white";
}

function alertTitle(entry: AlertEntry): string {
  if (entry.kind === "shared") {
    const t = entry.alert.type_id ? getAlertType(entry.alert.type_id) : undefined;
    return t?.name ?? entry.alert.custom_name ?? "Weather Alert";
  }
  return entry.alert.properties.event;
}

const SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };
function entrySevRank(e: AlertEntry): number {
  if (e.kind === "shared") return SEV_RANK[e.alert.severity] ?? 0;
  const s = (e.alert.properties.severity ?? "").toLowerCase();
  return SEV_RANK[s] ?? (e.alert.properties.event.toLowerCase().includes("warning") ? 3 : 2);
}

function useClock() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

function useAuthUser() {
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

const LS_CITY = "mwa.home.city";

function HomePage() {
  const user = useAuthUser();

  // Hydrate from localStorage on mount; profile load (below) overrides.
  const [city, setCity] = useState<MichiganCity>(MICHIGAN_CITIES[0]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(LS_CITY);
      if (raw) {
        const saved = JSON.parse(raw) as MichiganCity;
        if (saved?.zip) setCity(saved);
      }
    } catch {}
  }, []);

  // Load signed-in user's home location
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("home_zip, home_city, home_lat, home_lon").eq("id", user.id).maybeSingle();
      if (cancelled || !data?.home_zip) return;
      const match = MICHIGAN_CITIES.find((c) => c.zip === data.home_zip);
      if (match) setCity(match);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Persist on city change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LS_CITY, JSON.stringify(city)); } catch {}
  }, [city]);

  const weather = useQuery({
    queryKey: ["weather", city.lat, city.lon],
    queryFn: () => getCityWeather(city.lat, city.lon),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const extra = useQuery({
    queryKey: ["extra", city.lat, city.lon],
    queryFn: () => getExtraStats(city.lat, city.lon),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const nwsAlerts = useQuery({
    queryKey: ["mi-alerts"],
    queryFn: getMichiganAlerts,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  const clock = useClock();
  const { alerts: shared } = useSharedAlerts();

  const allAlerts: AlertEntry[] = useMemo(
    () => [
      ...shared.map((a) => ({ kind: "shared" as const, alert: a })),
      ...(nwsAlerts.data ?? []).map((a) => ({ kind: "nws" as const, alert: a })),
    ].sort((a, b) => entrySevRank(b) - entrySevRank(a)),
    [shared, nwsAlerts.data],
  );

  useAlertNotifications(allAlerts);

  const cityAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (a.kind === "shared") {
        return a.alert.areas.some(
          (x) =>
            x.toLowerCase() === "statewide" ||
            x.toLowerCase().includes(city.name.toLowerCase()) ||
            x.toLowerCase().includes(city.county.toLowerCase()),
        );
      }
      const desc = a.alert.properties.areaDesc.toLowerCase();
      return desc.includes(city.county.toLowerCase()) || desc.includes(city.name.toLowerCase());
    });
  }, [allAlerts, city]);

  const current = weather.data?.hourly.properties.periods[0];
  const today = weather.data?.forecast.properties.periods[0];

  return (
    <div className="min-h-screen">
      <TickerBar entries={allAlerts} />

      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-md bg-card/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-8 w-8 rounded-full bg-accent/10 border border-accent/40 grid place-items-center overflow-hidden shrink-0">
              <Radio className="h-4 w-4 text-accent" />
              <div className="absolute inset-0 radar-sweep pointer-events-none" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm md:text-base font-bold tracking-wider leading-none truncate">
                MICHIGAN WEATHER AUTHORITY
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.3em] uppercase">
                MWA • Live Ops Center
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/forecasts" className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-accent">
              <FileText className="h-3.5 w-3.5" /> Forecasts
            </Link>
            <NotifyToggle />
            {user ? (
              <Link to="/settings" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-accent hover:opacity-80">
                <UserCircle2 className="h-4 w-4" /> Account
              </Link>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-accent hover:opacity-80">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground font-mono shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-accent alert-pulse" />
              <span suppressHydrationWarning>{clock || "--:--"} ET</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero alert banner for current city */}
      {cityAlerts.length > 0 && (
        <section className="border-b border-severe/40 bg-severe/5">
          <div className="max-w-7xl mx-auto px-4 py-2 space-y-1.5">
            {cityAlerts.slice(0, 2).map((a, i) => (
              <AlertCard key={i} entry={a} />
            ))}
            {cityAlerts.length > 2 && (
              <AllAlertsDialog entries={cityAlerts} label={`+${cityAlerts.length - 2} more for ${city.name}`} />
            )}
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Top control row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">Now reporting</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-glow truncate">{city.name}, MI</h2>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              ZIP {city.zip} • {city.county} County • {MICHIGAN_CITIES.length.toLocaleString()} MI ZIPs indexed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CitySearch city={city} onPick={setCity} />
            <Button variant="ghost" size="sm" onClick={() => { weather.refetch(); extra.refetch(); nwsAlerts.refetch(); }} disabled={weather.isFetching} className="text-muted-foreground h-9">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", weather.isFetching && "animate-spin")} />
              <span className="text-xs">{weather.isFetching ? "Updating" : "Refresh"}</span>
            </Button>
          </div>
        </div>

        {weather.isLoading && <LoadingPanel />}
        {weather.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Unable to reach NWS data feed. Try refreshing in a moment.
          </div>
        )}

        {current && today && weather.data && (
          <>
            {/* Current + extras grid */}
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative p-4 md:p-5 grid grid-cols-[auto_1fr] gap-4 items-center">
                  <img
                    src={current.icon.replace("size=medium", "size=large")}
                    alt={current.shortForecast}
                    className="h-24 w-24 md:h-28 md:w-28 rounded-lg border border-border/60 bg-storm shadow-glow shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-6xl md:text-7xl font-bold text-glow leading-none">
                        {Math.round(current.temperature)}°
                      </span>
                      <span className="text-base text-muted-foreground">{current.temperatureUnit}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold truncate">{current.shortForecast}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{today.detailedForecast}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pb-4 text-xs">
                  <Metric icon={Wind} label="Wind" value={`${current.windDirection} ${current.windSpeed}`} />
                  <Metric icon={Droplets} label="Humidity" value={current.relativeHumidity?.value != null ? `${Math.round(current.relativeHumidity.value)}%` : "—"} />
                  <Metric icon={Thermometer} label="Dew Point" value={current.dewpoint?.value != null ? `${Math.round((current.dewpoint.value * 9) / 5 + 32)}°F` : "—"} />
                  <Metric icon={Gauge} label="Precip" value={current.probabilityOfPrecipitation?.value != null ? `${current.probabilityOfPrecipitation.value}%` : "0%"} />
                </div>
              </div>

              <ExtraStatsPanel data={extra.data} loading={extra.isLoading} />
            </div>


            {/* Hourly + Extended */}
            <div className="grid xl:grid-cols-[1fr_320px] gap-4">
              <div className="rounded-xl border border-border bg-card p-3 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">
                    Next 12 Hours
                  </h3>
                  <Sunrise className="h-3.5 w-3.5 text-amber-alert" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {weather.data.hourly.properties.periods.slice(0, 12).map((p) => (
                    <div key={p.number} className="flex-none w-[64px] text-center rounded-md bg-storm/50 border border-border/40 py-1.5 px-1">
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {new Date(p.startTime).toLocaleTimeString([], { hour: "numeric" })}
                      </p>
                      <img src={p.icon} alt="" className="h-7 w-7 mx-auto" />
                      <p className="font-display font-bold text-sm">{Math.round(p.temperature)}°</p>
                      <p className={cn("text-[9px]", p.probabilityOfPrecipitation?.value ? "text-accent" : "text-transparent")}>
                        {p.probabilityOfPrecipitation?.value ? `${p.probabilityOfPrecipitation.value}%` : "·"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground mb-2">
                  7-Day Outlook
                </h3>
                <div className="divide-y divide-border/60">
                  {weather.data.forecast.properties.periods.slice(0, 7).map((p) => (
                    <div key={p.number} className="flex items-center gap-2 py-1.5">
                      <div className="w-16 text-[11px] font-medium truncate">{p.name}</div>
                      <img src={p.icon} alt="" className="h-7 w-7 shrink-0" />
                      <div className="flex-1 text-[11px] text-muted-foreground truncate min-w-0">{p.shortForecast}</div>
                      <div className={cn("font-display text-sm font-bold shrink-0", p.isDaytime ? "text-amber-alert" : "text-cyan-glow")}>
                        {Math.round(p.temperature)}°
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <Eye className="h-3 w-3" />
              NOAA / NWS · Open-Meteo · Updated{" "}
              <span suppressHydrationWarning>
                {new Date(weather.data.forecast.properties.updated).toLocaleTimeString()}
              </span>
              <span className="text-border">|</span>
              <span>{allAlerts.length} active MI alerts (land + Great Lakes marine)</span>
              <span className="text-border">|</span>
              <Link to="/forecasts" className="text-accent hover:underline">Read NWS text products →</Link>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border/60 mt-6">
        <div className="max-w-7xl mx-auto px-4 py-3 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>© Michigan Weather Authority — Unofficial. Source: NWS + Open-Meteo + MWA.</span>
          <span className="font-mono">MWA · MI · v1.1</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- City Search Popover ---------------- */

function CitySearch({ city, onPick }: { city: MichiganCity; onPick: (c: MichiganCity) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return MICHIGAN_CITIES.slice(0, 25);
    return MICHIGAN_CITIES.filter((c) =>
      (c.name + " " + c.county + " " + c.zip).toLowerCase().includes(term),
    ).slice(0, 50);
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 font-mono text-xs">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          <span className="truncate max-w-[180px]">{city.name}</span>
          <span className="text-muted-foreground text-[10px]">{city.zip}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search city, ZIP, or county…"
              className="pl-8 h-9 text-sm border-0 focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1">
          {results.map((c) => (
            <button
              key={c.zip}
              onClick={() => { onPick(c); setOpen(false); setQ(""); }}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-md text-sm flex items-center justify-between transition-colors",
                city.zip === c.zip ? "bg-accent/15 text-accent" : "hover:bg-secondary/60",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="h-3 w-3 opacity-60 shrink-0" />
                <span className="truncate">{c.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{c.county}</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">{c.zip}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">No matches.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------------- Extra stats panel ---------------- */

function ExtraStatsPanel({ data, loading }: { data: ExtraStats | undefined; loading: boolean }) {
  const aqi = aqiCategory(data?.aqi ?? null);
  const uv = uvCategory(data?.uvIndex ?? null);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">
          Air & Sky Conditions
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BigStat
          label="Air Quality (US AQI)"
          value={data?.aqi != null ? Math.round(data.aqi) : "—"}
          chip={aqi.label}
          chipClass={aqi.color}
          loading={loading}
        />
        <BigStat
          label="UV Index"
          value={data?.uvIndex != null ? data.uvIndex.toFixed(1) : "—"}
          chip={uv.label}
          chipClass={uv.color}
          loading={loading}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Metric icon={Eye} label="Visibility" value={data?.visibilityMi != null ? `${data.visibilityMi} mi` : "—"} />
        <Metric icon={Gauge} label="Pressure" value={data?.pressureMb != null ? `${data.pressureMb} mb` : "—"} />
        <Metric icon={Cloud} label="Cloud" value={data?.cloudCover != null ? `${Math.round(data.cloudCover)}%` : "—"} />
        <Metric icon={Sun} label="UV Max" value={data?.uvIndexMax != null ? data.uvIndexMax.toFixed(1) : "—"} />
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/60">
        <span className="inline-flex items-center gap-1"><Sunrise className="h-3 w-3 text-amber-alert" /> {data?.sunrise ? new Date(data.sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
        <span className="inline-flex items-center gap-1"><Sunset className="h-3 w-3 text-amber-alert" /> {data?.sunset ? new Date(data.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
        {data?.pm25 != null && <span>PM2.5 {data.pm25.toFixed(1)}</span>}
      </div>
    </div>
  );
}

function BigStat({ label, value, chip, chipClass, loading }: { label: string; value: string | number; chip: string; chipClass: string; loading: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-storm/50 p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-end gap-2 mt-0.5">
        <span className={cn("font-display text-3xl font-bold leading-none", loading && "opacity-30")}>{loading ? "…" : value}</span>
      </div>
      <span className={cn("inline-block mt-1.5 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border", chipClass)}>{chip}</span>
    </div>
  );
}

/* ---------------- AI Summary ---------------- */

function AISummaryCard(props: {
  city: MichiganCity;
  tempF: number;
  shortForecast: string;
  detailed: string;
  windSpeed: string;
  precipPct: number | null;
  aqi: number | null;
  uv: number | null;
}) {
  const fn = summarizeForecast;
  const mutation = useMutation({
    mutationFn: async () =>
      fn({
        data: {
          city: props.city.name,
          county: props.city.county,
          shortForecast: props.shortForecast,
          detailed: props.detailed,
          tempF: Math.round(props.tempF),
          windSpeed: props.windSpeed,
          precipPct: props.precipPct,
          aqi: props.aqi,
          uv: props.uv,
        },
      }),
  });

  // Auto-run on city change
  useEffect(() => {
    mutation.reset();
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.city.zip]);

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card p-4 md:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="font-display tracking-wider text-[11px] uppercase text-accent">
            MWA AI · What to do in {props.city.name} today
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-7 text-[11px]">
          <RefreshCw className={cn("h-3 w-3 mr-1", mutation.isPending && "animate-spin")} /> Regenerate
        </Button>
      </div>
      {mutation.isPending && <p className="text-sm text-muted-foreground">Analyzing today's conditions…</p>}
      {mutation.isError && <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>}
      {mutation.data && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{mutation.data.summary}</p>
          <div className="grid sm:grid-cols-3 gap-2">
            {mutation.data.activities?.map((a, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <p className="font-display font-bold text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.why}</p>
              </div>
            ))}
          </div>
          {mutation.data.warnings && (
            <div className="rounded-md border border-amber-alert/40 bg-amber-alert/10 p-2.5 text-xs">
              ⚠ {mutation.data.warnings}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Ticker (shows ALL alerts now) ---------------- */

function TickerBar({ entries }: { entries: AlertEntry[] }) {
  const items = entries.map((e) => {
    if (e.kind === "shared") {
      return {
        title: alertTitle(e),
        meta: `${e.alert.areas.join(", ")} — ${e.alert.headline}`,
        rank: entrySevRank(e),
      };
    }
    return {
      title: e.alert.properties.event,
      meta: e.alert.properties.areaDesc,
      rank: entrySevRank(e),
    };
  });

  const topRank = items.reduce((m, i) => Math.max(m, i.rank), 0);
  const tierLabel = topRank >= 4 ? "EXTREME" : topRank === 3 ? "SEVERE" : topRank === 2 ? "MODERATE" : topRank === 1 ? "MINOR" : "ALL CLEAR";
  const tierBg =
    topRank >= 4 ? "bg-severe text-white border-severe" :
    topRank === 3 ? "bg-warning text-white border-warning" :
    topRank === 2 ? "bg-watch text-black border-watch" :
    topRank === 1 ? "bg-advisory text-black border-advisory" :
    "bg-accent text-white border-accent";

  const display = items.length ? items : [{ title: "ALL CLEAR", meta: "No active alerts across Michigan", rank: 0 }];
  const doubled = [...display, ...display, ...display];

  return (
    <div className="border-b overflow-hidden">
      <div className="flex items-stretch max-w-[100vw]">
        <div className={cn("flex-none px-3 grid place-items-center text-[11px] font-mono font-bold uppercase tracking-wider gap-1.5 border-r", tierBg)}>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 alert-pulse" /> {tierLabel} · {items.length}
          </span>
        </div>
        <div className={cn("overflow-hidden flex-1 group border-y", topRank >= 3 ? "bg-severe/5 border-severe/30" : topRank === 2 ? "bg-watch/10 border-watch/40" : topRank === 1 ? "bg-advisory/10 border-advisory/40" : "bg-accent/5 border-accent/20")}>
          <div className="ticker-fast whitespace-nowrap flex gap-8 py-2 group-hover:[animation-play-state:paused]">
            {doubled.map((t, i) => {
              const c =
                t.rank >= 4 ? "text-severe" :
                t.rank === 3 ? "text-warning" :
                t.rank === 2 ? "text-watch" :
                t.rank === 1 ? "text-amber-alert" :
                "text-accent";
              return (
                <span key={i} className="text-xs font-display tracking-wider font-semibold uppercase flex items-center gap-2">
                  <span className={cn("font-bold", c)}>⚡ {t.title}</span>
                  <span className="text-muted-foreground normal-case font-sans font-normal tracking-normal">— {t.meta}</span>
                </span>
              );
            })}
          </div>
        </div>
        <AllAlertsDialog entries={entries} label={`Read all (${entries.length})`} tickerStyle />
      </div>
    </div>
  );
}

function AllAlertsDialog({ entries, label, tickerStyle }: { entries: AlertEntry[]; label: string; tickerStyle?: boolean; full?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors",
            tickerStyle
              ? "flex-none bg-card text-foreground hover:bg-muted border-l border-border px-3 text-[11px] font-bold"
              : "text-accent hover:text-accent/80 text-xs",
          )}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-2xl flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-amber-alert" />
            All Active Alerts ({entries.length})
          </DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No active alerts in Michigan right now.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => <FullAlert key={i} entry={e} />)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FullAlert({ entry }: { entry: AlertEntry }) {
  if (entry.kind === "shared") {
    const a = entry.alert;
    const t = a.type_id ? getAlertType(a.type_id) : undefined;
    return (
      <div className="rounded-lg border border-border bg-storm/60 overflow-hidden">
        <div className={cn("px-4 py-2 flex items-center justify-between", severityFromShared(a))}>
          <div className="flex items-center gap-2 font-display uppercase tracking-wider text-sm font-bold">
            <AlertTriangle className="h-4 w-4" />
            {t?.name ?? a.custom_name ?? "Weather Alert"}
            <Badge variant="outline" className="border-current/40 text-[10px]">MWA Issued</Badge>
          </div>
          <span className="text-[10px] font-mono">until {new Date(a.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
        <div className="p-4 space-y-2">
          <p className="font-semibold">{a.headline}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
          {a.instruction && (
            <div className="rounded border border-amber-alert/40 bg-amber-alert/10 p-3 text-sm">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-alert mb-1">Precautionary / Preparedness Actions</p>
              <p className="whitespace-pre-wrap">{a.instruction}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground pt-1">
            <span>Areas: {a.areas.join(", ")}</span>
            <span>Issued by {a.issuer} · {new Date(a.issued_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  const p = entry.alert.properties;
  return (
    <div className="rounded-lg border border-border bg-storm/60 overflow-hidden">
      <div className={cn("px-4 py-2 flex items-center justify-between", severityFromEvent(p.event))}>
        <div className="flex items-center gap-2 font-display uppercase tracking-wider text-sm font-bold">
          <AlertTriangle className="h-4 w-4" />
          {p.event}
          <Badge variant="outline" className="border-current/40 text-[10px]">NWS</Badge>
        </div>
        <span className="text-[10px] font-mono">until {new Date(p.expires).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
      <div className="p-4 space-y-2">
        <p className="font-semibold">{p.headline}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
        {p.instruction && (
          <div className="rounded border border-amber-alert/40 bg-amber-alert/10 p-3 text-sm whitespace-pre-wrap">{p.instruction}</div>
        )}
        <div className="text-[10px] font-mono text-muted-foreground pt-1">Areas: {p.areaDesc} · Issued by {p.senderName}</div>
      </div>
    </div>
  );
}

function AlertCard({ entry }: { entry: AlertEntry }) {
  if (entry.kind === "shared") {
    const a = entry.alert;
    const t = a.type_id ? getAlertType(a.type_id) : undefined;
    return (
      <div className={cn("rounded-md p-3 flex items-start gap-3", severityFromShared(a))}>
        <AlertTriangle className="h-5 w-5 flex-none mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold uppercase tracking-wider text-sm">{t?.name ?? a.custom_name ?? "Weather Alert"}</span>
            <Badge variant="outline" className="text-[10px] border-current/40">MWA</Badge>
            <span className="text-[10px] opacity-80 font-mono">Until {new Date(a.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <p className="text-sm mt-1 font-medium">{a.headline}</p>
          <p className="text-xs opacity-90 mt-1 line-clamp-2">{a.description}</p>
        </div>
      </div>
    );
  }
  const p = entry.alert.properties;
  return (
    <div className={cn("rounded-md p-3 flex items-start gap-3", severityFromEvent(p.event))}>
      <AlertTriangle className="h-5 w-5 flex-none mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold uppercase tracking-wider text-sm">{p.event}</span>
          <Badge variant="outline" className="text-[10px] border-current/40">NWS</Badge>
          <span className="text-[10px] opacity-80 font-mono">Until {new Date(p.expires).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
        </div>
        <p className="text-sm mt-1 font-medium line-clamp-1">{p.headline}</p>
        <p className="text-xs opacity-90 mt-1">{p.areaDesc}</p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-accent" />
      <div>
        <p className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 grid place-items-center min-h-[280px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">Polling NWS feed…</p>
      </div>
    </div>
  );
}
