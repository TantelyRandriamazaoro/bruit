import { INSIGHTS_DAYS } from "@/lib/constants";
import { intensityWeight } from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

export const HISTORY_SLOT_MS = 30 * 60 * 1000;
export const SLOTS_PER_DAY = 48;

export type HistoryDay = {
  key: string;
  label: string;
  shortLabel: string;
  startMs: number;
  endMs: number;
  count: number;
  isToday: boolean;
};

export type HistorySlot = {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  label: string;
  hourLabel: string;
  count: number;
  weight: number;
  hasReports: boolean;
};

export type HistoryTimeline = {
  days: HistoryDay[];
  slotsByDay: Record<string, HistorySlot[]>;
  defaultDayKey: string | null;
  defaultSlotId: string | null;
};

export type HistoryDayLabels = {
  today: string;
  yesterday: string;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSlotLabel(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHourLabel(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
  });
}

function dayLabel(
  date: Date,
  isToday: boolean,
  isYesterday: boolean,
  labels: HistoryDayLabels,
  locale: string,
): string {
  if (isToday) {
    return labels.today;
  }
  if (isYesterday) {
    return labels.yesterday;
  }
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function shortDayLabel(
  date: Date,
  isToday: boolean,
  labels: HistoryDayLabels,
  locale: string,
): string {
  if (isToday) {
    return labels.today;
  }
  return date.toLocaleDateString(locale, { weekday: "short" });
}

export function reportsInSlot(
  reports: NoiseReport[],
  startMs: number,
  endMs: number,
): NoiseReport[] {
  return reports.filter((report) => {
    const t = new Date(report.created_at).getTime();
    return Number.isFinite(t) && t >= startMs && t < endMs;
  });
}

/**
 * Build Weather-style day + 30-minute timeline covering the Insights window.
 * Slots exist for every half-hour so quiet periods are scrubbable too.
 */
export function buildHistoryTimeline(
  reports: NoiseReport[],
  now = Date.now(),
  dayCount = INSIGHTS_DAYS,
  locale = "en",
  dayLabels: HistoryDayLabels = { today: "Today", yesterday: "Yesterday" },
): HistoryTimeline {
  const todayStart = startOfLocalDay(new Date(now));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const days: HistoryDay[] = [];
  const slotsByDay: Record<string, HistorySlot[]> = {};

  let defaultDayKey: string | null = null;
  let defaultSlotId: string | null = null;
  let bestRecentSlot: { id: string; dayKey: string; startMs: number } | null =
    null;

  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime();
    const key = localDayKey(dayStart);
    const isToday = key === localDayKey(todayStart);
    const isYesterday = key === localDayKey(yesterdayStart);

    const dayReports = reportsInSlot(reports, startMs, endMs);
    days.push({
      key,
      label: dayLabel(dayStart, isToday, isYesterday, dayLabels, locale),
      shortLabel: shortDayLabel(dayStart, isToday, dayLabels, locale),
      startMs,
      endMs,
      count: dayReports.length,
      isToday,
    });

    const slots: HistorySlot[] = [];
    for (let index = 0; index < SLOTS_PER_DAY; index += 1) {
      const slotStart = startMs + index * HISTORY_SLOT_MS;
      const slotEnd = slotStart + HISTORY_SLOT_MS;

      // Don't offer future slots for today
      if (slotStart > now) {
        break;
      }

      const slotReports = reportsInSlot(reports, slotStart, slotEnd);
      const weight = slotReports.reduce(
        (sum, report) => sum + intensityWeight(report.intensity),
        0,
      );
      const startDate = new Date(slotStart);
      const id = `${key}-${index}`;
      const slot: HistorySlot = {
        id,
        index,
        startMs: slotStart,
        endMs: slotEnd,
        label: formatSlotLabel(startDate, locale),
        hourLabel: formatHourLabel(startDate, locale),
        count: slotReports.length,
        weight,
        hasReports: slotReports.length > 0,
      };
      slots.push(slot);

      if (
        slot.hasReports &&
        (!bestRecentSlot || slot.startMs > bestRecentSlot.startMs)
      ) {
        bestRecentSlot = { id, dayKey: key, startMs: slot.startMs };
      }
    }

    slotsByDay[key] = slots;
    if (isToday) {
      defaultDayKey = key;
    }
  }

  if (!defaultDayKey && days.length > 0) {
    const withData = [...days].reverse().find((day) => day.count > 0);
    defaultDayKey = withData?.key ?? days[days.length - 1]?.key ?? null;
  }

  if (bestRecentSlot) {
    defaultDayKey = bestRecentSlot.dayKey;
    defaultSlotId = bestRecentSlot.id;
  } else if (defaultDayKey) {
    const slots = slotsByDay[defaultDayKey] ?? [];
    defaultSlotId = slots[slots.length - 1]?.id ?? null;
  }

  return {
    days,
    slotsByDay,
    defaultDayKey,
    defaultSlotId,
  };
}

export function formatHistoryRange(
  startMs: number,
  endMs: number,
  locale = "en",
): string {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const dayPart = start.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const startTime = formatSlotLabel(start, locale);
  const endTime = formatSlotLabel(end, locale);
  return `${dayPart} · ${startTime}–${endTime}`;
}
