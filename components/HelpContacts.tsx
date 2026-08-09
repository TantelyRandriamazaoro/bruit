"use client";

import { HELPLINES } from "@/lib/helplines";

type HelpContactsProps = {
  hidden?: boolean;
};

function CallGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 4.5h2.2l1.1 3.3-1.4 1.4a12.5 12.5 0 0 0 4.9 4.9l1.4-1.4 3.3 1.1v2.2A2.2 2.2 0 0 1 17.8 18 13.8 13.8 0 0 1 6 6.2 2.2 2.2 0 0 1 8.5 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HelpContacts({ hidden = false }: HelpContactsProps) {
  if (hidden) {
    return null;
  }

  const emergency = HELPLINES.filter((line) => line.kind === "emergency");

  return (
    <section
      className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]"
      aria-labelledby="help-title"
    >
      <header className="bruit-feed-header shrink-0 px-5 pb-2 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1
          id="help-title"
          className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]"
        >
          Help
        </h1>
        <p className="mt-1 max-w-sm text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          Tap a number to call. Madagascar emergency services.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28">
        <p className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
          Emergency
        </p>

        <div className="bruit-grouped-list mx-auto max-w-lg overflow-hidden">
          <ul>
            {emergency.map((line, index) => (
              <li key={line.id}>
                {index > 0 ? <div className="bruit-list-separator-inset" /> : null}
                <a
                  href={`tel:${line.tel}`}
                  aria-label={`Call ${line.name}, ${line.number}`}
                  className="bruit-feed-row flex w-full cursor-pointer items-center text-left no-underline transition-colors duration-150 focus-visible:bg-[rgba(0,122,255,0.06)] focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1 py-0.5">
                    <span className="block truncate text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                      {line.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                      {line.subtitle}
                    </span>
                  </span>
                  <span className="mr-3 shrink-0 text-[1.05rem] font-semibold tabular-nums tracking-tight text-[var(--bruit-accent)]">
                    {line.number}
                  </span>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#34c759] text-white shadow-[0_1px_2px_rgba(52,199,89,0.35)]"
                    aria-hidden
                  >
                    <CallGlyph />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-5 max-w-lg px-3 text-[0.78rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
          If you are in immediate danger, call emergency services first. Bruit
          reports are community signals — not a substitute for official help.
        </p>
      </div>
    </section>
  );
}
