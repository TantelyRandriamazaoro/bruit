"use client";

import { ChevronRight, Minus, Navigation, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Drawer } from "vaul";
import { intensityShort } from "@/lib/i18n-helpers";
import {
  COOL_HEAT_SCALE_GRADIENT,
  HEAT_SCALE_GRADIENT,
  NOISE_INTENSITIES,
} from "@/lib/noise-meta";

type MapChromeProps = {
  reportCount: number;
  canLocate: boolean;
  hidden?: boolean;
  container?: HTMLElement | null;
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function MapChrome({
  reportCount,
  canLocate,
  hidden = false,
  container = null,
  onLocate,
  onZoomIn,
  onZoomOut,
}: MapChromeProps) {
  const t = useTranslations("Map");
  const tCommon = useTranslations("Common");
  const tIntensities = useTranslations("Intensities");
  const titleId = useId();
  const descriptionId = useId();
  const [legendOpen, setLegendOpen] = useState(false);

  if (hidden) {
    return null;
  }

  const low = NOISE_INTENSITIES[0];
  const high = NOISE_INTENSITIES[NOISE_INTENSITIES.length - 1];
  const levelSummary = NOISE_INTENSITIES.map((level) =>
    intensityShort(tIntensities, level.id),
  ).join(", ");

  return (
    <>
      <div className="pointer-events-none absolute left-3.5 top-0 z-20 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setLegendOpen(true)}
          className="bruit-chrome bruit-noise-legend pointer-events-auto cursor-pointer text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--bruit-chrome)_88%,var(--bruit-ink))] active:bg-[color-mix(in_srgb,var(--bruit-chrome)_78%,var(--bruit-ink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--bruit-accent)_45%,transparent)]"
          aria-label={t("legendAria", {
            levels: levelSummary,
            count: reportCount,
          })}
          aria-haspopup="dialog"
          aria-expanded={legendOpen}
        >
          <span className="bruit-noise-legend-top">
            <span className="bruit-noise-legend-heading">
              <span className="bruit-noise-legend-title">
                {t("legendWindow")}
              </span>
              <span className="bruit-noise-legend-count">
                {t("legendCount", { count: reportCount })}
              </span>
            </span>
            <ChevronRight
              size={15}
              strokeWidth={2.2}
              className="bruit-noise-legend-chevron"
              aria-hidden
            />
          </span>

          <span className="bruit-noise-legend-keys" aria-hidden>
            <span className="bruit-noise-legend-key">
              <span
                className="bruit-noise-legend-key-bar"
                style={{ background: HEAT_SCALE_GRADIENT }}
              />
              <span className="bruit-noise-legend-key-label">
                {t("legendHotShort")}
              </span>
            </span>
            <span className="bruit-noise-legend-key">
              <span
                className="bruit-noise-legend-key-bar bruit-noise-legend-key-bar-cool"
                style={{ background: COOL_HEAT_SCALE_GRADIENT }}
              />
              <span className="bruit-noise-legend-key-label">
                {t("legendEarlierShort")}
              </span>
            </span>
          </span>
        </button>
      </div>

      {/* Sits below the persistent settings + theme rail (2×3rem + gaps). */}
      <div className="pointer-events-none absolute right-3.5 top-0 z-20 flex flex-col items-end gap-2.5 pt-[calc(max(0.7rem,env(safe-area-inset-top))+7.25rem)]">
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

      <Drawer.Root
        open={legendOpen}
        onOpenChange={setLegendOpen}
        shouldScaleBackground={false}
        container={container ?? undefined}
        autoFocus
      >
        <Drawer.Portal>
          <Drawer.Overlay className="bruit-drawer-overlay bruit-place-overlay fixed inset-0 z-[60]" />
          <Drawer.Content
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="bruit-sheet bruit-drawer-content bruit-place-drawer bruit-legend-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
          >
            <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

            <div className="flex items-start gap-3 px-4 pb-3 pt-2">
              <div className="min-w-0 flex-1 pt-0.5">
                <Drawer.Title
                  id={titleId}
                  className="bruit-brand text-[1.35rem] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--bruit-ink)]"
                >
                  {t("levels")}
                </Drawer.Title>
                <Drawer.Description
                  id={descriptionId}
                  className="mt-1 text-[0.9rem] font-medium leading-snug text-[var(--bruit-muted)]"
                >
                  {t("legendWindow")}
                  <span className="bruit-noise-legend-meta-sep">·</span>
                  {t("legendCount", { count: reportCount })}
                </Drawer.Description>
              </div>
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="bruit-icon-btn mt-0.5 cursor-pointer"
                aria-label={tCommon("close")}
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-4 pb-[max(0.95rem,env(safe-area-inset-bottom))]">
              <div className="bruit-place-details overflow-hidden rounded-[1.05rem]">
                <div className="bruit-legend-detail-row">
                  <div className="bruit-legend-detail-copy">
                    <p className="bruit-legend-detail-title">{t("legendHot")}</p>
                    <p className="bruit-legend-detail-meta">
                      {t("legendHotMeta")}
                    </p>
                  </div>
                  <div className="bruit-legend-detail-scale">
                    <div
                      className="bruit-heat-scale bruit-noise-legend-bar"
                      style={{ background: HEAT_SCALE_GRADIENT }}
                    />
                    <div className="bruit-noise-legend-ends">
                      <span>{intensityShort(tIntensities, low.id)}</span>
                      <span>{intensityShort(tIntensities, high.id)}</span>
                    </div>
                  </div>
                </div>

                <div className="bruit-list-separator-inset" />

                <div className="bruit-legend-detail-row">
                  <div className="bruit-legend-detail-copy">
                    <p className="bruit-legend-detail-title">
                      {t("legendEarlier")}
                    </p>
                    <p className="bruit-legend-detail-meta">
                      {t("legendEarlierMeta")}
                    </p>
                  </div>
                  <div className="bruit-legend-detail-scale">
                    <div
                      className="bruit-heat-scale bruit-noise-legend-bar bruit-noise-legend-bar-cool"
                      style={{ background: COOL_HEAT_SCALE_GRADIENT }}
                    />
                  </div>
                </div>
              </div>

              <p className="px-1 text-[0.8rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {t("legendDetails")}
              </p>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
