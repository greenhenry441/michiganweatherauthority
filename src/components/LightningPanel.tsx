export function LightningPanel() {
  // LightningMaps.org public embed centered on Michigan. Real-time strike data.
  const src = "https://map.blitzortung.org/#7/44.5/-85.0";
  return (
    <div className="rounded-2xl glass aurora-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div>
          <h3 className="font-display text-2xl tracking-tight">Live Lightning</h3>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Blitzortung real-time strikes</p>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-mono text-accent hover:underline"
        >
          Open full map →
        </a>
      </div>
      <iframe
        src={src}
        title="Live lightning strike map"
        loading="lazy"
        className="w-full h-[420px] border-0 block bg-black"
      />
    </div>
  );
}
