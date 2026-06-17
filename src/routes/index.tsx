import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, MapPin, Radio, RefreshCw, Search, Wind, Droplets,
  Thermometer, Sunrise, Eye, Gauge, Megaphone, ChevronRight, ListOrdered,
} from "lucide-react";
import { MICHIGAN_CITIES, type MichiganCity } from "@/lib/michigan-cities";
import { getCityWeather, getMichiganAlerts, type NWSAlert } from "@/lib/weather-api";
import { useSharedAlerts, type SharedAlert } from "@/lib/alerts-store";
import { getAlertType } from "@/lib/nws-alert-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Michigan Weather Authority — Live Forecasts & Alerts" },
      { name: "description", content: "Live weather, forecasts, and official-style alerts for every city in Michigan from the Michigan Weather Authority (MWA)." },
      { property: "og:title", content: "Michigan Weather Authority" },
      { property: "og:description", content: "Live weather, forecasts, and alerts for every city in Michigan." },
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
  if (e.includes("warning")) return "bg-warning text-black";
  if (e.includes("watch")) return "bg-watch text-black";
  if (e.includes("advisory")) return "bg-advisory text-black";
  return "bg-statement text-white";
}

function severityFromShared(a: SharedAlert) {
  if (a.severity === "extreme") return "bg-severe text-white";
  if (a.category === "warning") return "bg-warning text-black";
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

const SEV_RANK: Record<string, number> = {
  extreme: 4, severe: 3, moderate: 2, minor: 1,
};
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


function HomePage() {
  const [city, setCity] = useState<MichiganCity>(MICHIGAN_CITIES[0]);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      MICHIGAN_CITIES.filter((c) =>
        (c.name + " " + c.county + " " + c.zip).toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 40),
    [search],
  );

  const weather = useQuery({
    queryKey: ["weather", city.lat, city.lon],
    queryFn: () => getCityWeather(city.lat, city.lon),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
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
    ],
    [shared, nwsAlerts.data],
  );

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
      <header className="border-b border-border/60 backdrop-blur-md bg-storm-deep/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-full bg-accent/10 border border-accent/40 grid place-items-center overflow-hidden">
              <Radio className="h-5 w-5 text-accent" />
              <div className="absolute inset-0 radar-sweep pointer-events-none" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-wider leading-none">
                MICHIGAN WEATHER AUTHORITY
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.3em] uppercase">
                MWA • Live Operations Center
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="h-2 w-2 rounded-full bg-accent alert-pulse" />
            <span>LIVE</span>
            <span className="text-border">|</span>
            <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ET</span>
          </div>
        </div>
      </header>

      {/* Hero Alert Banner */}
      {cityAlerts.length > 0 && (
        <section className="border-b border-severe/40 bg-severe/10">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
            {cityAlerts.slice(0, 3).map((a, i) => (
              <AlertCard key={i} entry={a} />
            ))}
            {cityAlerts.length > 3 && (
              <AllAlertsDialog entries={allAlerts} label={`+${cityAlerts.length - 3} more for ${city.name}`} />
            )}
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              <span>Select Location</span>
              <span className="text-accent/80">{MICHIGAN_CITIES.length.toLocaleString()} ZIPs</span>
            </label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Michigan cities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-input/40 border-border"
              />
            </div>
            <div className="mt-3 max-h-[420px] overflow-y-auto pr-1 space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.zip}
                  onClick={() => setCity(c)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group transition-colors",
                    city.zip === c.zip
                      ? "bg-accent/15 text-accent border border-accent/40"
                      : "hover:bg-secondary/60 border border-transparent",
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 opacity-60 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                    {c.zip}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                  No matches.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-3">
            <div className="flex items-center gap-2 text-accent">
              <Megaphone className="h-4 w-4" />
              <span className="font-mono uppercase tracking-wider">Active Alerts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat label="Statewide" value={allAlerts.length} />
              <Stat label="This City" value={cityAlerts.length} />
            </div>
            <AllAlertsDialog entries={allAlerts} label="View All Alerts" full />
          </div>
        </aside>

        {/* Main weather */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
                Now reporting
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-glow">
                {city.name}, MI
              </h2>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                ZIP {city.zip} • {city.county} County • {city.lat.toFixed(3)}°N, {Math.abs(city.lon).toFixed(3)}°W
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => weather.refetch()}
              disabled={weather.isFetching}
              className="text-muted-foreground"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", weather.isFetching && "animate-spin")} />
              {weather.isFetching ? "Updating" : "Refresh"}
            </Button>
          </div>

          {weather.isLoading && <LoadingPanel />}
          {weather.isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
              Unable to reach NWS data feed. Try refreshing in a moment.
            </div>
          )}

          {current && today && weather.data && (
            <>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative p-6 md:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
                  <div className="absolute inset-0 opacity-30 pointer-events-none scan-line h-px top-auto bottom-0" />
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-7xl md:text-8xl font-bold text-glow leading-none">
                        {Math.round(current.temperature)}°
                      </span>
                      <span className="text-xl text-muted-foreground">{current.temperatureUnit}</span>
                    </div>
                    <p className="mt-2 text-lg font-medium">{current.shortForecast}</p>
                    <p className="text-sm text-muted-foreground mt-1">{today.detailedForecast}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                      <Metric icon={Wind} label="Wind" value={`${current.windDirection} ${current.windSpeed}`} />
                      <Metric icon={Droplets} label="Humidity" value={current.relativeHumidity?.value != null ? `${Math.round(current.relativeHumidity.value)}%` : "—"} />
                      <Metric icon={Thermometer} label="Dew Point" value={current.dewpoint?.value != null ? `${Math.round((current.dewpoint.value * 9) / 5 + 32)}°F` : "—"} />
                      <Metric icon={Gauge} label="Precip" value={current.probabilityOfPrecipitation?.value != null ? `${current.probabilityOfPrecipitation.value}%` : "0%"} />
                    </div>
                  </div>
                  <img
                    src={current.icon.replace("size=medium", "size=large")}
                    alt={current.shortForecast}
                    className="h-40 w-40 rounded-lg border border-border/60 bg-storm shadow-glow"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display tracking-wider text-sm uppercase text-muted-foreground">
                    Next 24 Hours
                  </h3>
                  <Sunrise className="h-4 w-4 text-amber-alert" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {weather.data.hourly.properties.periods.slice(0, 24).map((p) => (
                    <div key={p.number} className="flex-none w-20 text-center rounded-lg bg-storm/50 border border-border/40 p-2">
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {new Date(p.startTime).toLocaleTimeString([], { hour: "numeric" })}
                      </p>
                      <img src={p.icon} alt="" className="h-10 w-10 mx-auto my-1" />
                      <p className="font-display font-bold">{Math.round(p.temperature)}°</p>
                      {p.probabilityOfPrecipitation?.value ? (
                        <p className="text-[10px] text-accent">{p.probabilityOfPrecipitation.value}%</p>
                      ) : (
                        <p className="text-[10px] text-transparent">·</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-display tracking-wider text-sm uppercase text-muted-foreground mb-3">
                  Extended Forecast
                </h3>
                <div className="divide-y divide-border/60">
                  {weather.data.forecast.properties.periods.slice(0, 10).map((p) => (
                    <div key={p.number} className="flex items-center gap-4 py-3">
                      <div className="w-24 text-sm font-medium">{p.name}</div>
                      <img src={p.icon} alt="" className="h-10 w-10" />
                      <div className="flex-1 text-sm text-muted-foreground truncate">{p.shortForecast}</div>
                      <div className={cn("font-display text-xl font-bold", p.isDaytime ? "text-amber-alert" : "text-cyan-glow")}>
                        {Math.round(p.temperature)}°
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3 w-3" />
                Data: NOAA / National Weather Service • Updated{" "}
                {new Date(weather.data.forecast.properties.updated).toLocaleTimeString()}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-border/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>© Michigan Weather Authority — Unofficial. Source: NWS + MWA.</span>
          <span className="font-mono">MWA · MI · v1.0</span>
        </div>
      </footer>
    </div>
  );
}

function TickerBar({ entries }: { entries: AlertEntry[] }) {
  const items: { title: string; tone: string; meta: string }[] = entries.map((e) => {
    if (e.kind === "shared") {
      return {
        title: alertTitle(e),
        tone: e.alert.severity === "extreme" ? "text-severe" : e.alert.category === "warning" ? "text-warning" : e.alert.category === "watch" ? "text-watch" : "text-amber-alert",
        meta: `${e.alert.areas.join(", ")} • ${e.alert.headline}`,
      };
    }
    return {
      title: e.alert.properties.event,
      tone: "text-amber-alert",
      meta: e.alert.properties.areaDesc,
    };
  });

  const display = items.length
    ? items
    : [{ title: "ALL CLEAR", tone: "text-accent", meta: "No active alerts across Michigan" }];
  const doubled = [...display, ...display];

  return (
    <div className="bg-amber-alert/15 border-b border-amber-alert/40 overflow-hidden">
      <div className="flex items-stretch max-w-[100vw]">
        <div className="flex-none bg-amber-alert text-black px-3 grid place-items-center text-[11px] font-mono font-bold uppercase tracking-wider gap-1.5">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> MWA Wire
          </span>
        </div>
        <div className="overflow-hidden flex-1 group">
          <div className="ticker whitespace-nowrap flex gap-10 py-2 group-hover:[animation-play-state:paused]">
            {doubled.map((t, i) => (
              <span
                key={i}
                className="text-xs font-display tracking-wider font-semibold uppercase flex items-center gap-2"
              >
                <span className={cn("font-bold", t.tone)}>⚡ {t.title}</span>
                <span className="text-amber-alert/70 normal-case font-sans font-normal tracking-normal">
                  — {t.meta}
                </span>
              </span>
            ))}
          </div>
        </div>
        <AllAlertsDialog
          entries={entries}
          label={`Read all (${entries.length})`}
          tickerStyle
        />
      </div>
    </div>
  );
}

function AllAlertsDialog({
  entries,
  label,
  tickerStyle,
  full,
}: {
  entries: AlertEntry[];
  label: string;
  tickerStyle?: boolean;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors",
            tickerStyle &&
              "flex-none bg-storm-deep text-amber-alert hover:bg-storm border-l border-amber-alert/40 px-3 text-[11px] font-bold",
            !tickerStyle && full && "w-full justify-center bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-md px-3 py-2 text-xs",
            !tickerStyle && !full && "text-amber-alert hover:text-amber-alert/80 text-xs",
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
          <p className="text-sm text-muted-foreground py-10 text-center">
            No active alerts in Michigan right now.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((e, i) => (
              <FullAlert key={i} entry={e} />
            ))}
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
            <Badge variant="outline" className="border-current/40 text-[10px]">
              MWA Issued
            </Badge>
          </div>
          <span className="text-[10px] font-mono">
            until {new Date(a.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
        <div className="p-4 space-y-2">
          <p className="font-semibold">{a.headline}</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
          {a.instruction && (
            <div className="rounded border border-amber-alert/40 bg-amber-alert/10 p-3 text-sm">
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-alert mb-1">
                Precautionary / Preparedness Actions
              </p>
              <p className="whitespace-pre-wrap">{a.instruction}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground pt-1">
            <span>Areas: {a.areas.join(", ")}</span>
            <span>Issued by {a.issuer} • {new Date(a.issued_at).toLocaleString()}</span>
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
        <span className="text-[10px] font-mono">
          until {new Date(p.expires).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <p className="font-semibold">{p.headline}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
        {p.instruction && (
          <div className="rounded border border-amber-alert/40 bg-amber-alert/10 p-3 text-sm whitespace-pre-wrap">
            {p.instruction}
          </div>
        )}
        <div className="text-[10px] font-mono text-muted-foreground pt-1">
          Areas: {p.areaDesc} • Issued by {p.senderName}
        </div>
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
            <span className="font-display font-bold uppercase tracking-wider text-sm">
              {t?.name ?? a.custom_name ?? "Weather Alert"}
            </span>
            <Badge variant="outline" className="text-[10px] border-current/40">MWA</Badge>
            <span className="text-[10px] opacity-80 font-mono">
              Until {new Date(a.expires_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </span>
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
          <span className="text-[10px] opacity-80 font-mono">
            Until {new Date(p.expires).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
          </span>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-storm/70 border border-border/40 p-2">
      <p className="font-display text-2xl font-bold text-amber-alert">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 grid place-items-center min-h-[280px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Polling NWS feed…
        </p>
      </div>
    </div>
  );
}
