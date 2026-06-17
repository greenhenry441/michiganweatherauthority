import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Cloud, Wind, Droplets, Eye, Gauge, AlertTriangle, Heart, Share2, MapPin, Zap, Waves, Thermometer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogIn, UserCircle2, FileText } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getActiveAlerts, getCityWeather, getExtraStats } from "@/lib/weather.functions";
import { supabase } from "@/integrations/supabase/client";
import { MICHIGAN_CITIES } from "@/lib/michigan-cities";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Michigan Weather Authority" },
      { name: "description", content: "Live weather, forecasts, and alerts for every city in Michigan." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const router = useRouter();
  const nav = useNavigate();
  const [city, setCity] = useState<(typeof MICHIGAN_CITIES)[0]>(MICHIGAN_CITIES[0]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [t, setT] = useState(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return MICHIGAN_CITIES.filter((c) => (c.name + " " + c.county + " " + c.zip).toLowerCase().includes(q)).slice(0, 8);
  }, [search]);

  const weather = useQuery({
    queryKey: ["weather", city.lat, city.lon],
    queryFn: () => getCityWeather(city.lat, city.lon),
    staleTime: 300000,
  });

  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getActiveAlerts(),
    staleTime: 300000,
  });

  const extraStats = useQuery({
    queryKey: ["extra", city.lat, city.lon],
    queryFn: () => getExtraStats(city.lat, city.lon),
    staleTime: 300000,
  });

  const w = weather.data;
  const es = extraStats.data;

  const conditions: Record<string, string> = {
    "clear sky": "Clear",
    "few clouds": "Mostly Clear",
    "scattered clouds": "Partly Cloudy",
    "broken clouds": "Cloudy",
    "shower rain": "Showers",
    rain: "Rainy",
    thunderstorm: "Thunderstorms",
    snow: "Snow",
    mist: "Mist",
  };

  const desc = w?.weather?.[0]?.main || "—";
  const condLabel = conditions[desc.toLowerCase()] || desc;

  const temp = w?.main?.temp ? Math.round(w.main.temp) : "—";
  const feelsLike = w?.main?.feels_like ? Math.round(w.main.feels_like) : "—";
  const humidity = w?.main?.humidity ?? "—";
  const windSpeed = w?.wind?.speed ? Math.round(w.wind.speed * 2.237) : "—";
  const visibility = w?.visibility ? Math.round((w.visibility / 1609.34) * 10) / 10 : "—";
  const pressure = w?.main?.pressure ?? "—";
  const uvIndex = es?.uvi ?? "—";
  const dewpoint = es?.dew_point ? Math.round(es.dew_point) : "—";
  const visibility_pct = es ? Math.round((1 - es.clouds / 100) * 100) : "—";

  const severity: Record<string, number> = {
    extreme: 4,
    severe: 3,
    moderate: 2,
    minor: 1,
  };

  const relatedAlerts = (alerts.data || []).filter(
    (a) =>
      a.polygons?.some(
        (p) =>
          p.features?.some((f) => {
            const coords = f.geometry?.coordinates?.[0]?.[0];
            if (!Array.isArray(coords) || coords.length < 2) return false;
            const [lon, lat] = coords;
            const dist = Math.sqrt((lat - city.lat) ** 2 + (lon - city.lon) ** 2);
            return dist < 0.5;
          }),
      ),
  );

  const maxSeverity = relatedAlerts.length > 0 ? Math.max(...relatedAlerts.map((a) => severity[a.properties.severity] || 0)) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.1),rgba(59,130,246,0))]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-accent/10 border border-accent/40 grid place-items-center">
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <span className="font-display font-bold text-accent">MWA</span>
          </div>

          <nav className="flex items-center gap-6 text-foreground">
            <Link to="/forecasts" className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-accent hover:opacity-80">
              <FileText className="h-3.5 w-3.5" /> Forecasts
            </Link>
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
              {relatedAlerts.length > 0 ? (
                <span>
                  {relatedAlerts.length} {relatedAlerts.length === 1 ? "alert" : "alerts"}
                </span>
              ) : (
                <span>All clear</span>
              )}
            </div>
          </nav>
        </header>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Search Michigan cities…"
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 text-sm"
          />
          {showSearch && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg divide-y divide-border max-h-64 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.zip}
                  onClick={() => {
                    setCity(c);
                    setSearch("");
                    setShowSearch(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent/10 flex justify-between items-center"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {c.county} · {c.zip}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-border bg-card/50 backdrop-blur p-8 space-y-6 shadow-glow">
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h1 className="font-display text-5xl font-bold text-foreground tracking-tight">{temp}°</h1>
                  {relatedAlerts.length > 0 && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${maxSeverity >= 4 ? "bg-red-500/10 border border-red-500/50 text-red-400" : maxSeverity >= 3 ? "bg-orange-500/10 border border-orange-500/50 text-orange-400" : "bg-yellow-500/10 border border-yellow-500/50 text-yellow-400"}`}>
                      <AlertTriangle className="h-3 w-3" />
                      Alert
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">{city.name}, {city.county}</p>
              </div>

              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-accent" />
                  {condLabel}
                </p>
                <p className="text-[13px] text-muted-foreground">Feels like {feelsLike}°</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Wind</p>
                  <p className="text-lg font-semibold text-foreground">{windSpeed} mph</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Humidity</p>
                  <p className="text-lg font-semibold text-foreground">{humidity}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Visibility</p>
                  <p className="text-lg font-semibold text-foreground">{visibility} mi</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 space-y-4 shadow-glow">
              <h3 className="font-display text-sm uppercase tracking-wider text-accent">More Details</h3>
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Gauge className="h-3.5 w-3.5" /> Pressure
                  </span>
                  <span className="font-semibold text-foreground">{pressure} mb</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Droplets className="h-3.5 w-3.5" /> Dewpoint
                  </span>
                  <span className="font-semibold text-foreground">{dewpoint}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" /> UV Index
                  </span>
                  <span className="font-semibold text-foreground">{uvIndex}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" /> Clear
                  </span>
                  <span className="font-semibold text-foreground">{visibility_pct}%</span>
                </div>
              </div>
            </div>
          </div>

          {relatedAlerts.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-8 space-y-4 shadow-glow">
              <h2 className="font-display text-lg uppercase tracking-wider text-accent flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active {relatedAlerts.length === 1 ? "Alert" : "Alerts"}
              </h2>
              <div className="space-y-3">
                {relatedAlerts.map((alert, i) => (
                  <div key={i} className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-foreground text-sm">{alert.properties.event}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono uppercase">
                          {alert.properties.severity}
                        </p>
                      </div>
                      <a
                        href={alert.properties.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-accent hover:opacity-70 px-2 py-1 rounded border border-accent/30"
                      >
                        Details
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{alert.properties.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toaster />
    </div>
  );
}
