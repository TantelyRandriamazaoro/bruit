"use client";

import { Info, LocateFixed, Minus, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NOISE_INTENSITIES } from "@/lib/noise-meta";

const LEVEL_SHORT: Record<(typeof NOISE_INTENSITIES)[number]["id"], string> = {
  moderate: "Noticeable",
  loud: "Loud",
  very_loud: "Very",
  extreme: "Extreme",
};

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
  if (hidden) {
    return null;
  }

  const levelSummary = NOISE_INTENSITIES.map((level) => level.label).join(", ");

  return (
    <>
      {/* Top-left: noise level legend — Apple Maps / Weather restraint */}
      <div className="pointer-events-none absolute left-3.5 top-0 z-20 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <div
          className="bruit-chrome bruit-noise-legend"
          role="img"
          aria-label={`Noise levels: ${levelSummary}. ${reportCount} live reports in active areas.`}
        >
          <div className="bruit-noise-legend-header">
            <span className="bruit-noise-legend-title">Levels</span>
            <span className="bruit-noise-legend-meta">
              {reportCount}
              <span className="bruit-noise-legend-meta-sep">·</span>
              live
            </span>
          </div>

          <div className="bruit-noise-legend-scale" aria-hidden>
            <div className="bruit-heat-scale bruit-noise-legend-bar" />
            <div className="bruit-noise-legend-ticks">
              {NOISE_INTENSITIES.map((level) => (
                <span key={level.id} className="bruit-noise-legend-tick" />
              ))}
            </div>
          </div>

          <div className="bruit-noise-legend-labels" aria-hidden>
            {NOISE_INTENSITIES.map((level) => (
              <span key={level.id} className="bruit-noise-legend-label">
                {LEVEL_SHORT[level.id]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top-right rail */}
      <div className="pointer-events-none absolute right-3.5 top-0 z-20 flex flex-col items-end gap-2.5 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={onOpenAbout}
          className="bruit-chrome bruit-rail-btn pointer-events-auto cursor-pointer"
          aria-label="About Bruit"
          title="About"
        >
          <Info size={19} strokeWidth={1.85} aria-hidden />
        </button>

        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onZoomIn}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom in"
          >
            <Plus size={19} strokeWidth={2} aria-hidden />
          </button>
          <div className="mx-3 h-px bg-[var(--bruit-hairline)]" />
          <button
            type="button"
            onClick={onZoomOut}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom out"
          >
            <Minus size={19} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={onLocate}
          disabled={!canLocate}
          className="bruit-chrome bruit-rail-btn pointer-events-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Center on my location"
          title="My location"
        >
          <LocateFixed size={19} strokeWidth={1.85} aria-hidden />
        </button>
      </div>
    </>
  );
}
