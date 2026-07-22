import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getMichiganAlerts } from "@/lib/weather-api";
import { MichiganAlertMap } from "@/components/MichiganAlertMap";
import { buildCountyAlertsFromNWS, buildPolygonsFromNWS, buildCountyAlertsFromShared } from "@/lib/alert-map-data";
import { useSharedAlerts } from "@/lib/alerts-store";

export const Route = createFileRoute("/alerts-map")({
  head: () => ({
    meta: [
      { title: "Active Alerts Map — Michigan Weather Authority" },
      { name: "description", content: "Live Michigan county map shaded by every active NWS watch, warning, and advisory." },
      { property: "og:title", content: "Michigan Active Alerts Map" },
      { property: "og:description", content: "Statewide map shaded by every active NWS alert." },
    ],
  }),
  component: AlertsMapPage,
});

function AlertsMapPage() {
  const alerts = useQuery({
    queryKey: ["mi-alerts-map"],
    queryFn: getMichiganAlerts,
    refetchInterval: 60_000,
  });
  const { alerts: shared } = useSharedAlerts();
  const nwsCounty = alerts.data ? buildCountyAlertsFromNWS(alerts.data) : [];
  const sharedCounty = buildCountyAlertsFromShared(shared);
  const countyData = [...nwsCounty, ...sharedCounty];
  const polys = alerts.data ? buildPolygonsFromNWS(alerts.data) : [];
  const sharedWeather = shared.filter((a) => a.kind === "weather");
  const sharedOther = shared.filter((a) => a.kind !== "weather");
  const totalCount = (alerts.data?.length ?? 0) + shared.length;

  return (
    <ToolShell
      icon={<AlertTriangle className="h-5 w-5" />}
      eyebrow="Tool · Live"
      title="Statewide alerts map"
      blurb="Every active NWS alert plus MWA-issued alerts for Michigan, shaded onto county and polygon geometry with corresponding NWS colors."
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-3">
          <MichiganAlertMap alertsByCounty={countyData} polygons={polys} width={620} height={680} />
          <AlertLegend />
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-2xl">Active alerts ({totalCount})</h2>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Auto-refresh · every 60s
          </p>
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {sharedOther.map((a) => (
              <div key={a.id} className="glass rounded-lg p-3 border border-accent/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-accent">
                  {a.kind === "eas" ? "EAS" : "MWA Network"}
                </div>
                <div className="text-sm font-medium">{a.custom_name ?? a.headline}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{a.areas.join(", ")}</div>
              </div>
            ))}
            {sharedWeather.map((a) => (
              <div key={a.id} className="glass rounded-lg p-3 border border-amber-alert/40">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-alert">MWA Issued</div>
                <div className="text-sm font-medium">{a.custom_name ?? a.headline}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{a.areas.join(", ")}</div>
              </div>
            ))}
            {(alerts.data ?? []).map((a) => (
              <div key={a.id} className="glass rounded-lg p-3">
                <div className="text-sm font-medium">{a.properties.event}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{a.properties.areaDesc}</div>
              </div>
            ))}
            {totalCount === 0 && (
              <div className="text-sm text-muted-foreground italic">No active alerts statewide.</div>
            )}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

const LEGEND_ITEMS: { label: string; swatch: string; desc: string }[] = [
  { label: "Extreme / Emergency", swatch: "bg-severe", desc: "Tornado Emergency, Flash Flood Emergency, Blizzard — take shelter now." },
  { label: "Warning", swatch: "bg-warning", desc: "Hazard is imminent or occurring in the alerted area." },
  { label: "Watch", swatch: "bg-watch", desc: "Conditions are favorable for the hazard to develop — stay aware." },
  { label: "Advisory", swatch: "bg-advisory", desc: "Less serious than a warning but still worth planning around." },
  { label: "Statement / Special", swatch: "bg-statement", desc: "Informational updates, SPS, or non-precipitation advisories." },
  { label: "MWA Issued", swatch: "bg-amber-alert", desc: "Weather alerts issued from the MWA Command console." },
  { label: "EAS / Network", swatch: "bg-accent", desc: "Emergency Alert System or MWA Network broadcast (not weather)." },
];

function AlertLegend() {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">Alert legend</h3>
        <span className="text-[10px] font-mono text-muted-foreground">Hover a swatch for details</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map((it) => (
          <li key={it.label} className="flex items-start gap-2 text-xs" title={it.desc}>
            <span className={`mt-0.5 h-3 w-3 rounded-sm shrink-0 ${it.swatch}`} aria-hidden />
            <div className="min-w-0">
              <div className="font-medium">{it.label}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">{it.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ToolShell({ icon, eyebrow, title, blurb, children }: {
  icon: React.ReactNode; eyebrow: string; title: string; blurb: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back to MWA
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            {icon} {eyebrow}
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.95] text-aurora">{title}</h1>
          <p className="mt-4 text-base text-muted-foreground max-w-2xl">{blurb}</p>
          <div className="hairline mt-8" />
        </div>
        {children}
      </main>
    </div>
  );
}
