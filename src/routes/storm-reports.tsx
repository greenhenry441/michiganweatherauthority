import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { ToolShell } from "@/routes/alerts-map";

export const Route = createFileRoute("/storm-reports")({
  head: () => ({
    meta: [
      { title: "Storm Reports — Michigan Weather Authority" },
      { name: "description", content: "Local Storm Reports (LSRs) from NOAA SPC for today and yesterday across the Great Lakes." },
      { property: "og:title", content: "Storm Reports" },
      { property: "og:description", content: "Today and yesterday's tornado, wind, and hail reports from NOAA SPC." },
    ],
  }),
  component: StormReportsPage,
});

const DAYS = [
  { id: "today", label: "Today", path: "today" },
  { id: "yesterday", label: "Yesterday", path: "yesterday" },
];

function StormReportsPage() {
  const [day, setDay] = useState("today");
  const stamp = useMemo(() => Math.floor(Date.now() / (1000 * 60 * 15)), []);
  const path = DAYS.find((d) => d.id === day)?.path ?? "today";

  return (
    <ToolShell
      icon={<FileSpreadsheet className="h-5 w-5" />}
      eyebrow="Tool · NOAA SPC"
      title="Local storm reports"
      blurb="Tornado, severe wind, and hail reports gathered by NWS local offices and compiled by the SPC."
    >
      <div className="flex items-center gap-1 rounded-full border border-border bg-storm/60 p-1 w-fit">
        {DAYS.map((d) => (
          <button
            key={d.id}
            onClick={() => setDay(d.id)}
            className={
              "px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-full transition-colors " +
              (day === d.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <ReportCard title="All reports" src={`https://www.spc.noaa.gov/climo/reports/${path}.gif?t=${stamp}`} />
        <ReportCard title="Filtered (tor/wind/hail)" src={`https://www.spc.noaa.gov/climo/reports/${path}_filtered.gif?t=${stamp}`} />
      </div>
      <p className="text-xs text-muted-foreground">
        Reports are preliminary. Final climatology lives at{" "}
        <a className="text-accent hover:underline" href="https://www.spc.noaa.gov/climo/reports/" target="_blank" rel="noopener noreferrer">
          spc.noaa.gov/climo/reports →
        </a>
      </p>
    </ToolShell>
  );
}

function ReportCard({ title, src }: { title: string; src: string }) {
  return (
    <div className="glass aurora-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/60 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      <div className="bg-white/95 grid place-items-center">
        <img key={src} src={src} alt={title} className="w-full h-auto" referrerPolicy="no-referrer" />
      </div>
    </div>
  );
}
