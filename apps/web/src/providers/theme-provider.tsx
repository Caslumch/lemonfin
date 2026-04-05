"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { themeAtom, type Theme } from "@/store/theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useAtom(themeAtom);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("lemonfin-theme") as Theme | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setTheme(saved);
    }
  }, [setTheme]);

  // Apply theme and persist
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("lemonfin-theme", theme);
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return <>{children}</>;
}
