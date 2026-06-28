import type { ThemeName, ThemeMode } from "./theme";

// Color per (theme, mode) — bright enough to read on browser tab bars.
const COLORS: Record<ThemeName, { dark: string; light: string }> = {
  noir:   { dark: "#FACC15", light: "#B45309" }, // gold
  aurora: { dark: "#5EEAD4", light: "#0F766E" }, // teal
  og:     { dark: "#60A5FA", light: "#1D4ED8" }, // storm blue
};

function svg(color: string): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <path d='M32 3 L57 13 V31 C57 46 46 56 32 61 C18 56 7 46 7 31 V13 Z'
      fill='none' stroke='${color}' stroke-width='4' stroke-linejoin='round'/>
    <path d='M35 16 L20 36 H30 L27 50 L44 28 H34 Z'
      fill='${color}'/>
  </svg>`;
}

function dataUrl(color: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg(color))}`;
}

export function updateFavicon(theme: ThemeName, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const color = COLORS[theme]?.[mode] ?? "#60A5FA";
  const href = dataUrl(color);

  // Remove existing icon links
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
