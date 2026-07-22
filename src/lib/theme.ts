export type ThemeName = "prism" | "noir" | "aurora" | "og" | "minimal";
export type ThemeMode = "dark" | "light";

const THEME_KEY = "mwa-theme";
const MODE_KEY = "mwa-mode";

export const THEMES: { id: ThemeName; label: string; desc: string }[] = [
  { id: "prism", label: "Prism", desc: "Modern iridescent — Space Grotesk + Inter" },
  { id: "noir", label: "Storm Noir", desc: "Black + gold editorial broadcast" },
  { id: "aurora", label: "Aurora Glass", desc: "Midnight glass with teal/violet aurora" },
  { id: "og", label: "OG Storm Blue", desc: "Original deep blue weather console" },
  { id: "minimal", label: "Minimal", desc: "Modern monochrome with Inter typography" },
];

export const MODES: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

const VALID: ThemeName[] = ["prism", "noir", "aurora", "og", "minimal"];

export function getTheme(): ThemeName {
  if (typeof window === "undefined") return "prism";
  const v = window.localStorage.getItem(THEME_KEY) as ThemeName | null;
  return v && VALID.includes(v) ? v : "prism";
}

export function getMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(MODE_KEY) as ThemeMode | null;
  return v === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeName, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", mode);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {}
  import("./favicon").then(({ updateFavicon }) => updateFavicon(theme, mode)).catch(() => {});
}


// Inline script string injected pre-paint to avoid FOUC.
export const THEME_BOOT_SCRIPT = `
(function(){try{
  var t=localStorage.getItem('${THEME_KEY}')||'prism';
  if(['prism','noir','aurora','og','minimal'].indexOf(t)===-1)t='prism';
  var m=localStorage.getItem('${MODE_KEY}')||'dark';
  document.documentElement.setAttribute('data-theme',t);
  document.documentElement.setAttribute('data-mode',m);
}catch(e){
  document.documentElement.setAttribute('data-theme','prism');
  document.documentElement.setAttribute('data-mode','dark');
}})();
`;
