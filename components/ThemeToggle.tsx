"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="bruit-rail-btn cursor-pointer"
      aria-label={isDark ? t("toLight") : t("toDark")}
      title={isDark ? t("light") : t("dark")}
    >
      {isDark ? (
        <Sun size={19} strokeWidth={1.85} aria-hidden />
      ) : (
        <Moon size={19} strokeWidth={1.85} aria-hidden />
      )}
    </button>
  );
}
