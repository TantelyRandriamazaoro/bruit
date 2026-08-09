export function BrandBar() {
  return (
    <header className="pointer-events-none absolute left-3.5 top-0 z-20 pt-[max(0.7rem,env(safe-area-inset-top))]">
      <div className="bruit-chrome pointer-events-auto inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bruit-ink)] text-[0.6rem] font-semibold tracking-tight text-white"
          aria-hidden
        >
          Br
        </span>
        <p className="bruit-brand text-[0.98rem] font-semibold leading-none tracking-tight text-[var(--bruit-ink)]">
          Bruit
        </p>
      </div>
    </header>
  );
}
