import { useEffect, useMemo, useState } from "react";

const DAYS = [
  { day: 1, label: "Day 1" },
  { day: 2, label: "Day 2" },
  { day: 3, label: "Day 3" },
  { day: 4, label: "Days 4-8" },
];

// SPC publishes several outlook products per day. Day 1/2/3 each have a
// "categorical" GIF that is the canonical convective outlook map. The
// extended outlook (Days 4-8) is a probability GIF. We provide a fallback
// chain because SPC occasionally has the new issuance staged before the
// canonical filename refreshes; if the primary 404s, we swap to the
// "1200otlk" timed image (Day 1's 12Z issuance), the static `otlk` image,
// or the experimental folder.
function spcSources(day: number): string[] {
  const stamp = Math.floor(Date.now() / (1000 * 60 * 30));
  if (day === 1) {
    return [
      `https://www.spc.noaa.gov/products/outlook/day1otlk.gif?t=${stamp}`,
      `https://www.spc.noaa.gov/products/outlook/day1otlk_1300.gif?t=${stamp}`,
      `https://www.spc.noaa.gov/products/outlook/day1otlk_1200.gif?t=${stamp}`,
    ];
  }
  if (day === 2) {
    return [
      `https://www.spc.noaa.gov/products/outlook/day2otlk.gif?t=${stamp}`,
      `https://www.spc.noaa.gov/products/outlook/day2otlk_0600.gif?t=${stamp}`,
      `https://www.spc.noaa.gov/products/outlook/day2otlk_1730.gif?t=${stamp}`,
    ];
  }
  if (day === 3) {
    return [
      `https://www.spc.noaa.gov/products/outlook/day3otlk.gif?t=${stamp}`,
      `https://www.spc.noaa.gov/products/outlook/day3otlk_0730.gif?t=${stamp}`,
    ];
  }
  return [
    `https://www.spc.noaa.gov/products/exper/day4-8/day48prob.gif?t=${stamp}`,
    `https://www.spc.noaa.gov/products/exper/day4-8/day48probotlk_0700.gif?t=${stamp}`,
  ];
}

const SPC_SITE = (day: number) =>
  day <= 3
    ? `https://www.spc.noaa.gov/products/outlook/day${day}otlk.html`
    : `https://www.spc.noaa.gov/products/exper/day4-8/`;

export function SevereOutlookPanel() {
  const [day, setDay] = useState(1);
  const sources = useMemo(() => spcSources(day), [day]);
  const [idx, setIdx] = useState(0);
  // Reset the fallback chain whenever the active day changes.
  useEffect(() => { setIdx(0); }, [day]);
  const src = sources[idx] ?? sources[0];

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
      <div className="rounded-xl overflow-hidden border border-border bg-white/95 grid place-items-center min-h-[280px]">
        <img
          key={src}
          src={src}
          alt={`SPC Day ${day} severe weather outlook`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-auto max-h-[480px] object-contain"
          onError={() => {
            if (idx < sources.length - 1) setIdx(idx + 1);
          }}
        />
        {idx === sources.length - 1 && (
          <noscript>
            <a href={SPC_SITE(day)} className="text-xs text-accent">View on SPC site</a>
          </noscript>
        )}
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
          href={SPC_SITE(day)}
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
