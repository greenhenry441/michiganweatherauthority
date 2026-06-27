import { useMemo } from "react";
import type { ForecastPeriod } from "@/lib/weather-api";

interface Props {
  periods: ForecastPeriod[];
  hours?: number;
}

export function HourlyMeteogram({ periods, hours = 36 }: Props) {
  const data = useMemo(() => periods.slice(0, hours), [periods, hours]);
  if (data.length < 2) return null;

  const W = 880;
  const H = 220;
  const PAD = { l: 36, r: 12, t: 16, b: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const temps = data.map((p) => p.temperature);
  const tMin = Math.min(...temps) - 4;
  const tMax = Math.max(...temps) + 4;

  const x = (i: number) => PAD.l + (i / (data.length - 1)) * innerW;
  const y = (t: number) => PAD.t + (1 - (t - tMin) / (tMax - tMin)) * innerH;

  const linePath = data.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.temperature)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${PAD.t + innerH} L ${x(0)} ${PAD.t + innerH} Z`;

  // y-axis ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => tMin + ((tMax - tMin) * i) / ticks);

  return (
    <div className="rounded-2xl glass aurora-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-2xl tracking-tight">Hourly Meteogram</h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Next {data.length} hours · temp & precip</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-cyan-glow" /> Temp °F</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-violet-glow/70" /> Precip %</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] h-[220px]" role="img" aria-label="Hourly meteogram">
          <defs>
            <linearGradient id="meteo-temp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.16 200)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(0.85 0.16 200)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="meteo-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.88 0.16 200)" />
              <stop offset="100%" stopColor="oklch(0.78 0.20 320)" />
            </linearGradient>
          </defs>

          {/* gridlines + y labels */}
          {tickVals.map((tv, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(tv)} y2={y(tv)} stroke="oklch(0.96 0.02 250 / 0.08)" />
              <text x={PAD.l - 6} y={y(tv) + 3} textAnchor="end" fontSize="9" fill="oklch(0.72 0.04 260)" fontFamily="JetBrains Mono, monospace">{Math.round(tv)}°</text>
            </g>
          ))}

          {/* precip bars */}
          {data.map((p, i) => {
            const pop = p.probabilityOfPrecipitation?.value ?? 0;
            if (!pop) return null;
            const bw = innerW / data.length * 0.55;
            const bh = (pop / 100) * innerH * 0.5;
            return (
              <rect
                key={`b-${i}`}
                x={x(i) - bw / 2}
                y={PAD.t + innerH - bh}
                width={bw}
                height={bh}
                fill="oklch(0.75 0.18 305)"
                opacity={0.55}
                rx={1.5}
              />
            );
          })}

          {/* temp area + line */}
          <path d={areaPath} fill="url(#meteo-temp)" />
          <path d={linePath} fill="none" stroke="url(#meteo-line)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((p, i) =>
            i % 3 === 0 ? (
              <g key={`pt-${i}`}>
                <circle cx={x(i)} cy={y(p.temperature)} r="2.5" fill="oklch(0.95 0.02 250)" />
                <text x={x(i)} y={y(p.temperature) - 8} textAnchor="middle" fontSize="9" fill="oklch(0.96 0.01 250)" fontFamily="JetBrains Mono, monospace">{Math.round(p.temperature)}°</text>
              </g>
            ) : null,
          )}

          {/* x labels */}
          {data.map((p, i) =>
            i % 3 === 0 ? (
              <text key={`x-${i}`} x={x(i)} y={H - 16} textAnchor="middle" fontSize="9" fill="oklch(0.72 0.04 260)" fontFamily="JetBrains Mono, monospace">
                {new Date(p.startTime).toLocaleTimeString([], { hour: "numeric" })}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
