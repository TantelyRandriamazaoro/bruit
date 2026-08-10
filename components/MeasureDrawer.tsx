"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useState } from "react";
import { Drawer } from "vaul";
import { NoiseMeter } from "@/components/NoiseMeter";

type MeasureDrawerProps = {
  open: boolean;
  /** Keep drawer inside the app shell (covers the tab bar). */
  container?: HTMLElement | null;
  onClose: () => void;
  onReportThis?: (reading: { avgDb: number; peakDb: number }) => void;
};

export function MeasureDrawer({
  open,
  container = null,
  onClose,
  onReportThis,
}: MeasureDrawerProps) {
  const t = useTranslations("Measure");
  const tCommon = useTranslations("Common");
  const titleId = useId();
  const descriptionId = useId();
  const [reading, setReading] = useState<{
    avgDb: number;
    peakDb: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      const frame = window.requestAnimationFrame(() => setReading(null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [open]);

  const handleReadingChange = useCallback(
    (next: { avgDb: number; peakDb: number } | null) => {
      setReading(next);
    },
    [],
  );

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
        <Drawer.Overlay className="bruit-drawer-overlay bruit-place-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content bruit-measure-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2.5 mb-1" />

          <div className="flex items-center gap-3 px-5 pb-1 pt-1">
            <div className="min-w-0 flex-1">
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.7rem] font-bold leading-none tracking-[-0.04em] text-[var(--bruit-ink)]"
              >
                {t("title")}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-1.5 text-[0.92rem] font-medium leading-snug text-[var(--bruit-muted)]"
              >
                {t("subtitle")}
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

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3">
            <NoiseMeter
              active={open}
              onReadingChange={handleReadingChange}
              showHeading={false}
              variant="sheet"
            />
          </div>

          <div className="flex flex-col gap-2 px-4 pb-[max(0.95rem,env(safe-area-inset-bottom))] pt-2">
            {reading && onReportThis ? (
              <button
                type="button"
                onClick={() => onReportThis(reading)}
                className="bruit-primary-btn w-full cursor-pointer"
              >
                {t("reportThis")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={
                reading
                  ? "bruit-measure-done-btn bruit-measure-done-btn--quiet w-full cursor-pointer"
                  : "bruit-measure-done-btn w-full cursor-pointer"
              }
            >
              {tCommon("done")}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
