import phosphorousLogo from "@/assets/phosphorous.png.asset.json";

/**
 * Ownership badge — Michigan Weather Service is a phosphorous company.
 * The wordmark is black artwork, so it is inverted in dark mode.
 */
export function PhosphorousBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://phosphorous.surge.sh/index.html"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-accent transition-colors ${className}`}
      aria-label="Michigan Weather Service by phosphorous"
    >
      <span className="font-mono uppercase tracking-[0.2em] text-[10px]">by</span>
      <img
        src={phosphorousLogo.url}
        alt="phosphorous"
        className="h-4 w-auto object-contain dark:invert opacity-80"
        loading="lazy"
      />
    </a>
  );
}
