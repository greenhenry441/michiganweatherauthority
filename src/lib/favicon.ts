import type { ThemeName, ThemeMode } from "./theme";

// Color per (theme, mode) — bright enough to read on browser tab bars.
const COLORS: Record<ThemeName, { dark: string; light: string }> = {
  prism:   { dark: "#A78BFA", light: "#7C3AED" }, // iridescent violet
  noir:    { dark: "#FACC15", light: "#B45309" }, // gold
  aurora:  { dark: "#5EEAD4", light: "#0F766E" }, // teal
  og:      { dark: "#60A5FA", light: "#1D4ED8" }, // storm blue
  minimal: { dark: "#FAFAFA", light: "#0A0A0A" }, // monochrome inversion
};

// Default mark — storm bolt inside a shield (noir / aurora / og)
function boltSvg(color: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <path d='M32 3 L57 13 V31 C57 46 46 56 32 61 C18 56 7 46 7 31 V13 Z'
      fill='none' stroke='${color}' stroke-width='4' stroke-linejoin='round'/>
    <path d='M35 16 L20 36 H30 L27 50 L44 28 H34 Z'
      fill='${color}'/>
  </svg>`;
}

// Minimal mark — clean geometric monogram (thin ring + offset dot).
// Distinct shape per mode so the dark- and light-mode favicons are visibly different.
function minimalSvg(color: string, mode: ThemeMode): string {
  if (mode === "dark") {
    // Outlined ring with filled dot — dark-mode mark
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
      <rect x='2' y='2' width='60' height='60' rx='14' fill='none' stroke='${color}' stroke-width='3'/>
      <circle cx='32' cy='32' r='10' fill='${color}'/>
    </svg>`;
  }
  // Filled square with knockout dot — light-mode mark (inverted weight)
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect x='2' y='2' width='60' height='60' rx='14' fill='${color}'/>
    <circle cx='32' cy='32' r='10' fill='#ffffff'/>
  </svg>`;
}

function svgFor(theme: ThemeName, mode: ThemeMode, color: string): string {
  if (theme === "minimal") return minimalSvg(color, mode);
  return boltSvg(color);
}

function dataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function updateFavicon(theme: ThemeName, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const color = COLORS[theme]?.[mode] ?? "#60A5FA";
  const href = dataUrl(svgFor(theme, mode, color));

  document
    .querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']")
    .forEach((el) => el.parentNode?.removeChild(el));

  const add = (rel: string) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = "image/svg+xml";
    link.href = href;
    document.head.appendChild(link);
  };
  add("icon");
  add("shortcut icon");
  add("apple-touch-icon");
}
