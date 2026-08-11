"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { ActivityScope } from "@/lib/activity-scope";
import { scrollChildIntoContainer } from "@/lib/scroll-into-container";

type ActivityDayChromeProps = {
  scopes: ActivityScope[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Extra class on the chrome root (e.g. drawer inset). */
  className?: string;
};

export function ActivityDayChrome({
  scopes,
  activeKey,
  onChange,
  className,
}: ActivityDayChromeProps) {
  const t = useTranslations("Feed");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollerRef.current;
    if (!container || !activeKey) {
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const node = container.querySelector<HTMLElement>(
      `[data-scope-key="${activeKey}"]`,
    );
    if (node) {
      scrollChildIntoContainer(
        container,
        node,
        reduceMotion ? "auto" : "smooth",
      );
    }
  }, [activeKey]);

  if (scopes.length === 0) {
    return null;
  }

  return (
    <div
      className={
        className
          ? `bruit-activity-scope ${className}`
          : "bruit-activity-scope"
      }
    >
      <div
        ref={scrollerRef}
        className="bruit-history-days"
        role="tablist"
        aria-label={t("chooseDay")}
      >
        {scopes.map((scope) => {
          const selected = scope.key === activeKey;
          return (
            <button
              key={scope.key}
              type="button"
              role="tab"
              data-scope-key={scope.key}
              aria-selected={selected}
              onClick={() => onChange(scope.key)}
              className={`bruit-history-day cursor-pointer ${
                selected ? "bruit-history-day-active" : ""
              }`}
            >
              <span className="bruit-history-day-label">{scope.shortLabel}</span>
              {scope.dateText ? (
                <span className="bruit-history-day-date">{scope.dateText}</span>
              ) : (
                <span className="bruit-history-day-date bruit-history-day-date-blank">
                  ·
                </span>
              )}
              <span
                className={`bruit-history-day-dot ${
                  scope.count > 0 ? "bruit-history-day-dot-hot" : ""
                }`}
                aria-hidden
              />
              <span className="sr-only">
                {scope.label}
                {scope.count > 0
                  ? t("dayReports", { count: scope.count })
                  : t("dayQuiet")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
