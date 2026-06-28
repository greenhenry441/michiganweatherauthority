export type ThemeName = "noir" | "aurora" | "og";
export type ThemeMode = "dark" | "light";

const THEME_KEY = "mwa-theme";
const MODE_KEY = "mwa-mode";

export const THEMES: { id: ThemeName; label: string; desc: string }[] = [
  { id: "noir", label: "Storm Noir", desc: "Black + gold editorial broadcast" },
  { id: "aurora", label: "Aurora Glass", desc: "Midnight glass with teal/violet aurora" },
  { id: "og", label: "OG Storm Blue", desc: "Original deep blue weather console" },
];

export const MODES: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

export function getTheme(): ThemeName {
  if (typeof window === "undefined") return "noir";
  const v = window.localStorage.getItem(THEME_KEY) as ThemeName | null;
  return v && ["noir", "aurora", "og"].includes(v) ? v : "noir";
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
  // Swap favicon to match theme/mode
  import("./favicon").then(({ updateFavicon }) => updateFavicon(theme, mode)).catch(() => {});
}


// Inline script string injected pre-paint to avoid FOUC.
export const THEME_BOOT_SCRIPT = `
(function(){try{
  var t=localStorage.getItem('${THEME_KEY}')||'noir';
  var m=localStorage.getItem('${MODE_KEY}')||'dark';
  document.documentElement.setAttribute('data-theme',t);
  document.documentElement.setAttribute('data-mode',m);
}catch(e){
  document.documentElement.setAttribute('data-theme','noir');
  document.documentElement.setAttribute('data-mode','dark');
}})();
`;
