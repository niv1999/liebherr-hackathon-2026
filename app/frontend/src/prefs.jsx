// User preferences: language (English / German) and theme (light / dark). Remembered in the browser.
import { createContext, useContext, useEffect, useState } from "react";
import { DE } from "./i18n_de.js";

const PrefsCtx = createContext({ lang: "en", setLang: () => {}, theme: "light", setTheme: () => {}, t: (s) => s });

function load(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function PrefsProvider({ children }) {
  const systemDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const [lang, setLangState] = useState(load("helpr.lang", "en"));
  const [theme, setThemeState] = useState(load("helpr.theme", systemDark ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [theme, lang]);

  const setLang = (l) => { setLangState(l); store("helpr.lang", l); };
  const setTheme = (th) => { setThemeState(th); store("helpr.theme", th); };
  // English text is the key; missing German entries fall back to English.
  const t = (s, vars) => {
    let out = lang === "de" ? DE[s] ?? s : s;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
    return out;
  };
  return <PrefsCtx.Provider value={{ lang, setLang, theme, setTheme, t }}>{children}</PrefsCtx.Provider>;
}

export const usePrefs = () => useContext(PrefsCtx);
export const useT = () => useContext(PrefsCtx).t;
