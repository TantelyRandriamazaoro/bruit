"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Drawer } from "vaul";
import {
  setLocaleCookie,
  type AppLocale,
} from "@/i18n/locales";

type AboutSheetProps = {
  open: boolean;
  /** Keep drawer inside the app shell (covers the tab bar). */
  container?: HTMLElement | null;
  onClose: () => void;
};

const APPEARANCE_OPTIONS = [
  { id: "system", labelKey: "auto" },
  { id: "light", labelKey: "light" },
  { id: "dark", labelKey: "dark" },
] as const;

const LANGUAGE_OPTIONS = [
  { id: "en", labelKey: "english" },
  { id: "fr", labelKey: "french" },
] as const;

export function AboutSheet({
  open,
  container = null,
  onClose,
}: AboutSheetProps) {
  const t = useTranslations("About");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const activeTheme = mounted ? (theme ?? "system") : "system";
  const activeLocale = locale === "fr" ? "fr" : "en";
  const bullets = [
    t("bulletAnonymous"),
    t("bulletLiveMap"),
    t("bulletLingering"),
    t("bulletVerify"),
  ];

  const setLocale = (next: AppLocale) => {
    if (next === activeLocale) {
      return;
    }
    setLocaleCookie(next);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      shouldScaleBackground={false}
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-md flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1">
            <div>
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.35rem] font-semibold tracking-tight text-[var(--bruit-ink)]"
              >
                {t("title")}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-1 text-[0.88rem] font-medium leading-relaxed text-[var(--bruit-muted)]"
              >
                {t("body")}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bruit-icon-btn cursor-pointer"
              aria-label={tCommon("close")}
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <div className="flex flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="bruit-sheet-card mb-3">
              <div className="px-4 pb-1 pt-3 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--bruit-muted)]">
                {t("appearance")}
              </div>
              <div
                className="mx-3 mb-3 grid grid-cols-3 gap-1 rounded-[0.75rem] bg-[var(--bruit-fill)] p-1"
                role="group"
                aria-label={t("appearance")}
              >
                {APPEARANCE_OPTIONS.map((option) => {
                  const selected = activeTheme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id)}
                      className={`cursor-pointer rounded-[0.6rem] px-2 py-1.5 text-[0.82rem] font-semibold transition-colors duration-200 ${
                        selected
                          ? "bruit-segment-selected"
                          : "bg-transparent text-[var(--bruit-muted)]"
                      }`}
                      aria-pressed={selected}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bruit-sheet-card mb-3">
              <div className="px-4 pb-1 pt-3 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--bruit-muted)]">
                {t("language")}
              </div>
              <div
                className="mx-3 mb-3 grid grid-cols-2 gap-1 rounded-[0.75rem] bg-[var(--bruit-fill)] p-1"
                role="group"
                aria-label={t("language")}
                aria-busy={isPending || undefined}
              >
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = activeLocale === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLocale(option.id)}
                      disabled={isPending}
                      className={`cursor-pointer rounded-[0.6rem] px-2 py-1.5 text-[0.82rem] font-semibold transition-colors duration-200 disabled:cursor-not-allowed ${
                        selected
                          ? "bruit-segment-selected"
                          : "bg-transparent text-[var(--bruit-muted)]"
                      }`}
                      aria-pressed={selected}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="bruit-sheet-card mb-4">
              {bullets.map((line, index) => (
                <li key={line}>
                  {index > 0 ? (
                    <div className="ml-4 h-px bg-[var(--bruit-hairline)]" />
                  ) : null}
                  <div className="px-4 py-3 text-[0.9rem] font-medium leading-snug text-[var(--bruit-ink)]">
                    {line}
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onClose}
              className="bruit-primary-btn w-full cursor-pointer"
            >
              {tCommon("done")}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
