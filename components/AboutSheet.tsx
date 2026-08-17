"use client";

import {
  Check,
  MapPinned,
  Monitor,
  Moon,
  Shield,
  Sun,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Drawer } from "vaul";
import {
  isAppLocale,
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
  { id: "system", labelKey: "auto", icon: Monitor },
  { id: "light", labelKey: "light", icon: Sun },
  { id: "dark", labelKey: "dark", icon: Moon },
] as const;

const LANGUAGE_OPTIONS = [
  { id: "en", labelKey: "english" },
  { id: "fr", labelKey: "french" },
  { id: "mg", labelKey: "malagasy" },
] as const;

const ABOUT_ROWS = [
  {
    key: "bulletAnonymous",
    icon: Shield,
    tone: "teal",
  },
  {
    key: "bulletLiveMap",
    icon: MapPinned,
    tone: "orange",
  },
  {
    key: "bulletLingering",
    icon: Waves,
    tone: "blue",
  },
  {
    key: "bulletVerify",
    icon: Users,
    tone: "green",
  },
] as const;

function SettingsIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: (typeof ABOUT_ROWS)[number]["tone"];
}) {
  return (
    <span className={`bruit-settings-glyph bruit-settings-glyph--${tone}`} aria-hidden>
      <Icon size={15} strokeWidth={2.1} />
    </span>
  );
}

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
  const activeLocale: AppLocale = isAppLocale(locale) ? locale : "en";

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

          <div className="bruit-settings-nav">
            <span className="bruit-settings-nav-spacer" aria-hidden />
            <Drawer.Title id={titleId} className="bruit-settings-nav-title">
              {tCommon("settings")}
            </Drawer.Title>
            <button
              type="button"
              onClick={onClose}
              className="bruit-settings-done cursor-pointer"
            >
              {tCommon("done")}
            </button>
          </div>

          <Drawer.Description id={descriptionId} className="sr-only">
            {t("body")}
          </Drawer.Description>

          <div className="bruit-settings-scroll px-4 pb-[max(1.35rem,env(safe-area-inset-bottom))]">
            <section className="bruit-settings-section" aria-labelledby={`${titleId}-appearance`}>
              <h2 id={`${titleId}-appearance`} className="bruit-settings-header">
                {t("appearance")}
              </h2>
              <div className="bruit-sheet-card bruit-settings-card">
                <div
                  className="bruit-settings-segment"
                  role="group"
                  aria-label={t("appearance")}
                >
                  {APPEARANCE_OPTIONS.map((option) => {
                    const selected = activeTheme === option.id;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTheme(option.id)}
                        className={`bruit-settings-segment-btn cursor-pointer ${
                          selected ? "bruit-segment-selected" : ""
                        }`}
                        aria-pressed={selected}
                      >
                        <Icon size={18} strokeWidth={1.9} aria-hidden />
                        <span>{t(option.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="bruit-settings-footer">{t("appearanceFooter")}</p>
            </section>

            <section className="bruit-settings-section" aria-labelledby={`${titleId}-language`}>
              <h2 id={`${titleId}-language`} className="bruit-settings-header">
                {t("language")}
              </h2>
              <div
                className="bruit-sheet-card bruit-settings-card"
                role="radiogroup"
                aria-label={t("language")}
                aria-busy={isPending || undefined}
              >
                {LANGUAGE_OPTIONS.map((option, index) => {
                  const selected = activeLocale === option.id;
                  return (
                    <div key={option.id}>
                      {index > 0 ? (
                        <div className="bruit-settings-separator" />
                      ) : null}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setLocale(option.id)}
                        disabled={isPending}
                        className="bruit-settings-row cursor-pointer disabled:cursor-not-allowed"
                      >
                        <span className="bruit-settings-row-label">
                          {t(option.labelKey)}
                        </span>
                        {selected ? (
                          <Check
                            size={18}
                            strokeWidth={2.4}
                            className="bruit-settings-check"
                            aria-hidden
                          />
                        ) : (
                          <span className="bruit-settings-check-slot" aria-hidden />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bruit-settings-section" aria-labelledby={`${titleId}-about`}>
              <h2 id={`${titleId}-about`} className="bruit-settings-header">
                {t("title")}
              </h2>
              <ul className="bruit-sheet-card bruit-settings-card">
                {ABOUT_ROWS.map((row, index) => (
                  <li key={row.key}>
                    {index > 0 ? (
                      <div className="bruit-settings-separator bruit-settings-separator--inset" />
                    ) : null}
                    <div className="bruit-settings-info-row">
                      <SettingsIcon icon={row.icon} tone={row.tone} />
                      <p className="bruit-settings-info-text">{t(row.key)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="bruit-settings-footer">{t("body")}</p>
            </section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
