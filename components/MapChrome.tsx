"use client";

import { Info, Minus, Navigation, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { intensityShort } from "@/lib/i18n-helpers";
import { HEAT_SCALE_GRADIENT, NOISE_INTENSITIES } from "@/lib/noise-meta";

type MapChromeProps = {
  reportCount: number;
  canLocate: boolean;
  hidden?: boolean;
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenAbout: () => void;
};

export function MapChrome({
  reportCount,
  canLocate,
  hidden = false,
  onLocate,
  onZoomIn,
  onZoomOut,
  onOpenAbout,
}: MapChromeProps) {
  const t = useTranslations("Map");
  const tIntensities = useTranslations("Intensities");
  const tCommon = useTranslations("Common");

  if (hidden) {
    return null;
  }

  const levelSummary = NOISE_INTENSITIES.map((level) =>
    intensityShort(tIntensities, level.id),
  ).join(", ");

  return (
    <>
      <div className="pointer-events-none absolute left-3.5 top-0 z-20 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <div
          className="bruit-chrome bruit-noise-legend"
          role="img"
          aria-label={t("legendAria", {
            levels: levelSummary,
            count: reportCount,
          })}
        >
          <div className="bruit-noise-legend-header">
            <span className="bruit-noise-legend-title">{t("levels")}</span>
            <span className="bruit-noise-legend-meta">
              {reportCount}
              <span className="bruit-noise-legend-meta-sep">·</span>
              {tCommon("live")}
            </span>
          </div>

          <div className="bruit-noise-legend-scale" aria-hidden>
            <div
              className="bruit-heat-scale bruit-noise-legend-bar"
              style={{ background: HEAT_SCALE_GRADIENT }}
            />
            <div className="bruit-noise-legend-ticks">
              {NOISE_INTENSITIES.map((level) => (
                <span key={level.id} className="bruit-noise-legend-tick" />
              ))}
            </div>
          </div>

          <div className="bruit-noise-legend-labels" aria-hidden>
            {NOISE_INTENSITIES.map((level) => (
              <span key={level.id} className="bruit-noise-legend-label">
                {intensityShort(tIntensities, level.id)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-3.5 top-0 z-20 flex flex-col items-end gap-2.5 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <ThemeToggle />
        </div>

        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onOpenAbout}
            className="bruit-rail-btn cursor-pointer"
            aria-label={t("about")}
            title={t("aboutShort")}
          >
            <Info size={19} strokeWidth={1.85} aria-hidden />
          </button>
        </div>

        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onZoomIn}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label={t("zoomIn")}
          >
            <Plus size={19} strokeWidth={2} aria-hidden />
          </button>
          <div className="mx-3 h-px bg-[var(--bruit-hairline)]" />
          <button
            type="button"
            onClick={onZoomOut}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label={t("zoomOut")}
          >
            <Minus size={19} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onLocate}
            disabled={!canLocate}
            className="bruit-rail-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("locate")}
            title={t("myLocation")}
          >
            <Navigation
              size={28}
              fill="var(--bruit-accent)"
              color="var(--bruit-accent)"
              strokeWidth={0}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </>
  );
}
