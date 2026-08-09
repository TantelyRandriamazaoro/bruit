"use client";

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
          aria-label={`Noise levels: ${levelSummary}. ${reportCount} reports in the last 7 days.`}
        >
          <div className="bruit-noise-legend-header">
            <span className="bruit-noise-legend-title">Levels</span>
            <span className="bruit-noise-legend-meta">
              {reportCount}
              <span className="bruit-noise-legend-meta-sep">·</span>
              7 days
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
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 11v5.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="8.2" r="1" fill="currentColor" />
          </svg>
        </button>

        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onZoomIn}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom in"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 6v12M6 12h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="mx-3 h-px bg-[var(--bruit-hairline)]" />
          <button
            type="button"
            onClick={onZoomOut}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom out"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 12h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
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
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 3.5v2.1M12 18.4v2.1M3.5 12h2.1M18.4 12h2.1"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="7.1" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </div>
    </>
  );
}
