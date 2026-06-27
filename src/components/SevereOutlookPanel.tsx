import { useState } from "react";

const DAYS = [
  { day: 1, label: "Day 1" },
  { day: 2, label: "Day 2" },
  { day: 3, label: "Day 3" },
  { day: 4, label: "Days 4-8" },
];

export function SevereOutlookPanel() {
  const [day, setDay] = useState(1);
  const src =
    day <= 3
      ? `https://www.spc.noaa.gov/products/outlook/day${day}otlk.gif`
      : `https://www.spc.noaa.gov/products/exper/day4-8/day48prob.gif`;
  return (
    <div className="rounded-2xl glass aurora-border p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-2xl tracking-tight">SPC Severe Outlook</h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Storm Prediction Center · convective risk
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-storm/60 p-1">
          {DAYS.map((d) => (
            <button
              key={d.day}
              onClick={() => setDay(d.day)}
              className={
                "px-3 py-1 text-[11px] font-mono uppercase tracking-wider rounded-full transition-colors " +
                (day === d.day ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
              }
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-border bg-white/95 grid place-items-center">
        <img
          src={src}
          alt={`SPC Day ${day} severe weather outlook`}
          loading="lazy"
          className="w-full h-auto max-h-[480px] object-contain"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground">
        <Legend color="#80c580" label="TSTM" />
        <Legend color="#c5a393" label="MRGL" />
        <Legend color="#f7f779" label="SLGT" />
        <Legend color="#e6c27a" label="ENH" />
        <Legend color="#ff7f7f" label="MDT" />
        <Legend color="#ff80ff" label="HIGH" />
        <a
          className="ml-auto text-accent hover:underline"
          href="https://www.spc.noaa.gov/products/outlook/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SPC site →
        </a>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded-sm border border-black/30" style={{ background: color }} /> {label}
    </span>
  );
}
