export function RadarPanel() {
  // Embedded RainViewer radar centered on Michigan.
  // Public embed — no API key required.
  const src =
    "https://www.rainviewer.com/map.html?loc=44.5,-85.0,6&oC2=1&oU=0&oCS=1&oF=0&c=3&o=83&lm=1&layer=radar&sm=1&sn=1";
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="font-display tracking-wider text-[11px] uppercase text-muted-foreground">
          Live Radar · Michigan
        </h3>
        <a
          href="https://radar.weather.gov/region/great_lakes/standard"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-accent hover:underline"
        >
          NWS Radar →
        </a>
      </div>
      <iframe
        src={src}
        title="Michigan live radar"
        loading="lazy"
        className="w-full h-[420px] border-0 block"
      />
    </div>
  );
}
