import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, AlertTriangle, CloudLightning, Zap, Satellite,
  FileSpreadsheet, Radio, FileText, BookOpen, Wind, ThermometerSun, Camera, Cloud,
} from "lucide-react";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tools — Michigan Weather Authority" },
      { name: "description", content: "Every MWA tool: alerts map, severe outlook, lightning, satellite, storm reports, tropical, climate, webcams, and more." },
      { property: "og:title", content: "MWA Tools" },
      { property: "og:description", content: "Every Michigan Weather Authority tool in one place." },
    ],
  }),
  component: ToolsPage,
});

type Tool = {
  to: string;
  label: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const TOOLS: Tool[] = [
  { to: "/alerts-map",    label: "Active Alerts Map",  blurb: "Statewide county map shaded by every active NWS alert.",       icon: AlertTriangle, badge: "Live" },
  { to: "/outlook",       label: "SPC Severe Outlook", blurb: "Convective risk maps for Day 1, 2, 3, and the 4–8 outlook.",   icon: CloudLightning },
  { to: "/mesoscale",     label: "Mesoscale Discussions", blurb: "Short-fuse SPC MDs about developing convection.",            icon: Cloud, badge: "New" },
  { to: "/lightning",     label: "Live Lightning",     blurb: "Real-time strike map from the Blitzortung community network.", icon: Zap, badge: "Live" },
  { to: "/satellite",     label: "GOES Satellite",     blurb: "Live GOES-19 imagery — GeoColor, IR, water vapor, visible.",   icon: Satellite, badge: "Live" },
  { to: "/storm-reports", label: "Storm Reports",      blurb: "Today and yesterday's tornado, wind, and hail reports.",       icon: FileSpreadsheet },
  { to: "/tropical",      label: "Tropical Tracker",   blurb: "NHC active named systems — Atlantic & East Pacific.",          icon: Wind, badge: "New" },
  { to: "/climate",       label: "Climate & Records",  blurb: "Highs, lows, precip, snow — 12-month rolling stats.",          icon: ThermometerSun, badge: "New" },
  { to: "/webcams",       label: "Michigan Webcams",   blurb: "Live cameras: bridges, harbors, dunes, capitol.",              icon: Camera, badge: "New" },
  { to: "/forecasts",     label: "Forecast Discussion",blurb: "Raw text forecast discussions from MI NWS offices.",           icon: FileText },
  { to: "/changelog",     label: "Changelog",          blurb: "Versioned release history with status tags.",                  icon: BookOpen },
];

function ToolsPage() {
  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back to MWA
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            <Radio className="h-4 w-4" /> mwa · tools
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">All tools</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">Tools.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Every MWA tool in one place. Bookmark the ones you check daily — each works as its own page.
          </p>
          <div className="hairline mt-8" />
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <li key={t.to}>
              <Link
                to={t.to}
                className="block glass aurora-border liquid rounded-2xl p-5 h-full group"
              >
                <div className="flex items-center justify-between mb-3">
                  <t.icon className="h-6 w-6 text-accent" />
                  {t.badge && (
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent border border-accent/40 rounded-full px-2 py-0.5">
                      {t.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl mb-1.5">{t.label}</h3>
                <p className="text-sm text-muted-foreground leading-snug">{t.blurb}</p>
                <span className="mt-4 inline-block text-[11px] font-mono uppercase tracking-[0.2em] text-accent group-hover:underline">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
