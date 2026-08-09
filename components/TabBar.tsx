"use client";

import { ChartColumn, Flag, List, Map as MapIcon, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatCountdown,
  getCooldownRemainingMs,
} from "@/lib/cooldown";
import { COOLDOWN_MS } from "@/lib/constants";

export type AppTab = "map" | "feed" | "insights" | "help";

type TabBarProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onReport: () => void;
  cooldownMs: number;
  busy?: boolean;
  statusMessage?: string | null;
  statusTone?: "neutral" | "success" | "error";
  feedCount?: number;
  hidden?: boolean;
};

export function TabBar({
  active,
  onChange,
  onReport,
  cooldownMs,
  busy = false,
  statusMessage,
  statusTone = "neutral",
  feedCount = 0,
  hidden = false,
}: TabBarProps) {
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
  const reportLabel = onCooldown
    ? `Report available in ${formatCountdown(remaining)}`
    : busy
      ? "Sending report"
      : "Report a noise";

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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex flex-col items-center px-3.5 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
      {statusMessage ? (
        <div className="pointer-events-auto mb-2 w-full max-w-sm">
          <div className="bruit-chrome rounded-2xl px-4 py-2.5 text-center text-[0.88rem] font-medium animate-[bruit-rise_240ms_ease-out]">
            <p className={toneClass}>{statusMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-2.5 flex w-full max-w-lg justify-end">
        <button
          type="button"
          onClick={onReport}
          disabled={busy || onCooldown}
          aria-label={reportLabel}
          title={reportLabel}
          aria-busy={busy || undefined}
          className={`bruit-report-fab pointer-events-auto cursor-pointer disabled:cursor-not-allowed ${
            onCooldown ? "bruit-report-fab-cooldown" : ""
          }`}
        >
          {onCooldown ? (
            <span
              className="bruit-report-fab-progress"
              style={{ transform: `scaleX(${progress})` }}
              aria-hidden
            />
          ) : null}
          <span className="relative z-10 flex items-center gap-2">
            {onCooldown ? (
              <span className="bruit-report-fab-timer tabular-nums">
                {formatCountdown(remaining)}
              </span>
            ) : busy ? (
              <>
                <span className="bruit-report-fab-spinner" aria-hidden />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Flag size={18} strokeWidth={2.1} aria-hidden />
                <span>Report</span>
              </>
            )}
          </span>
        </button>
      </div>

      <nav
        aria-label="Primary"
        className="bruit-tabbar pointer-events-auto grid w-full max-w-lg grid-cols-4 items-end px-1 pb-1.5 pt-1.5"
      >
        <button
          type="button"
          onClick={() => onChange("map")}
          className={`bruit-tab cursor-pointer ${
            active === "map" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "map" ? "page" : undefined}
        >
          <MapIcon size={24} strokeWidth={1.7} aria-hidden />
          <span>Map</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("feed")}
          className={`bruit-tab cursor-pointer ${
            active === "feed" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "feed" ? "page" : undefined}
        >
          <span className="relative inline-flex">
            <List size={24} strokeWidth={1.7} aria-hidden />
            {feedCount > 0 ? (
              <span className="bruit-tab-badge" aria-hidden>
                {feedCount > 99 ? "99+" : feedCount}
              </span>
            ) : null}
          </span>
          <span>Activity</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("insights")}
          className={`bruit-tab cursor-pointer ${
            active === "insights" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "insights" ? "page" : undefined}
        >
          <ChartColumn size={24} strokeWidth={1.7} aria-hidden />
          <span>Insights</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("help")}
          className={`bruit-tab cursor-pointer ${
            active === "help" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "help" ? "page" : undefined}
        >
          <Phone size={24} strokeWidth={1.7} aria-hidden />
          <span>Help</span>
        </button>
      </nav>
    </div>
  );
}
