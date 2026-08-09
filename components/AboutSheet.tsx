"use client";

type AboutSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutSheet({ open, onClose }: AboutSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="bruit-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bruit-about-title"
        className="bruit-sheet relative z-10 w-full max-w-md px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-[1.35rem] animate-[bruit-sheet-in_300ms_cubic-bezier(0.32,0.72,0,1)]"
      >
        <div className="mb-1 flex justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-[var(--bruit-hairline)]" />
        </div>

        <div className="mb-4 flex items-start justify-between gap-3 pt-1">
          <div>
            <h2
              id="bruit-about-title"
              className="bruit-brand text-[1.35rem] font-semibold tracking-tight text-[var(--bruit-ink)]"
            >
              About Bruit
            </h2>
            <p className="mt-1 text-[0.88rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              A quiet map for loud places. Report noise once every 30 minutes and
              help surface pollution heat around you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bruit-icon-btn cursor-pointer"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M3 3l8 8M11 3 3 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ul className="mb-4 overflow-hidden rounded-[1rem] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {[
            "Reports stay anonymous to your device ID",
            "Heatmap shows the last 7 days of activity",
            "Louder reports weigh hotter on the map",
          ].map((line, index) => (
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
          Done
        </button>
      </div>
    </div>
  );
}
