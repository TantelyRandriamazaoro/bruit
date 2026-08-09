"use client";

import {
  Check,
  ChartColumn,
  CircleAlert,
  Flag,
  List,
  Map as MapIcon,
  Phone,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
  onDismissStatus?: () => void;
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
  onDismissStatus,
  feedCount = 0,
  hidden = false,
}: TabBarProps) {
  const t = useTranslations("Tabs");
  const tCommon = useTranslations("Common");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (cooldownMs <= 0) {
      return;
    }
    const id = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [cooldownMs]);

  const remaining = useMemo(() => {
    void tick;
    return Math.max(0, cooldownMs > 0 ? getCooldownRemainingMs() : 0);
  }, [cooldownMs, tick]);

  const onCooldown = remaining > 0;
  const progress = onCooldown ? 1 - remaining / COOLDOWN_MS : 0;
  const reportLabel = onCooldown
    ? t("reportAvailableIn", { time: formatCountdown(remaining) })
    : busy
      ? t("sendingReport")
      : t("reportNoise");

  if (hidden) {
    return null;
  }

  const StatusIcon =
    statusTone === "success"
      ? Check
      : statusTone === "error"
        ? CircleAlert
        : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex flex-col items-center px-3.5 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
      {statusMessage ? (
        <div className="pointer-events-auto mb-2.5 w-full max-w-sm">
          <div
            role="status"
            aria-live="polite"
            className={`bruit-toast bruit-toast--${statusTone}`}
          >
            {StatusIcon ? (
              <span className="bruit-toast-icon" aria-hidden>
                <StatusIcon size={15} strokeWidth={2.4} />
              </span>
            ) : null}
            <p className="bruit-toast-message">{statusMessage}</p>
            {onDismissStatus ? (
              <button
                type="button"
                onClick={onDismissStatus}
                className="bruit-toast-dismiss cursor-pointer"
                aria-label={tCommon("dismiss")}
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
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
                <span>{t("sending")}</span>
              </>
            ) : (
              <>
                <Flag size={18} strokeWidth={2.1} aria-hidden />
                <span>{t("report")}</span>
              </>
            )}
          </span>
        </button>
      </div>

      <nav
        aria-label={t("primary")}
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
          <MapIcon size={20} strokeWidth={1.7} aria-hidden />
          <span>{t("map")}</span>
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
            <List size={20} strokeWidth={1.7} aria-hidden />
            {feedCount > 0 ? (
              <span className="bruit-tab-badge" aria-hidden>
                {feedCount > 99 ? "99+" : feedCount}
              </span>
            ) : null}
          </span>
          <span>{t("activity")}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("insights")}
          className={`bruit-tab cursor-pointer ${
            active === "insights" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "insights" ? "page" : undefined}
        >
          <ChartColumn size={20} strokeWidth={1.7} aria-hidden />
          <span>{t("insights")}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("help")}
          className={`bruit-tab cursor-pointer ${
            active === "help" ? "bruit-tab-active" : ""
          }`}
          aria-current={active === "help" ? "page" : undefined}
        >
          <Phone size={20} strokeWidth={1.7} aria-hidden />
          <span>{t("help")}</span>
        </button>
      </nav>
    </div>
  );
}
