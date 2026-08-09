"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef } from "react";
import {
  buildHistoryTimeline,
  formatHistoryRange,
  type HistorySlot,
} from "@/lib/history-timeline";
import { scrollChildIntoContainer } from "@/lib/scroll-into-container";
import type { NoiseReport } from "@/lib/supabase/types";

type HistoryScrubberProps = {
  reports: NoiseReport[];
  dayKey: string | null;
  slotId: string | null;
  onDayChange: (dayKey: string) => void;
  onSlotChange: (slotId: string) => void;
};

export function HistoryScrubber({
  reports,
  dayKey,
  slotId,
  onDayChange,
  onSlotChange,
}: HistoryScrubberProps) {
  const t = useTranslations("History");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const dayLabels = useMemo(
    () => ({
      today: tCommon("today"),
      yesterday: tCommon("yesterday"),
    }),
    [tCommon],
  );
  const timeline = useMemo(
    () => buildHistoryTimeline(reports, undefined, undefined, locale, dayLabels),
    [reports, locale, dayLabels],
  );
  const daysScrollerRef = useRef<HTMLDivElement | null>(null);
  const slotsScrollerRef = useRef<HTMLDivElement | null>(null);

  const activeDayKey = dayKey ?? timeline.defaultDayKey;
  const activeDay =
    timeline.days.find((day) => day.key === activeDayKey) ?? null;
  const slots = activeDayKey ? (timeline.slotsByDay[activeDayKey] ?? []) : [];
  const activeSlot =
    slots.find((slot) => slot.id === slotId) ??
    slots.find((slot) => slot.id === timeline.defaultSlotId) ??
    slots[slots.length - 1] ??
    null;

  const maxWeight = Math.max(1, ...slots.map((slot) => slot.weight));
  const selectedIndex = activeSlot
    ? slots.findIndex((slot) => slot.id === activeSlot.id)
    : -1;

  useEffect(() => {
    const container = daysScrollerRef.current;
    if (!container || !activeDayKey) {
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const node = container.querySelector<HTMLElement>(
      `[data-day-key="${activeDayKey}"]`,
    );
    if (node) {
      scrollChildIntoContainer(
        container,
        node,
        reduceMotion ? "auto" : "smooth",
      );
    }
  }, [activeDayKey]);

  useEffect(() => {
    const container = slotsScrollerRef.current;
    if (!container || !activeSlot) {
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const node = container.querySelector<HTMLElement>(
      `[data-slot-id="${activeSlot.id}"]`,
    );
    if (node) {
      scrollChildIntoContainer(
        container,
        node,
        reduceMotion ? "auto" : "smooth",
      );
    }
  }, [activeSlot]);

  if (timeline.days.length === 0 || slots.length === 0) {
    return null;
  }

  const selectSlot = (slot: HistorySlot) => {
    onSlotChange(slot.id);
  };

  return (
    <div className="bruit-grouped-list overflow-hidden">
      <div
        ref={daysScrollerRef}
        className="bruit-history-days"
        role="tablist"
        aria-label={t("chooseDay")}
      >
        {timeline.days.map((day) => {
          const selected = day.key === activeDayKey;
          return (
            <button
              key={day.key}
              type="button"
              role="tab"
              data-day-key={day.key}
              aria-selected={selected}
              onClick={() => {
                onDayChange(day.key);
                const daySlots = timeline.slotsByDay[day.key] ?? [];
                const withData = [...daySlots]
                  .reverse()
                  .find((slot) => slot.hasReports);
                const next = withData ?? daySlots[daySlots.length - 1] ?? null;
                if (next) {
                  onSlotChange(next.id);
                }
              }}
              className={`bruit-history-day cursor-pointer ${
                selected ? "bruit-history-day-active" : ""
              }`}
            >
              <span className="bruit-history-day-label">{day.shortLabel}</span>
              <span className="bruit-history-day-date">
                {new Date(day.startMs).getDate()}
              </span>
              <span
                className={`bruit-history-day-dot ${
                  day.count > 0 ? "bruit-history-day-dot-hot" : ""
                }`}
                aria-hidden
              />
              <span className="sr-only">
                {day.label}
                {day.count > 0
                  ? t("dayReports", { count: day.count })
                  : t("dayQuiet")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-1">
        <p className="text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
          {activeSlot
            ? formatHistoryRange(activeSlot.startMs, activeSlot.endMs, locale)
            : (activeDay?.label ?? t("pickTime"))}
        </p>
        <p
          className="mt-0.5 text-[0.84rem] font-medium text-[var(--bruit-muted)]"
          aria-live="polite"
        >
          {activeSlot
            ? activeSlot.count === 0
              ? t("quietHalfHour")
              : t("reportsHalfHour", { count: activeSlot.count })
            : null}
          {activeDay ? (
            <>
              <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                ·
              </span>
              {t("thatDay", { count: activeDay.count })}
            </>
          ) : null}
        </p>
      </div>

      <div
        ref={slotsScrollerRef}
        className="bruit-history-slots"
        role="listbox"
        aria-label={t("halfHourHistory")}
      >
        {slots.map((slot) => {
          const selected = slot.id === activeSlot?.id;
          const height =
            slot.count === 0
              ? 10
              : Math.max(14, Math.round((slot.weight / maxWeight) * 100));
          return (
            <button
              key={slot.id}
              type="button"
              role="option"
              data-slot-id={slot.id}
              aria-selected={selected}
              aria-label={`${slot.label}, ${
                slot.count === 0
                  ? t("slotQuiet")
                  : t("slotReports", { count: slot.count })
              }`}
              onClick={() => selectSlot(slot)}
              className={`bruit-history-slot cursor-pointer ${
                selected ? "bruit-history-slot-active" : ""
              }`}
            >
              <div className="bruit-history-slot-track" aria-hidden>
                <div
                  className={`bruit-history-slot-bar ${
                    slot.hasReports ? "" : "bruit-history-slot-bar-empty"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="bruit-history-slot-time">{slot.label}</span>
            </button>
          );
        })}
      </div>

      {selectedIndex >= 0 ? (
        <div className="px-4 pb-3 pt-0.5">
          <label className="sr-only" htmlFor="bruit-history-scrub">
            {t("scrubLabel")}
          </label>
          <input
            id="bruit-history-scrub"
            type="range"
            min={0}
            max={Math.max(0, slots.length - 1)}
            step={1}
            value={selectedIndex}
            onChange={(event) => {
              const next = slots[Number(event.target.value)];
              if (next) {
                selectSlot(next);
              }
            }}
            className="bruit-history-range cursor-pointer"
            aria-valuetext={
              activeSlot
                ? t("rangeReports", {
                    range: formatHistoryRange(
                      activeSlot.startMs,
                      activeSlot.endMs,
                      locale,
                    ),
                    count: activeSlot.count,
                  })
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
}
