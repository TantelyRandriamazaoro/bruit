"use client";

type MapChromeProps = {
  reportCount: number;
  heatmapVisible: boolean;
  canLocate: boolean;
  hidden?: boolean;
  onToggleHeatmap: () => void;
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOpenAbout: () => void;
};

export function MapChrome({
  reportCount,
  heatmapVisible,
  canLocate,
  hidden = false,
  onToggleHeatmap,
  onLocate,
  onZoomIn,
  onZoomOut,
  onOpenAbout,
}: MapChromeProps) {
  if (hidden) {
    return null;
  }

  return (
    <>
      {/* Top trailing actions — Apple Maps style */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-4 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAbout}
            className="bruit-chrome bruit-rail-btn cursor-pointer"
            aria-label="About Bruit"
            title="About"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 11v5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="8.2" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Activity + legend cluster */}
      <div className="pointer-events-none absolute left-4 top-[max(4.75rem,calc(env(safe-area-inset-top)+3.9rem))] z-20 flex max-w-[11.5rem] flex-col gap-2">
        <div className="bruit-chrome pointer-events-auto rounded-[1.15rem] px-3.5 py-2.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
            Last 7 days
          </p>
          <p className="bruit-brand mt-0.5 text-[1.35rem] font-semibold leading-none tabular-nums text-[var(--bruit-ink)]">
            {reportCount}
            <span className="ml-1 text-[0.78rem] font-medium text-[var(--bruit-muted)]">
              {reportCount === 1 ? "report" : "reports"}
            </span>
          </p>
        </div>

        <div className="bruit-chrome pointer-events-auto rounded-[1.15rem] px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
              Heat
            </p>
            <button
              type="button"
              onClick={onToggleHeatmap}
              className="cursor-pointer rounded-full px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--bruit-accent)] transition-colors duration-200 hover:bg-[var(--bruit-fill)]"
            >
              {heatmapVisible ? "On" : "Off"}
            </button>
          </div>
          <div
            className={`h-2 w-full rounded-full ${
              heatmapVisible ? "bruit-heat-scale" : "bg-[var(--bruit-fill)]"
            }`}
            aria-hidden
          />
          <div className="mt-1.5 flex justify-between text-[0.62rem] font-medium text-[var(--bruit-muted)]">
            <span>Quiet</span>
            <span>Loud</span>
          </div>
        </div>
      </div>

      {/* Right control rail */}
      <div className="pointer-events-none absolute right-4 top-[max(4.75rem,calc(env(safe-area-inset-top)+3.9rem))] z-20 flex flex-col gap-2">
        <div className="bruit-chrome pointer-events-auto overflow-hidden rounded-[1.05rem]">
          <button
            type="button"
            onClick={onZoomIn}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom in"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 6v12M6 12h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="mx-2 h-px bg-[var(--bruit-hairline)]" />
          <button
            type="button"
            onClick={onZoomOut}
            className="bruit-rail-btn-block cursor-pointer"
            aria-label="Zoom out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
          className="bruit-chrome bruit-rail-btn pointer-events-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Center on my location"
          title="My location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggleHeatmap}
          className={`bruit-chrome bruit-rail-btn pointer-events-auto cursor-pointer ${
            heatmapVisible ? "text-[var(--bruit-accent)]" : "text-[var(--bruit-muted)]"
          }`}
          aria-label={heatmapVisible ? "Hide heatmap" : "Show heatmap"}
          aria-pressed={heatmapVisible}
          title="Heatmap"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 16.5c1.6-2.4 2.4-4.2 2.4-6A2.4 2.4 0 0 1 10.8 8c.7 0 1.3.3 1.7.8.5-.9 1.4-1.5 2.5-1.5A3.2 3.2 0 0 1 18.2 10c0 2.2-1.1 4.2-3.2 6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 18.5h7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
