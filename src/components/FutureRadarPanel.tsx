export function FutureRadarPanel() {
  // Windy embed centered on Michigan with radarRange=14 enables future radar frames.
  // No API key required for the embed.
  const src =
    "https://embed.windy.com/embed2.html?lat=44.5&lon=-85.0&zoom=6&level=surface&overlay=radar&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=14";
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">
          Future Radar · Next 2 Hours
        </h3>
        <a
          href="https://www.windy.com/?radar,44.500,-85.000,6"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-accent hover:underline"
        >
          Open in Windy →
        </a>
      </div>
      <iframe
        src={src}
        title="Michigan future radar (Windy)"
        loading="lazy"
        className="w-full h-[420px] border-0 block"
      />
    </div>
  );
}
