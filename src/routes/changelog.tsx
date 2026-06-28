import { createFileRoute, Link } from "@tanstack/react-router";
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

type Entry = {
  version: string;
  date: string;
  tag: "Major" | "Feature" | "Polish" | "Fix";
  title: string;
  bullets: string[];
};

const ENTRIES: Entry[] = [
  {
    version: "3.0",
    date: "Jun 28, 2026",
    tag: "Major",
    title: "Storm Noir redesign",
    bullets: [
      "Full visual rebuild on a black + gold editorial palette.",
      "New typography: DM Serif Display headlines paired with Fira Sans.",
      "Tightened magazine-style hierarchy across the homepage.",
      "Introduced this changelog at /changelog.",
    ],
  },
  {
    version: "2.1",
    date: "Jun 24, 2026",
    tag: "Feature",
    title: "Instatus status widget",
    bullets: [
      "Embedded live system status from mwa.instatus.com.",
      "Floating indicator surfaces incidents in real time.",
    ],
  },
  {
    version: "2.0",
    date: "Jun 20, 2026",
    tag: "Major",
    title: "Aurora Glass + advanced feature suite",
    bullets: [
      "Live Blitzortung lightning strike map.",
      "SPC severe-weather outlook (Days 1–8).",
      "Custom hourly meteogram for any Michigan city.",
      "Alert history timeline pulling 30 days of NWS data.",
    ],
  },
  {
    version: "1.4",
    date: "Jun 14, 2026",
    tag: "Feature",
    title: "Statewide alert map",
    bullets: [
      "Interactive Michigan county map shaded by active NWS alerts.",
      "Partial-county alerting and corresponding NWS color codes.",
      "Live RainViewer radar panel.",
    ],
  },
  {
    version: "1.2",
    date: "Jun 06, 2026",
    tag: "Feature",
    title: "City forecasts + air quality",
    bullets: [
      "Per-city current conditions, hourly + 7-day forecasts.",
      "Air quality (AQI) and UV index with category labels.",
    ],
  },
  {
    version: "1.0",
    date: "May 30, 2026",
    tag: "Major",
    title: "Initial launch",
    bullets: [
      "Statewide NWS alert feed for Michigan.",
      "Searchable list of every Michigan city.",
      "Installable PWA with offline-friendly shell.",
    ],
  },
];

const TAG_STYLES: Record<Entry["tag"], string> = {
  Major: "bg-accent text-accent-foreground",
  Feature: "bg-accent/20 text-accent border border-accent/40",
  Polish: "bg-muted text-muted-foreground border border-border",
  Fix: "bg-statement/20 text-statement border border-statement/40",
};

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
        <div className="mb-16">
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Release notes</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">
            What's new.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            A running record of every meaningful change to the Michigan Weather Authority — from data sources and forecast engines to design and bug fixes.
          </p>
          <div className="hairline mt-10" />
        </div>

        <ol className="space-y-14">
          {ENTRIES.map((e) => (
            <li key={e.version} className="grid md:grid-cols-[160px_1fr] gap-6 md:gap-10">
              <div className="md:text-right">
                <div className="font-display text-3xl text-foreground">v{e.version}</div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground font-mono mt-1">{e.date}</div>
                <span className={`inline-block mt-3 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] font-mono rounded ${TAG_STYLES[e.tag]}`}>
                  {e.tag}
                </span>
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
