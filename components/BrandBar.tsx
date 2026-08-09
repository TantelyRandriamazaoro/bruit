export function BrandBar() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pr-[4.25rem] pt-[max(0.85rem,env(safe-area-inset-top))]">
      <div className="bruit-chrome pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-full px-3.5 py-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bruit-ink)] text-[0.72rem] font-semibold tracking-tight text-white"
          aria-hidden
        >
          Br
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="bruit-brand truncate text-[1.08rem] font-semibold leading-tight text-[var(--bruit-ink)]">
            Bruit
          </p>
          <p className="truncate text-[0.74rem] font-medium leading-tight text-[var(--bruit-muted)]">
            Search the soundscape around you
          </p>
        </div>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bruit-fill)] text-[var(--bruit-muted)]"
          aria-hidden
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="m16 16 3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
    </header>
  );
}
