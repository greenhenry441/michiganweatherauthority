import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Michigan Weather Authority" },
      { name: "description", content: "Release notes and version history for the Michigan Weather Authority." },
      { property: "og:title", content: "MWA Changelog" },
      { property: "og:description", content: "What's new at Michigan Weather Authority." },
    ],
  }),
  component: ChangelogPage,
});

type StatusId =
  | "revamp" | "major" | "minor" | "patch" | "emergency"
  | "pre-release" | "pre-alpha" | "alpha" | "open-beta" | "closed-beta"
  | "rc" | "stable" | "lts" | "lts-patch" | "eol";

type Status = { id: StatusId; label: string; desc: string; cls: string };

const STATUSES: Status[] = [
  { id: "revamp",      label: "Revamp",            desc: "Full visual or architectural rewrite of an area",         cls: "bg-violet-glow/20 text-violet-glow border border-violet-glow/40" },
  { id: "major",       label: "Major",             desc: "Breaking changes — review before upgrading",              cls: "bg-severe text-white" },
  { id: "minor",       label: "Minor",             desc: "New features, fully backwards compatible",                cls: "bg-accent text-accent-foreground" },
  { id: "patch",       label: "Patch",             desc: "Bug fixes and small polish, no new features",             cls: "bg-muted text-muted-foreground border border-border" },
  { id: "emergency",   label: "Emergency Update",  desc: "Hot-shipped fix for a critical or security issue",        cls: "bg-destructive text-destructive-foreground alert-pulse" },
  { id: "pre-release", label: "Pre-Release",       desc: "Shipped before general availability — expect rough edges", cls: "bg-warning text-white" },
  { id: "pre-alpha",   label: "Pre-Alpha",         desc: "Earliest internal builds, things will break",             cls: "bg-statement/30 text-statement border border-statement/50" },
  { id: "alpha",       label: "Alpha",             desc: "Feature-incomplete preview for early testers",            cls: "bg-statement/50 text-white" },
  { id: "open-beta",   label: "Open-Beta",         desc: "Public beta, anyone can opt in",                          cls: "bg-watch text-black" },
  { id: "closed-beta", label: "Closed-Beta",       desc: "Beta limited to invited testers and design partners",     cls: "bg-watch/40 text-watch border border-watch/60" },
  { id: "rc",          label: "Release Candidate", desc: "Final candidate — shipping unless we find regressions",   cls: "bg-advisory text-black" },
  { id: "stable",      label: "Stable",            desc: "Generally available, recommended for everyone",           cls: "bg-accent/20 text-accent border border-accent/50" },
  { id: "lts",         label: "LTS",               desc: "Long-term support — extended maintenance window",         cls: "bg-cyan-glow/20 text-cyan-glow border border-cyan-glow/40" },
  { id: "lts-patch",   label: "LTS Patch",         desc: "Maintenance or security-only update for an LTS version",  cls: "bg-cyan-glow/10 text-cyan-glow border border-cyan-glow/30" },
  { id: "eol",         label: "EOL",               desc: "End of life — no longer supported, please upgrade",       cls: "bg-foreground/10 text-muted-foreground border border-border line-through" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<StatusId, Status>;

type Entry = {
  version: string;
  date: string;
  status: StatusId;
  title: string;
  bullets: string[];
};

const ENTRIES: Entry[] = [
  {
    version: "3.3.0",
    date: "Jun 28, 2026",
    status: "open-beta",
    title: "Tool pages + expanded preferences",
    bullets: [
      "Spun off Active Alerts Map, SPC Severe Outlook, and Live Lightning into dedicated pages.",
      "Added /satellite — GOES-19 GeoColor, IR, water vapor, visible loops.",
      "Added /storm-reports — SPC LSRs for today and yesterday (all / filtered).",
      "Added /tools — single hub linking every MWA tool.",
      "New Preferences submenu in Settings: temp/wind/pressure units, 12/24-hour clock, density, ticker speed, auto-refresh interval, reduced motion, and per-panel toggles for the home page.",
      "Rollout: Open-Beta now → Release Candidate on Jun 29, 2026 → Stable on Jul 1, 2026.",
    ],
  },
  {
    version: "3.2.0",
    date: "Jun 28, 2026",
    status: "minor",
    title: "Liquid Glass surfaces + SPC outlook fix",
    bullets: [
      "Refined every panel onto a Liquid Glass surface: deeper translucency, top-edge sheen, soft accent glow at the base.",
      "Stronger backdrop blur and saturation so colors behind the glass bleed through as light.",
      "Fixed the SPC Severe Outlook tabs — Day 1, Day 2, and Day 3 now load correctly with cache-busted images.",
    ],
  },
  {
    version: "3.1.0",
    date: "Jun 28, 2026",
    status: "minor",
    title: "Theming engine + new logo",
    bullets: [
      "Appearance submenu in Settings: switch between Storm Noir, Aurora Glass, and OG Storm Blue.",
      "Light/dark mode toggle across every theme, persisted per device.",
      "Refreshed art-deco mitten + bolt logo for the Storm Noir era.",
      "Header reads STORM NOIR to reflect the active design.",
    ],
  },
  {
    version: "3.0.0",
    date: "Jun 28, 2026",
    status: "revamp",
    title: "Storm Noir redesign",
    bullets: [
      "Full visual rebuild on a black + gold editorial palette.",
      "New typography: DM Serif Display headlines paired with Fira Sans.",
      "Tightened magazine-style hierarchy across the homepage.",
      "Introduced this changelog at /changelog with full SemVer + release-status tagging.",
    ],
  },
  {
    version: "2.1.0",
    date: "Jun 24, 2026",
    status: "minor",
    title: "Instatus status widget",
    bullets: [
      "Embedded live system status from mwa.instatus.com.",
      "Floating indicator surfaces incidents in real time.",
    ],
  },
  {
    version: "2.0.0",
    date: "Jun 20, 2026",
    status: "major",
    title: "Aurora Glass + advanced feature suite",
    bullets: [
      "Live Blitzortung lightning strike map.",
      "SPC severe-weather outlook (Days 1–8).",
      "Custom hourly meteogram for any Michigan city.",
      "Alert history timeline pulling 30 days of NWS data.",
    ],
  },
  {
    version: "1.4.0",
    date: "Jun 14, 2026",
    status: "minor",
    title: "Statewide alert map",
    bullets: [
      "Interactive Michigan county map shaded by active NWS alerts.",
      "Partial-county alerting and corresponding NWS color codes.",
      "Live RainViewer radar panel.",
    ],
  },
  {
    version: "1.2.0",
    date: "Jun 06, 2026",
    status: "eol",
    title: "City forecasts + air quality",
    bullets: [
      "Per-city current conditions, hourly + 7-day forecasts.",
      "Air quality (AQI) and UV index with category labels.",
      "End-of-life: superseded by 1.4.0+. Please upgrade.",
    ],
  },
  {
    version: "1.1.1",
    date: "Jun 01, 2026",
    status: "eol",
    title: "Stability polish",
    bullets: [
      "Fixed alert ticker pausing under low-power mode.",
      "Tightened map county hit-areas on mobile.",
      "End-of-life: superseded by 1.4.0+. Please upgrade.",
    ],
  },
  {
    version: "1.0.0",
    date: "May 30, 2026",
    status: "eol",
    title: "Initial launch",
    bullets: [
      "Statewide NWS alert feed for Michigan.",
      "Searchable list of every Michigan city.",
      "Installable PWA with offline-friendly shell.",
      "End-of-life: superseded by 1.4.0+. Please upgrade.",
    ],
  },
];

// Versions <1.4.0 are EOL. 3.3.0 follows a rollout schedule:
//   open-beta → Jun 29, 2026 release candidate → Jul 1, 2026 stable.
function effectiveStatus(e: Entry, now: Date): StatusId {
  if (e.version === "3.3.0") {
    const rc = new Date(2026, 5, 29); // Jun 29, 2026 local
    const stable = new Date(2026, 6, 1); // Jul 1, 2026 local
    if (now >= stable) return "stable";
    if (now >= rc) return "rc";
    return "open-beta";
  }
  return e.status;
}

function StatusChip({ id, className = "" }: { id: StatusId; className?: string }) {
  const s = STATUS_MAP[id];
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] font-mono rounded ${s.cls} ${className}`}>
      {s.label}
    </span>
  );
}

function ChangelogPage() {
  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to MWA
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono">
            mwa · changelog
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Release notes</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">
            What's new.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Versioned with{" "}
            <a href="https://semver.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              SemVer
            </a>{" "}
            (<span className="font-mono">Major.Minor.Patch</span>). Every release is tagged with a status so you know what to expect before upgrading.
          </p>
          <div className="hairline mt-10" />
        </div>

        <section className="mb-14 glass aurora-border rounded-lg p-6">
          <h2 className="font-display text-2xl mb-1">Release statuses</h2>
          <p className="text-xs text-muted-foreground mb-5 font-mono uppercase tracking-wider">
            Legend
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {STATUSES.map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                <StatusChip id={s.id} className="mt-0.5 shrink-0" />
                <span className="text-sm text-foreground/80">{s.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <ol className="space-y-14">
          {ENTRIES.map((e) => (
            <li key={e.version} className="grid md:grid-cols-[160px_1fr] gap-6 md:gap-10">
              <div className="md:text-right">
                <div className="font-display text-3xl text-foreground">v{e.version}</div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-mono mt-1">{e.date}</div>
                <div className="mt-3">
                  <StatusChip id={e.status} />
                </div>
              </div>
              <article className="glass aurora-border rounded-lg p-6">
                <h2 className="font-display text-2xl mb-3">{e.title}</h2>
                <ul className="space-y-2 text-sm text-foreground/85">
                  {e.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-accent mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-20 text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-mono">
          — end of transmission —
        </div>
      </main>

      <footer className="border-t border-border/60 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-4 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>© Michigan Weather Authority — Unofficial.</span>
          <a href="https://mwa.instatus.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Status Page
          </a>
        </div>
      </footer>
    </div>
  );
}
