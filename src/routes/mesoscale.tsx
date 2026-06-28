import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, ExternalLink, Cloud } from "lucide-react";

export const Route = createFileRoute("/mesoscale")({
  head: () => ({
    meta: [
      { title: "SPC Mesoscale Discussions — MWA" },
      { name: "description", content: "Live Storm Prediction Center mesoscale discussions and convective trends." },
      { property: "og:title", content: "SPC Mesoscale Discussions" },
      { property: "og:description", content: "MDs covering active convective threats across CONUS." },
    ],
  }),
  component: MesoPage,
});

const QUICK_LINKS = [
  { label: "All active MDs", url: "https://www.spc.noaa.gov/products/md/" },
  { label: "MD archive (today)", url: "https://www.spc.noaa.gov/products/md/?day=today" },
  { label: "Convective outlook", url: "https://www.spc.noaa.gov/products/outlook/" },
  { label: "Mesoscale analysis", url: "https://www.spc.noaa.gov/exper/mesoanalysis/" },
  { label: "Storm reports", url: "https://www.spc.noaa.gov/climo/reports/today.html" },
];

function MesoPage() {
  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-mono inline-flex items-center gap-2">
            <Cloud className="h-4 w-4" /> spc · mesoscale
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono mb-4">Mesoscale</p>
          <h1 className="font-display text-6xl md:text-7xl leading-[0.95] text-aurora">SPC Mesoscale Discussions.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Real-time MDs from the Storm Prediction Center — short-fuse forecasts about active or developing convection, winter weather, and fire weather.
          </p>
          <div className="hairline mt-8" />
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map((q) => (
            <li key={q.url}>
              <a
                href={q.url} target="_blank" rel="noreferrer"
                className="block glass aurora-border liquid rounded-2xl p-5 h-full group hover:translate-y-[-2px] transition-transform"
              >
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-6 w-6 text-accent" />
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                </div>
                <h3 className="font-display text-xl mb-1.5">{q.label}</h3>
                <p className="text-[11px] font-mono text-muted-foreground break-all">{q.url.replace(/^https?:\/\//, "")}</p>
              </a>
            </li>
          ))}
        </ul>

        <section className="glass liquid rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-display tracking-wider text-sm uppercase">Live SPC MD page</h2>
            <a href="https://www.spc.noaa.gov/products/md/" target="_blank" rel="noreferrer" className="text-[11px] font-mono uppercase text-accent hover:underline inline-flex items-center gap-1">
              Open full <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe
            src="https://www.spc.noaa.gov/products/md/"
            title="SPC Mesoscale Discussions"
            className="w-full h-[720px] bg-background"
          />
        </section>
      </main>
    </div>
  );
}
