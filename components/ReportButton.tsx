"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCountdown,
  getCooldownRemainingMs,
} from "@/lib/cooldown";
import { COOLDOWN_MS } from "@/lib/constants";

type ReportButtonProps = {
  disabled?: boolean;
  busy?: boolean;
  cooldownMs: number;
  onReport: () => void;
  statusMessage?: string | null;
  statusTone?: "neutral" | "success" | "error";
  hidden?: boolean;
};

export function ReportButton({
  disabled = false,
  busy = false,
  cooldownMs,
  onReport,
  statusMessage,
  statusTone = "neutral",
  hidden = false,
}: ReportButtonProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (cooldownMs <= 0) {
      return;
    }

    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [cooldownMs]);

  const remaining = useMemo(() => {
    void tick;
    return Math.max(0, cooldownMs > 0 ? getCooldownRemainingMs() : 0);
  }, [cooldownMs, tick]);

  const onCooldown = remaining > 0;
  const progress = onCooldown ? 1 - remaining / COOLDOWN_MS : 0;
  const label = busy
    ? "Opening…"
    : onCooldown
      ? `Available in ${formatCountdown(remaining)}`
      : "Report a Noise";

  const toneClass =
    statusTone === "success"
      ? "text-[var(--bruit-success)]"
      : statusTone === "error"
        ? "text-[var(--bruit-danger)]"
        : "text-[var(--bruit-muted)]";

  if (hidden) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2.5 px-4 pb-[max(1.1rem,env(safe-area-inset-bottom))]">
      {statusMessage ? (
        <div className="bruit-chrome pointer-events-auto max-w-sm rounded-2xl px-4 py-2.5 text-center text-sm font-medium animate-[bruit-rise_240ms_ease-out]">
          <p className={toneClass}>{statusMessage}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onReport}
        disabled={disabled || busy || onCooldown}
        aria-label={label}
        className="bruit-chrome bruit-cta-capsule pointer-events-auto relative flex w-full max-w-md cursor-pointer items-center gap-3 overflow-hidden px-3 py-3 pr-4 text-left transition-[transform,box-shadow] duration-200 enabled:active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-85"
      >
        {onCooldown ? (
          <span
            className="absolute inset-y-0 left-0 bg-[var(--bruit-fill)] transition-[width] duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
            aria-hidden
          />
        ) : null}

        <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bruit-accent)] text-white shadow-[0_4px_14px_rgba(0,122,255,0.35)]">
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v10.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8.5 8.5a3.5 3.5 0 0 0 7 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M5 12.5a7 7 0 0 0 14 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 19.5v1.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>

        <span className="relative z-10 min-w-0 flex-1">
          <span className="block truncate text-[1rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
            {onCooldown ? formatCountdown(remaining) : "Report a Noise"}
          </span>
          <span className="block truncate text-[0.78rem] font-medium text-[var(--bruit-muted)]">
            {onCooldown
              ? "One report every 30 minutes"
              : "Pin your location and describe it"}
          </span>
        </span>
      </button>
    </div>
  );
}
