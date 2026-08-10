import { HEATMAP_DAYS } from "@/lib/constants";
import { reportsInSlot } from "@/lib/history-timeline";
import type { NoiseReport } from "@/lib/supabase/types";

/** Rolling window scope — rightmost in the chrome (most current). */
export const ACTIVITY_SCOPE_24H = "rolling-24h";

export type ActivityScopeLabels = {
  rolling24h: string;
  rolling24hShort: string;
  today: string;
  yesterday: string;
};

export type ActivityScope = {
  key: string;
  /** Pill eyebrow (24h / T / F). */
  shortLabel: string;
  /** Full caption under the title. */
  label: string;
  /** Large pill value (day-of-month), empty for the 24h slot. */
  dateText: string;
  startMs: number;
  endMs: number;
  count: number;
  isRolling24h: boolean;
  isToday: boolean;
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

/** Single-letter weekday when the locale allows (T, F…); otherwise short weekday. */
function weekdayPillLabel(date: Date, locale: string): string {
  const narrow = date.toLocaleDateString(locale, { weekday: "narrow" }).trim();
  if (narrow.length > 0 && narrow.length <= 2) {
    return narrow;
  }
  return date.toLocaleDateString(locale, { weekday: "short" });
}

/**
 * Activity chrome scopes: older calendar days → Today → Last 24h (LTR).
 * Default selection is the rolling 24h slot.
 */
export function buildActivityScopes(
  reports: NoiseReport[],
  labels: ActivityScopeLabels,
  locale = "en",
  now = Date.now(),
  dayCount = HEATMAP_DAYS,
): ActivityScope[] {
  const scopes: ActivityScope[] = [];
  const todayStart = startOfLocalDay(new Date(now));
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const startMs = dayStart.getTime();
    const endMs = dayEnd.getTime();
    const key = localDayKey(dayStart);
    const isToday = i === 0;
    const isYesterday = key === localDayKey(yesterdayStart);
    const dayReports = reportsInSlot(reports, startMs, endMs);

    let label: string;
    if (isToday) {
      label = labels.today;
    } else if (isYesterday) {
      label = labels.yesterday;
    } else {
      label = dayStart.toLocaleDateString(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    scopes.push({
      key,
      shortLabel: weekdayPillLabel(dayStart, locale),
      label,
      dateText: String(dayStart.getDate()),
      startMs,
      endMs,
      count: dayReports.length,
      isRolling24h: false,
      isToday,
    });
  }

  const rollingStart = now - 24 * 60 * 60 * 1000;
  const rollingReports = reportsInSlot(reports, rollingStart, now + 1);
  scopes.push({
    key: ACTIVITY_SCOPE_24H,
    shortLabel: labels.rolling24hShort,
    label: labels.rolling24h,
    dateText: "",
    startMs: rollingStart,
    endMs: now + 1,
    count: rollingReports.length,
    isRolling24h: true,
    isToday: false,
  });

  return scopes;
}

export function filterReportsByScope(
  reports: NoiseReport[],
  scope: Pick<ActivityScope, "startMs" | "endMs">,
): NoiseReport[] {
  return reportsInSlot(reports, scope.startMs, scope.endMs);
}
