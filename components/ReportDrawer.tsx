"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { Drawer } from "vaul";
import { NoiseMeter } from "@/components/NoiseMeter";
import { intensityFromDb } from "@/lib/decibel";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import {
  NOISE_CATEGORIES,
  NOISE_INTENSITIES,
  type NoiseCategory,
  type NoiseIntensity,
} from "@/lib/noise-meta";

type ReportDrawerProps = {
  open: boolean;
  busy?: boolean;
  /** Keep drawer inside the app shell (covers the tab bar). */
  container?: HTMLElement | null;
  onClose: () => void;
  onSubmit: (details: {
    category: NoiseCategory;
    intensity: NoiseIntensity;
    dbAvg?: number | null;
    dbPeak?: number | null;
  }) => void;
};

export function ReportDrawer({
  open,
  busy = false,
  container = null,
  onClose,
  onSubmit,
}: ReportDrawerProps) {
  const t = useTranslations("Report");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tCommon = useTranslations("Common");
  const titleId = useId();
  const descriptionId = useId();
  const [category, setCategory] = useState<NoiseCategory>("traffic");
  const [intensity, setIntensity] = useState<NoiseIntensity>("loud");
  const [dbAvg, setDbAvg] = useState<number | null>(null);
  const [dbPeak, setDbPeak] = useState<number | null>(null);
  const [intensityTouched, setIntensityTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setCategory("traffic");
      setIntensity("loud");
      setDbAvg(null);
      setDbPeak(null);
      setIntensityTouched(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const handleReadingChange = useCallback(
    (reading: { avgDb: number; peakDb: number } | null) => {
      if (!reading) {
        setDbAvg(null);
        setDbPeak(null);
        return;
      }
      setDbAvg(reading.avgDb);
      setDbPeak(reading.peakDb);
      if (!intensityTouched) {
        setIntensity(intensityFromDb(reading.peakDb));
      }
    },
    [intensityTouched],
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      dismissible={!busy}
      shouldScaleBackground={false}
      repositionInputs
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content fixed inset-x-0 bottom-0 z-[60] mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2.5 mb-1" />

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
                className="mt-0.5 text-[0.84rem] font-medium text-[var(--bruit-muted)]"
              >
                {t("subtitle")}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="bruit-icon-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={tCommon("close")}
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
            <p className="mb-2 text-[0.8rem] font-semibold text-[var(--bruit-muted)]">
              {t("type")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NOISE_CATEGORIES.map((item) => {
                const selected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`bruit-choice cursor-pointer text-left transition-colors duration-200 ${
                      selected ? "bruit-choice-selected" : ""
                    }`}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-[var(--bruit-fill)] text-[var(--bruit-ink)]">
                      <NoiseCategoryIcon category={item.id} size={22} />
                    </span>
                    <span className="block text-[0.92rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                      {tCategories(`${item.id}.label`)}
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] font-medium leading-snug text-[var(--bruit-muted)]">
                      {tCategories(`${item.id}.description`)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <NoiseMeter
                active={open}
                busy={busy}
                onReadingChange={handleReadingChange}
              />
            </div>

            <p className="mb-2 mt-5 text-[0.8rem] font-semibold text-[var(--bruit-muted)]">
              {t("howLoud")}
            </p>
            <div className="bruit-sheet-card">
              {NOISE_INTENSITIES.map((item, index) => {
                const selected = intensity === item.id;
                return (
                  <div key={item.id}>
                    {index > 0 ? (
                      <div className="ml-4 h-px bg-[var(--bruit-hairline)]" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setIntensityTouched(true);
                        setIntensity(item.id);
                      }}
                      className="bruit-intensity-row"
                    >
                      <span>
                        <span className="block text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {tIntensities(`${item.id}.label`)}
                        </span>
                        <span className="block text-[0.78rem] font-medium text-[var(--bruit-muted)]">
                          {tIntensities(`${item.id}.hint`)}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                          selected
                            ? "border-[var(--bruit-accent)] bg-[var(--bruit-accent)] text-[var(--bruit-on-accent)]"
                            : "border-[var(--bruit-hairline-strong)]"
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <Check size={12} strokeWidth={2.6} aria-hidden />
                        ) : null}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--bruit-hairline)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onSubmit({
                  category,
                  intensity,
                  dbAvg,
                  dbPeak,
                })
              }
              className="bruit-primary-btn w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? t("sending") : t("submit")}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
