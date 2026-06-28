import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Satellite } from "lucide-react";
import { ToolShell } from "@/routes/alerts-map";

export const Route = createFileRoute("/satellite")({
  head: () => ({
    meta: [
      { title: "GOES Satellite — Michigan Weather Authority" },
      { name: "description", content: "Live GOES-East satellite imagery over Michigan and the Great Lakes from NOAA STAR." },
      { property: "og:title", content: "GOES Satellite over Michigan" },
      { property: "og:description", content: "Live satellite imagery from NOAA STAR." },
    ],
  }),
  component: SatellitePage,
});

const CHANNELS = [
  { id: "GEOCOLOR", label: "GeoColor (day/night)" },
  { id: "13", label: "Clean IR (Band 13)" },
  { id: "08", label: "Mid-level WV (Band 8)" },
  { id: "02", label: "Visible (Band 2)" },
  { id: "AirMass", label: "Air Mass RGB" },
];

function urlFor(channel: string) {
  // NOAA STAR GOES-East UMV (Upper Mississippi Valley) sector covers Michigan.
  const stamp = Math.floor(Date.now() / (1000 * 60 * 5));
  return `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/umv/${channel}/1200x1200.jpg?t=${stamp}`;
}

function SatellitePage() {
  const [channel, setChannel] = useState("GEOCOLOR");
  const src = useMemo(() => urlFor(channel), [channel]);
  return (
    <ToolShell
      icon={<Satellite className="h-5 w-5" />}
      eyebrow="Tool · NOAA STAR"
      title="GOES-East satellite"
      blurb="Live GOES-19 satellite imagery for the Upper Mississippi Valley sector — covers all of Michigan and the Great Lakes. Refreshes every 5 minutes."
    >
      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-storm/60 p-1 w-fit">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChannel(c.id)}
            className={
              "px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-full transition-colors " +
              (channel === c.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="glass aurora-border rounded-2xl overflow-hidden">
        <img
          key={src}
          src={src}
          alt={`GOES-East ${channel} over Michigan`}
          className="w-full h-auto"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Imagery courtesy NOAA NESDIS STAR.{" "}
        <a className="text-accent hover:underline" href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=umv" target="_blank" rel="noopener noreferrer">
          Open full viewer →
        </a>
      </p>
    </ToolShell>
  );
}
