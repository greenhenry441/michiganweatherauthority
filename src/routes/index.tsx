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
import { getEasType, MWA_NETWORK_TYPE } from "@/lib/eas-alert-types";
import { MICHIGAN_COUNTIES } from "@/lib/michigan-counties";
import { colorForEvent, isLightColor } from "@/lib/nws-colors";
import { MichiganAlertMap } from "@/components/MichiganAlertMap";
import { RadarPanel } from "@/components/RadarPanel";
import { LightningPanel } from "@/components/LightningPanel";
import { SevereOutlookPanel } from "@/components/SevereOutlookPanel";
import { HourlyMeteogram } from "@/components/HourlyMeteogram";
import { AlertHistoryPanel } from "@/components/AlertHistoryPanel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { IosInstallBanner } from "@/components/IosInstallBanner";
import { InstallAppButton } from "@/components/InstallAppButton";
import mwaLogo from "@/assets/mwa-logo-new.png.asset.json";


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
    const id = entry.alert.type_id;
    if (id) {
      const t = getAlertType(id) ?? getEasType(id);
      if (t) return t.name;
    }
    return entry.alert.custom_name ?? "Alert";
  }
  return entry.alert.properties.event;
}

const SEV_RANK: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };
function entrySevRank(e: AlertEntry): number {
  if (e.kind === "shared") return SEV_RANK[e.alert.severity] ?? 0;
  const s = (e.alert.properties.severity ?? "").toLowerCase();
  return SEV_RANK[s] ?? (e.alert.properties.event.toLowerCase().includes("warning") ? 3 : 2);
}

function entryEventName(e: AlertEntry): string {
  if (e.kind === "shared") {
    const id = e.alert.type_id;
    if (id) {
      const t = getAlertType(id) ?? getEasType(id);
      if (t) return t.name;
    }
    return e.alert.custom_name ?? "Alert";
  }
  return e.alert.properties.event;
}

function entryCounties(e: AlertEntry): Array<{ county: string; partial: boolean }> {
  const raw = e.kind === "shared" ? e.alert.areas.join("; ") : e.alert.properties.areaDesc;
  const text = raw.toLowerCase();
  if (e.kind === "shared" && e.alert.areas.some((a) => a.toLowerCase() === "statewide")) {
    return MICHIGAN_COUNTIES.map((c) => ({ county: c, partial: false }));
  }
  // Split by ';' or ',' so we can check each segment for partial keywords near a county name.
  const segments = raw.split(/;|,/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const partialKeywords = /(portion|portions of|part of|northern|southern|eastern|western|northeast|northwest|southeast|southwest|north central|south central|central)/;
  const found = new Map<string, boolean>(); // name -> partial
  for (const c of MICHIGAN_COUNTIES) {
    const cl = c.toLowerCase();
    let matched = false;
    let partial = false;
    for (const seg of segments) {
      if (seg.includes(cl)) {
        matched = true;
        if (partialKeywords.test(seg)) partial = true;
      }
    }
    if (!matched && text.includes(cl)) {
      matched = true;
      // Fall back to checking surrounding text for partial keywords.
      const idx = text.indexOf(cl);
      const window = text.slice(Math.max(0, idx - 40), idx);
      if (partialKeywords.test(window)) partial = true;
    }
    if (matched) {
      const prev = found.get(c);
      // Any full-coverage instance wins over partial.
      found.set(c, prev === false ? false : partial);
    }
  }
  return Array.from(found.entries()).map(([county, partial]) => ({ county, partial }));
}

function buildCountyAlerts(entries: AlertEntry[]) {
  const out: Array<{ county: string; event: string; rank: number; partial: boolean }> = [];
  for (const e of entries) {
    const ev = entryEventName(e);
    const rank = entrySevRank(e);
    for (const c of entryCounties(e)) out.push({ county: c.county, event: ev, rank, partial: c.partial });
  }
  return out;
}

function buildAlertPolygons(entries: AlertEntry[]) {
  const out: Array<{ event: string; rank: number; geometry: any; areaDesc?: string }> = [];
  for (const e of entries) {
    if (e.kind !== "nws") continue;
    const g = (e.alert as any).geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    out.push({
      event: entryEventName(e),
      rank: entrySevRank(e),
      geometry: g,
      areaDesc: e.alert.properties.areaDesc,
    });
  }
  return out;
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

type NotifyCategory = "warning" | "watch" | "advisory" | "statement";
type NotifySeverity = "extreme" | "severe" | "moderate" | "minor";
interface NotifyPrefs {
  notify_alerts: boolean;
  notify_forecast: boolean;
  notify_hourly_forecast: boolean;
  notify_marine: boolean;
  notify_eas: boolean;
  notify_only_my_area: boolean;
  notify_categories: NotifyCategory[];
  notify_event_types: string[];
  min_severity: NotifySeverity;
  work_city?: string | null;
  work_county?: string | null;
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

  // Load signed-in user's home location + notification prefs
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  useEffect(() => {
    if (!user) { setPrefs(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("home_zip, home_city, home_lat, home_lon, work_zip, work_city, notify_alerts, notify_forecast, notify_hourly_forecast, notify_marine, notify_eas, notify_only_my_area, notify_categories, notify_event_types, min_severity")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const d = data as any;
      if (d.home_zip) {
        const match = MICHIGAN_CITIES.find((c) => c.zip === d.home_zip);
        if (match) setCity(match);
      }
      const workMatch = d.work_zip ? MICHIGAN_CITIES.find((c) => c.zip === d.work_zip) : null;
      setPrefs({
        notify_alerts: !!d.notify_alerts,
        notify_forecast: !!d.notify_forecast,
        notify_hourly_forecast: !!d.notify_hourly_forecast,
        notify_marine: !!d.notify_marine,
        notify_eas: d.notify_eas ?? true,
        notify_only_my_area: d.notify_only_my_area ?? true,
        notify_categories: d.notify_categories ?? ["warning", "watch", "advisory", "statement"],
        notify_event_types: d.notify_event_types ?? [],
        min_severity: d.min_severity ?? "moderate",
        work_city: workMatch?.name ?? d.work_city ?? null,
        work_county: workMatch?.county ?? null,
      });
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

  const weatherAlerts = useMemo(
    () => allAlerts.filter((a) => a.kind === "nws" || (a.kind === "shared" && (a.alert.kind ?? "weather") === "weather")),
    [allAlerts],
  );
  const easAlerts = useMemo(
    () => allAlerts.filter((a) => a.kind === "shared" && (a.alert.kind === "eas" || a.alert.kind === "mwa-network")),
    [allAlerts],
  );

  useAlertNotifications(allAlerts, city, prefs);
  useForecastNotifications(city, weather.data, prefs);

  const cityAlerts = useMemo(
    () => weatherAlerts.filter((a) => entryMatchesArea(a, city)),
    [weatherAlerts, city],
  );

  const current = weather.data?.hourly.properties.periods[0];
  const today = weather.data?.forecast.properties.periods[0];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur-xl bg-background/40 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3 min-h-11 py-1">
            <div className="relative h-11 w-11 shrink-0 grid place-items-center overflow-hidden rounded-xl">
              <div className="absolute inset-0 aurora-bg opacity-30 blur-md" />
              <img src={mwaLogo.url} alt="MWA logo" className="relative h-11 w-11 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl md:text-2xl leading-none truncate">
                <span className="hidden sm:inline text-aurora">Michigan Weather Authority</span>
                <span className="sm:hidden text-aurora">MWA</span>
              </h1>
              <p className="text-[10px] md:text-[11px] text-muted-foreground tracking-[0.3em] uppercase truncate font-mono mt-1">
                Aurora · Live Ops Center
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Link to="/forecasts" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-accent min-h-11 px-2" aria-label="Forecasts">
              <FileText className="h-4 w-4" /> <span className="hidden md:inline">Forecasts</span>
            </Link>
            <Link to="/forecasts" className="sm:hidden inline-flex items-center justify-center text-muted-foreground hover:text-accent min-h-11 min-w-11" aria-label="Forecasts">
              <FileText className="h-5 w-5" />
            </Link>
            <InstallAppButton />
            <NotifyToggle />
            {user ? (
              <Link to="/settings" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-accent hover:opacity-80 min-h-11 min-w-11 px-2 justify-center" aria-label="Account">
                <UserCircle2 className="h-5 w-5" /> <span className="hidden md:inline">Account</span>
              </Link>
            ) : (
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-accent hover:opacity-80 min-h-11 min-w-11 px-2 justify-center" aria-label="Sign in">
                <LogIn className="h-5 w-5" /> <span className="hidden md:inline">Sign in</span>
              </Link>
            )}
            <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-accent alert-pulse" />
              <span suppressHydrationWarning>{clock || "--:--"} ET</span>
            </div>
          </nav>
        </div>
      </header>

      <TickerBar entries={weatherAlerts} city={city} />
      {easAlerts.length > 0 && <EasTickerBar entries={easAlerts} />}
      <IosInstallBanner />



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
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Now reporting</p>
            <h2 className="font-display text-4xl md:text-5xl leading-tight truncate text-aurora">{city.name}, MI</h2>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              ZIP {city.zip} · {city.county} County · {MICHIGAN_CITIES.length.toLocaleString()} MI ZIPs indexed
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

            {/* Radar + Lightning */}
            <div className="grid lg:grid-cols-2 gap-4">
              <RadarPanel />
              <LightningPanel />
            </div>

            {/* Statewide alert map + SPC outlook */}
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
              <MichiganAlertMap
                alertsByCounty={buildCountyAlerts(weatherAlerts)}
                polygons={buildAlertPolygons(weatherAlerts)}
              />
              <SevereOutlookPanel />
            </div>

            {/* Hourly meteogram */}
            <HourlyMeteogram periods={weather.data.hourly.properties.periods} hours={36} />






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

            <AlertHistoryPanel />


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
          <div className="flex items-center gap-3">
            <a
              href="https://mwa.instatus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Status Page
            </a>
            <span className="font-mono">MWA · Aurora · v2.0</span>
          </div>
        </div>
      </footer>
      <Toaster />
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

/* ---------------- Notifications (in-tab; works on mobile while open) ---------------- */

const LS_NOTIFY = "mwa.notify.enabled";
const LS_NOTIFY_SEEN = "mwa.notify.seen";

function NotifyToggle() {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sup = "Notification" in window;
    setSupported(sup);
    if (!sup) return;
    const stored = localStorage.getItem(LS_NOTIFY) === "1";
    setEnabled(stored && Notification.permission === "granted");
  }, []);

  if (!mounted || !supported) {
    // Stable SSR/first-paint placeholder so hydration matches.
    return <span className="inline-block w-[68px] h-4" aria-hidden />;
  }


  const toggle = async () => {
    if (enabled) {
      localStorage.setItem(LS_NOTIFY, "0");
      setEnabled(false);
      toast.message("Alert notifications turned off");
      return;
    }
    const perm = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Notifications were blocked by your browser");
      return;
    }
    localStorage.setItem(LS_NOTIFY, "1");
    setEnabled(true);
    toast.success("You'll be notified of new Michigan alerts");
    try {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      if (reg) {
        reg.showNotification("MWA notifications enabled", { body: "You'll get a ping for new Michigan alerts.", tag: "mwa-welcome" });
      } else {
        new Notification("MWA notifications enabled", { body: "You'll get a ping for new MI alerts while this tab is open." });
      }
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      title={enabled ? "Disable alert notifications" : "Enable alert notifications"}
      aria-label={enabled ? "Disable alert notifications" : "Enable alert notifications"}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors min-h-11 min-w-11 px-2 justify-center",
        enabled ? "text-accent" : "text-muted-foreground hover:text-accent",
      )}
    >
      {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      <span className="hidden sm:inline">{enabled ? "Alerts on" : "Notify"}</span>
    </button>
  );

}

const SEV_RANK_LOCAL: Record<string, number> = { extreme: 4, severe: 3, moderate: 2, minor: 1 };

function entryCategory(e: AlertEntry): NotifyCategory {
  if (e.kind === "shared") {
    const c = e.alert.category;
    if (c === "warning" || c === "extreme") return "warning";
    if (c === "watch") return "watch";
    if (c === "advisory") return "advisory";
    return "statement";
  }
  const ev = e.alert.properties.event.toLowerCase();
  if (ev.includes("warning")) return "warning";
  if (ev.includes("watch")) return "watch";
  if (ev.includes("advisory")) return "advisory";
  return "statement";
}

function entrySeverity(e: AlertEntry): NotifySeverity {
  if (e.kind === "shared") return e.alert.severity;
  const s = (e.alert.properties.severity ?? "").toLowerCase();
  if (s === "extreme" || s === "severe" || s === "moderate" || s === "minor") return s;
  return e.alert.properties.event.toLowerCase().includes("warning") ? "severe" : "moderate";
}

function matchesPlace(e: AlertEntry, name: string, county: string): boolean {
  const n = name.toLowerCase(), c = county.toLowerCase();
  if (e.kind === "shared") {
    return e.alert.areas.some(
      (x) => x.toLowerCase() === "statewide" || x.toLowerCase().includes(n) || x.toLowerCase().includes(c),
    );
  }
  const desc = e.alert.properties.areaDesc.toLowerCase();
  return desc.includes(c) || desc.includes(n);
}

function entryMatchesArea(e: AlertEntry, city: MichiganCity, work?: { name?: string | null; county?: string | null } | null): boolean {
  if (matchesPlace(e, city.name, city.county)) return true;
  if (work?.name && work?.county && matchesPlace(e, work.name, work.county)) return true;
  return false;
}

function entryIsMarine(e: AlertEntry): boolean {
  const text = e.kind === "shared"
    ? `${e.alert.areas.join(" ")} ${e.alert.headline}`.toLowerCase()
    : `${e.alert.properties.areaDesc} ${e.alert.properties.event}`.toLowerCase();
  return /marine|lake (huron|michigan|superior|erie|ontario)|gale|small craft|beach hazard/.test(text);
}

function useAlertNotifications(entries: AlertEntry[], city: MichiganCity, prefs: NotifyPrefs | null) {
  const initialized = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(LS_NOTIFY) !== "1" || Notification.permission !== "granted") return;

    const seen: string[] = JSON.parse(localStorage.getItem(LS_NOTIFY_SEEN) || "[]");
    const seenSet = new Set(seen);

    const ids = entries.map((e) => e.kind === "shared" ? `s:${e.alert.id}` : `n:${e.alert.properties.id}`);

    if (!initialized.current) {
      initialized.current = true;
      localStorage.setItem(LS_NOTIFY_SEEN, JSON.stringify(ids.slice(0, 200)));
      return;
    }

    // Signed-out fallback: notify on everything in current city (back-compat).
    const p: NotifyPrefs = prefs ?? {
      notify_alerts: true,
      notify_forecast: false,
      notify_hourly_forecast: false,
      notify_marine: true,
      notify_eas: true,
      notify_only_my_area: true,
      notify_categories: ["warning", "watch", "advisory", "statement"],
      notify_event_types: [],
      min_severity: "minor",
    };

    if (!p.notify_alerts) return;
    const minRank = SEV_RANK_LOCAL[p.min_severity] ?? 1;
    const typeSet = new Set(p.notify_event_types.map((t) => t.toLowerCase()));

    (async () => {
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
      for (let i = 0; i < entries.length; i++) {
        const id = ids[i];
        if (seenSet.has(id)) continue;
        const e = entries[i];
        const isEas = e.kind === "shared" && (e.alert.kind === "eas" || e.alert.kind === "mwa-network");

        if (isEas) {
          if (!p.notify_eas) { seenSet.add(id); continue; }
        } else {
          const marine = entryIsMarine(e);
          if (marine && !p.notify_marine) { seenSet.add(id); continue; }
          // HARD RULE: weather alerts (including marine) must match the user's home or work area
          // whenever "only my area" is on. No bypass.
          if (p.notify_only_my_area && !entryMatchesArea(e, city, { name: p.work_city, county: p.work_county })) { seenSet.add(id); continue; }
          if (!p.notify_categories.includes(entryCategory(e))) { seenSet.add(id); continue; }
          if ((SEV_RANK_LOCAL[entrySeverity(e)] ?? 0) < minRank) { seenSet.add(id); continue; }
          const title = e.kind === "shared" ? alertTitle(e) : e.alert.properties.event;
          if (typeSet.size > 0 && !typeSet.has(title.toLowerCase())) { seenSet.add(id); continue; }
        }


        const title = e.kind === "shared" ? alertTitle(e) : e.alert.properties.event;
        const body = e.kind === "shared"
          ? `${e.alert.areas.join(", ")} — ${e.alert.headline}`
          : `${e.alert.properties.areaDesc}`;
        try {
          const prefix = isEas ? "🚨" : "⚠";
          if (reg) reg.showNotification(`${prefix} ${title}`, { body, tag: id, data: { url: "/" } });
          else new Notification(`${prefix} ${title}`, { body, tag: id });
        } catch {}
        seenSet.add(id);
      }
      localStorage.setItem(LS_NOTIFY_SEEN, JSON.stringify(Array.from(seenSet).slice(-300)));
    })();
  }, [entries, city, prefs]);
}

/* ---------------- Forecast notifications (daily + hourly) ---------------- */

const LS_FORECAST_DAILY = "mwa.notify.forecast.daily";
const LS_FORECAST_HOURLY = "mwa.notify.forecast.hourly";

type WeatherBundle = ReturnType<typeof Object> & {
  forecast: { properties: { periods: Array<{ name: string; temperature: number; shortForecast: string; detailedForecast: string }> } };
  hourly: { properties: { periods: Array<{ startTime: string; temperature: number; shortForecast: string; probabilityOfPrecipitation?: { value: number | null } }> } };
};

function useForecastNotifications(city: MichiganCity, weather: WeatherBundle | undefined, prefs: NotifyPrefs | null) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !weather || !prefs) return;
    if (Notification.permission !== "granted") return;
    if (!prefs.notify_forecast && !prefs.notify_hourly_forecast) return;

    const send = async (title: string, body: string, tag: string) => {
      try {
        const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
        if (reg) reg.showNotification(title, { body, tag, data: { url: "/" } });
        else new Notification(title, { body, tag });
      } catch {}
    };

    const tick = () => {
      const now = new Date();
      // Daily digest at 7am local
      if (prefs.notify_forecast && now.getHours() === 7) {
        const key = `${city.zip}:${now.toISOString().slice(0, 10)}`;
        if (localStorage.getItem(LS_FORECAST_DAILY) !== key) {
          const today = weather.forecast.properties.periods[0];
          if (today) {
            send(
              `Today in ${city.name}`,
              `${today.name}: ${today.shortForecast}, ${Math.round(today.temperature)}°. ${today.detailedForecast.slice(0, 140)}`,
              `mwa-daily-${key}`,
            );
            localStorage.setItem(LS_FORECAST_DAILY, key);
          }
        }
      }
      // Hourly ping at minute 0
      if (prefs.notify_hourly_forecast && now.getMinutes() < 5) {
        const key = `${city.zip}:${now.toISOString().slice(0, 13)}`;
        if (localStorage.getItem(LS_FORECAST_HOURLY) !== key) {
          const nextHour = weather.hourly.properties.periods[1] ?? weather.hourly.properties.periods[0];
          if (nextHour) {
            const pop = nextHour.probabilityOfPrecipitation?.value;
            send(
              `Next hour · ${city.name}`,
              `${nextHour.shortForecast}, ${Math.round(nextHour.temperature)}°${pop ? ` · ${pop}% precip` : ""}`,
              `mwa-hourly-${key}`,
            );
            localStorage.setItem(LS_FORECAST_HOURLY, key);
          }
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [city, weather, prefs]);
}


/* ---------------- EAS / Emergency ticker (separate from weather) ---------------- */

function EasTickerBar({ entries }: { entries: AlertEntry[] }) {
  const items = entries.map((e) => {
    if (e.kind === "shared") {
      const isNetwork = e.alert.kind === "mwa-network";
      return {
        title: alertTitle(e),
        meta: `${e.alert.areas.join(", ")} — ${e.alert.headline}`,
        isNetwork,
      };
    }
    return { title: "", meta: "", isNetwork: false };
  });

  const hasNetwork = items.some((i) => i.isNetwork);
  const tierBg = hasNetwork && items.every((i) => i.isNetwork)
    ? "bg-accent text-white border-accent"
    : "bg-amber-alert text-black border-amber-alert";
  const label = items.every((i) => i.isNetwork) ? "MWA NETWORK" : "EAS / EMERGENCY";

  const doubled = [...items, ...items, ...items];

  return (
    <div className="border-b overflow-hidden">
      <div className="flex items-stretch max-w-[100vw]">
        <div className={cn("flex-none px-3 grid place-items-center text-[11px] font-mono font-bold uppercase tracking-wider gap-1.5 border-r", tierBg)}>
          <span className="flex items-center gap-1.5">
            <Megaphone className="h-3 w-3 alert-pulse" /> {label} · {entries.length}
          </span>
        </div>
        <div className="overflow-hidden flex-1 min-w-0 group border-y bg-amber-alert/5 border-amber-alert/30">
          <div className="ticker-fast whitespace-nowrap flex gap-8 py-2 group-hover:[animation-play-state:paused]">
            {doubled.map((t, i) => (
              <span key={i} className="text-xs font-display tracking-wider font-semibold uppercase flex items-center gap-2">
                <span className={cn("font-bold", t.isNetwork ? "text-accent" : "text-amber-alert")}>
                  {t.isNetwork ? "📡" : "🚨"} {t.title}
                </span>
                <span className="text-muted-foreground normal-case font-sans font-normal tracking-normal">— {t.meta}</span>
              </span>
            ))}
          </div>
        </div>
        <AllAlertsDialog entries={entries} label={`Read EAS (${entries.length})`} tickerStyle />
      </div>
    </div>
  );
}

/* ---------------- Ticker (shows ALL alerts now) ---------------- */


function TickerBar({ entries, city }: { entries: AlertEntry[]; city?: MichiganCity }) {
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
        <div className={cn("overflow-hidden flex-1 min-w-0 group border-y", topRank >= 3 ? "bg-severe/5 border-severe/30" : topRank === 2 ? "bg-watch/10 border-watch/40" : topRank === 1 ? "bg-advisory/10 border-advisory/40" : "bg-accent/5 border-accent/20")}>
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
        <AllAlertsDialog entries={entries} label={`Read all (${entries.length})`} tickerStyle city={city} />
      </div>
    </div>
  );
}

function AllAlertsDialog({ entries, label, tickerStyle, city }: { entries: AlertEntry[]; label: string; tickerStyle?: boolean; full?: boolean; city?: MichiganCity }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors",
            tickerStyle
              ? "relative z-10 flex-none bg-card text-foreground hover:bg-muted border-l border-border px-3 text-[11px] font-bold min-h-11 min-w-11 justify-center"
              : "text-accent hover:text-accent/80 text-xs min-h-11 px-2",
          )}
        >
          <ListOrdered className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">All ({entries.length})</span>
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
          <GroupedAlerts entries={entries} city={city} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function alertCategory(entry: AlertEntry): "warning" | "watch" | "advisory" | "statement" {
  if (entry.kind === "shared") {
    const c = entry.alert.category;
    if (c === "warning" || c === "extreme") return "warning";
    if (c === "watch") return "watch";
    if (c === "advisory") return "advisory";
    return "statement";
  }
  const e = entry.alert.properties.event.toLowerCase();
  if (e.includes("warning")) return "warning";
  if (e.includes("watch")) return "watch";
  if (e.includes("advisory")) return "advisory";
  return "statement";
}

const GROUP_ORDER: Array<{ key: "warning" | "watch" | "advisory" | "statement"; label: string; color: string }> = [
  { key: "warning", label: "Warnings", color: "text-warning border-warning/40 bg-warning/5" },
  { key: "watch", label: "Watches", color: "text-watch border-watch/40 bg-watch/10" },
  { key: "advisory", label: "Advisories", color: "text-amber-alert border-advisory/40 bg-advisory/10" },
  { key: "statement", label: "Statements", color: "text-accent border-accent/30 bg-accent/5" },
];

function GroupedAlerts({ entries, city }: { entries: AlertEntry[]; city?: MichiganCity }) {
  const groups = useMemo(() => {
    const m: Record<string, AlertEntry[]> = { warning: [], watch: [], advisory: [], statement: [] };
    for (const e of entries) m[alertCategory(e)].push(e);
    if (city) {
      for (const k of Object.keys(m)) {
        m[k].sort((a, b) => {
          const al = entryMatchesArea(a, city) ? 0 : 1;
          const bl = entryMatchesArea(b, city) ? 0 : 1;
          return al - bl;
        });
      }
    }
    return m;
  }, [entries, city]);

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((g) => {
        const list = groups[g.key];
        if (!list.length) return null;
        const localCount = city ? list.filter((e) => entryMatchesArea(e, city)).length : 0;
        return (
          <section key={g.key} className="space-y-2">
            <div className={cn("flex items-center justify-between rounded-md border px-3 py-1.5", g.color)}>
              <h3 className="font-display tracking-wider uppercase text-xs font-bold">{g.label}</h3>
              <span className="text-[10px] font-mono opacity-80">
                {localCount > 0 ? `${localCount} for ${city!.name} · ` : ""}{list.length} active
              </span>
            </div>
            <div className="space-y-3">
              {list.map((e, i) => (
                <div key={i} className="relative">
                  {city && entryMatchesArea(e, city) && (
                    <span className="absolute -top-2 left-3 z-10 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent/60 bg-card text-accent">
                      Your area
                    </span>
                  )}
                  <FullAlert entry={e} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FullAlert({ entry }: { entry: AlertEntry }) {
  const eventName = entryEventName(entry);
  const bg = colorForEvent(eventName);
  const fg = isLightColor(bg) ? "#000" : "#fff";
  if (entry.kind === "shared") {
    const a = entry.alert;
    const t = a.type_id ? getAlertType(a.type_id) : undefined;
    return (
      <div className="rounded-lg border border-border bg-storm/60 overflow-hidden">
        <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: bg, color: fg }}>
          <div className="flex items-center gap-2 font-display uppercase tracking-wider text-sm font-bold">
            <AlertTriangle className="h-4 w-4" />
            {t?.name ?? a.custom_name ?? "Weather Alert"}
            <Badge variant="outline" className="border-current/40 text-[10px]" style={{ color: fg, borderColor: fg }}>MWA Issued</Badge>
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
      <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: bg, color: fg }}>
        <div className="flex items-center gap-2 font-display uppercase tracking-wider text-sm font-bold">
          <AlertTriangle className="h-4 w-4" />
          {p.event}
          <Badge variant="outline" className="text-[10px]" style={{ color: fg, borderColor: fg }}>NWS</Badge>
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
