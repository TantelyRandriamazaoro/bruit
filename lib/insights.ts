import { HEATMAP_DAYS, INSIGHTS_DAYS } from "@/lib/constants";
import { clusterNearbyReports } from "@/lib/cluster-reports";
import {
  NOISE_CATEGORIES,
  NOISE_INTENSITIES,
  intensityWeight,
  type NoiseCategory,
  type NoiseIntensity,
} from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

export type HotspotStatus =
  | "new"
  | "escalating"
  | "cooling"
  | "recurring"
  | "persistent"
  | "active";

export type HotspotCategoryShare = {
  id: NoiseCategory;
  label: string;
  count: number;
  share: number;
};

export type NoiseHotspot = {
  id: string;
  lat: number;
  lng: number;
  cellKey: string;
  label: string;
  reports: NoiseReport[];
  reportsCurrent: NoiseReport[];
  currentCount: number;
  previousCount: number;
  distinctDays: number;
  previousDistinctDays: number;
  avgWeight: number;
  priority: number;
  status: HotspotStatus;
  growthRate: number | null;
  topCategory: HotspotCategoryShare | null;
  categories: HotspotCategoryShare[];
  peakHourLabel: string | null;
};

export type TimeMatrixCell = {
  weekday: number;
  slot: number;
  value: number;
  label: string;
};

export type TimeSlotMeta = {
  id: number;
  label: string;
  shortLabel: string;
  startHour: number;
};

export type TrendBucket = {
  status: HotspotStatus;
  label: string;
  hotspots: NoiseHotspot[];
};

export type DayBarInsight = {
  key: string;
  label: string;
  count: number;
  isToday: boolean;
};

export type IntensityShare = {
  id: NoiseIntensity;
  label: string;
  count: number;
  share: number;
};

export type HotspotDetailInsights = {
  windowDays: number;
  timeSlots: TimeSlotMeta[];
  weekdayLabels: string[];
  timeMatrix: TimeMatrixCell[];
  timeMatrixMax: number;
  peakWindow: {
    weekdayLabel: string;
    slotLabel: string;
    value: number;
  } | null;
  days: DayBarInsight[];
  intensities: IntensityShare[];
  loudShare: number;
};

export type MunicipalInsights = {
  windowDays: number;
  compareDays: number;
  currentTotal: number;
  previousTotal: number;
  deltaVsPreviousWeek: number | null;
  hotspotCount: number;
  recurringCount: number;
  newCount: number;
  escalatingCount: number;
  coolingCount: number;
  /** Active + cooling hotspots, ranked for browse/drill-down */
  hotspots: NoiseHotspot[];
  recurring: NoiseHotspot[];
  trends: TrendBucket[];
  timeSlots: TimeSlotMeta[];
  weekdayLabels: string[];
  timeMatrix: TimeMatrixCell[];
  timeMatrixMax: number;
  peakWindow: {
    weekdayLabel: string;
    slotLabel: string;
    value: number;
  } | null;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const TIME_SLOTS: TimeSlotMeta[] = [
  { id: 0, label: "12–3 AM", shortLabel: "Night", startHour: 0 },
  { id: 1, label: "3–6 AM", shortLabel: "Early", startHour: 3 },
  { id: 2, label: "6–9 AM", shortLabel: "Morning", startHour: 6 },
  { id: 3, label: "9–12 PM", shortLabel: "Midday", startHour: 9 },
  { id: 4, label: "12–3 PM", shortLabel: "Afternoon", startHour: 12 },
  { id: 5, label: "3–6 PM", shortLabel: "Late day", startHour: 15 },
  { id: 6, label: "6–9 PM", shortLabel: "Evening", startHour: 18 },
  { id: 7, label: "9–12 AM", shortLabel: "Night", startHour: 21 },
];

const STATUS_LABEL: Record<HotspotStatus, string> = {
  new: "New",
  escalating: "Escalating",
  cooling: "Cooling",
  recurring: "Recurring",
  persistent: "Persistent",
  active: "Active",
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

function weekdayShort(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function slotForHour(hour: number): number {
  return Math.min(7, Math.floor(hour / 3));
}

function areaLabel(lat: number, lng: number): string {
  return `Near ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;
}

function categoryBreakdown(reports: NoiseReport[]): HotspotCategoryShare[] {
  const counts = new Map<NoiseCategory, number>();
  for (const category of NOISE_CATEGORIES) {
    counts.set(category.id, 0);
  }

  for (const report of reports) {
    const id = (
      NOISE_CATEGORIES.find((item) => item.id === report.category)?.id ??
      "other"
    ) as NoiseCategory;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const total = reports.length;
  return NOISE_CATEGORIES.map((category) => {
    const count = counts.get(category.id) ?? 0;
    return {
      id: category.id,
      label: category.label,
      count,
      share: total > 0 ? count / total : 0,
    };
  })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function peakHourFor(reports: NoiseReport[]): string | null {
  if (reports.length === 0) {
    return null;
  }
  const hours = new Map<number, number>();
  for (const report of reports) {
    const created = new Date(report.created_at);
    if (!Number.isFinite(created.getTime())) {
      continue;
    }
    const hour = created.getHours();
    hours.set(hour, (hours.get(hour) ?? 0) + intensityWeight(report.intensity));
  }

  let bestHour = -1;
  let bestValue = 0;
  for (const [hour, value] of hours) {
    if (value > bestValue) {
      bestHour = hour;
      bestValue = value;
    }
  }
  return bestHour >= 0 ? formatHourLabel(bestHour) : null;
}

function classifyStatus(input: {
  currentCount: number;
  previousCount: number;
  distinctDays: number;
  previousDistinctDays: number;
}): HotspotStatus {
  const { currentCount, previousCount, distinctDays, previousDistinctDays } =
    input;

  if (currentCount === 0 && previousCount > 0) {
    return "cooling";
  }
  if (previousCount === 0 && currentCount > 0) {
    return "new";
  }
  if (previousCount > 0 && currentCount >= previousCount * 1.4) {
    return "escalating";
  }
  if (previousCount >= 2 && currentCount <= previousCount * 0.6) {
    return "cooling";
  }
  if (distinctDays >= 3) {
    return "recurring";
  }
  if (
    currentCount > 0 &&
    previousCount > 0 &&
    distinctDays + previousDistinctDays >= 5
  ) {
    return "persistent";
  }
  return "active";
}

function buildHotspot(
  cluster: ReturnType<typeof clusterNearbyReports>[number],
  currentStart: number,
  previousStart: number,
): NoiseHotspot | null {
  const reportsCurrent = cluster.reports.filter((report) => {
    const t = new Date(report.created_at).getTime();
    return t >= currentStart;
  });
  const reportsPrevious = cluster.reports.filter((report) => {
    const t = new Date(report.created_at).getTime();
    return t >= previousStart && t < currentStart;
  });

  if (reportsCurrent.length === 0 && reportsPrevious.length === 0) {
    return null;
  }

  const extremeCurrent = reportsCurrent.some(
    (report) => report.intensity === "extreme",
  );
  if (reportsCurrent.length + reportsPrevious.length < 2 && !extremeCurrent) {
    return null;
  }

  const currentDays = new Set(
    reportsCurrent.map((report) => localDayKey(new Date(report.created_at))),
  );
  const previousDays = new Set(
    reportsPrevious.map((report) => localDayKey(new Date(report.created_at))),
  );

  const currentCount = reportsCurrent.length;
  const previousCount = reportsPrevious.length;
  const distinctDays = currentDays.size;
  const previousDistinctDays = previousDays.size;
  const weightSource =
    reportsCurrent.length > 0 ? reportsCurrent : reportsPrevious;
  const avgWeight =
    weightSource.reduce(
      (sum, report) => sum + intensityWeight(report.intensity),
      0,
    ) / Math.max(1, weightSource.length);

  const growthRate =
    previousCount === 0
      ? currentCount > 0
        ? null
        : 0
      : (currentCount - previousCount) / previousCount;

  const growthBoost =
    growthRate === null ? 1 : 1 + Math.max(0, Math.min(2, growthRate));
  const priority =
    Math.max(currentCount, 0.35) *
    Math.max(distinctDays, currentCount > 0 ? 1 : 0.25) *
    avgWeight *
    growthBoost *
    (currentCount === 0 ? 0.2 : 1);

  const categories = categoryBreakdown(
    reportsCurrent.length > 0 ? reportsCurrent : cluster.reports,
  );
  const status = classifyStatus({
    currentCount,
    previousCount,
    distinctDays,
    previousDistinctDays,
  });

  return {
    id: cluster.id,
    lat: cluster.lat,
    lng: cluster.lng,
    cellKey: cluster.cellKey,
    label: areaLabel(cluster.lat, cluster.lng),
    reports: cluster.reports,
    reportsCurrent,
    currentCount,
    previousCount,
    distinctDays,
    previousDistinctDays,
    avgWeight,
    priority,
    status,
    growthRate,
    topCategory: categories[0] ?? null,
    categories,
    peakHourLabel: peakHourFor(
      reportsCurrent.length > 0 ? reportsCurrent : cluster.reports,
    ),
  };
}

function buildTimeMatrix(reports: NoiseReport[]): {
  cells: TimeMatrixCell[];
  max: number;
  peak: MunicipalInsights["peakWindow"];
} {
  const values = new Map<string, number>();
  let max = 0;

  for (const report of reports) {
    const created = new Date(report.created_at);
    if (!Number.isFinite(created.getTime())) {
      continue;
    }
    const weekday = mondayIndex(created);
    const slot = slotForHour(created.getHours());
    const key = `${weekday}:${slot}`;
    const next = (values.get(key) ?? 0) + intensityWeight(report.intensity);
    values.set(key, next);
    max = Math.max(max, next);
  }

  const cells: TimeMatrixCell[] = [];
  let peakKey = "";
  let peakValue = 0;

  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let slot = 0; slot < TIME_SLOTS.length; slot += 1) {
      const value = values.get(`${weekday}:${slot}`) ?? 0;
      cells.push({
        weekday,
        slot,
        value,
        label: `${WEEKDAY_LABELS[weekday]} ${TIME_SLOTS[slot].label}`,
      });
      if (value > peakValue) {
        peakValue = value;
        peakKey = `${weekday}:${slot}`;
      }
    }
  }

  const peak =
    peakValue > 0 && peakKey
      ? {
          weekdayLabel: WEEKDAY_LABELS[Number(peakKey.split(":")[0])],
          slotLabel: TIME_SLOTS[Number(peakKey.split(":")[1])].label,
          value: peakValue,
        }
      : null;

  return { cells, max, peak };
}

function buildDayBars(
  reports: NoiseReport[],
  now = Date.now(),
): DayBarInsight[] {
  const todayStart = startOfLocalDay(new Date(now));
  const todayKey = localDayKey(todayStart);
  const dayCounts = new Map<string, number>();

  for (let i = HEATMAP_DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    dayCounts.set(localDayKey(day), 0);
  }

  for (const report of reports) {
    const created = new Date(report.created_at);
    if (!Number.isFinite(created.getTime())) {
      continue;
    }
    const key = localDayKey(created);
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  return [...dayCounts.entries()].map(([key, count]) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    const isToday = key === todayKey;
    return {
      key,
      label: isToday ? "Today" : weekdayShort(date),
      count,
      isToday,
    };
  });
}

function intensityBreakdown(reports: NoiseReport[]): IntensityShare[] {
  const counts = new Map<NoiseIntensity, number>();
  for (const intensity of NOISE_INTENSITIES) {
    counts.set(intensity.id, 0);
  }
  for (const report of reports) {
    const id = (
      NOISE_INTENSITIES.find((item) => item.id === report.intensity)?.id ??
      "loud"
    ) as NoiseIntensity;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const total = reports.length;
  return NOISE_INTENSITIES.map((intensity) => {
    const count = counts.get(intensity.id) ?? 0;
    return {
      id: intensity.id,
      label: intensity.label,
      count,
      share: total > 0 ? count / total : 0,
    };
  }).filter((item) => item.count > 0);
}

export type ScopedReportInsights = {
  total: number;
  categories: HotspotCategoryShare[];
  intensities: IntensityShare[];
  loudShare: number;
  peakHourLabel: string | null;
  topCategory: HotspotCategoryShare | null;
};

/** Analytics for an arbitrary report slice (day, half-hour, etc.). */
export function buildScopedReportInsights(
  reports: NoiseReport[],
): ScopedReportInsights {
  const categories = categoryBreakdown(reports);
  const intensities = intensityBreakdown(reports);
  const loudCount = intensities
    .filter((item) => item.id !== "moderate")
    .reduce((sum, item) => sum + item.count, 0);
  const total = reports.length;

  return {
    total,
    categories,
    intensities,
    loudShare: total > 0 ? loudCount / total : 0,
    peakHourLabel: peakHourFor(reports),
    topCategory: categories[0] ?? null,
  };
}

/** Scoped analytics for a single hotspot drill-down. */
export function buildHotspotDetail(
  hotspot: NoiseHotspot,
  now = Date.now(),
): HotspotDetailInsights {
  const currentStart = now - HEATMAP_DAYS * 24 * 60 * 60 * 1000;
  const scoped =
    hotspot.reportsCurrent.length > 0
      ? hotspot.reportsCurrent
      : hotspot.reports.filter((report) => {
          const t = new Date(report.created_at).getTime();
          return Number.isFinite(t) && t >= currentStart;
        });

  const matrix = buildTimeMatrix(scoped.length > 0 ? scoped : hotspot.reports);
  const intensities = intensityBreakdown(
    scoped.length > 0 ? scoped : hotspot.reports,
  );
  const loudCount = intensities
    .filter((item) => item.id !== "moderate")
    .reduce((sum, item) => sum + item.count, 0);
  const total = intensities.reduce((sum, item) => sum + item.count, 0);

  return {
    windowDays: HEATMAP_DAYS,
    timeSlots: TIME_SLOTS,
    weekdayLabels: WEEKDAY_LABELS,
    timeMatrix: matrix.cells,
    timeMatrixMax: matrix.max,
    peakWindow: matrix.peak,
    days: buildDayBars(scoped, now),
    intensities,
    loudShare: total > 0 ? loudCount / total : 0,
  };
}

export function hotspotStatusLabel(status: HotspotStatus): string {
  return STATUS_LABEL[status];
}

export function formatGrowth(growthRate: number | null): string | null {
  if (growthRate === null) {
    return "No prior week";
  }
  if (growthRate === 0) {
    return "Same as prior week";
  }
  const pct = Math.round(Math.abs(growthRate) * 100);
  return growthRate > 0
    ? `Up ${pct}% vs prior week`
    : `Down ${pct}% vs prior week`;
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function formatWeekDelta(delta: number | null): string | null {
  if (delta === null) {
    return null;
  }
  if (delta === 0) {
    return "Same as prior week";
  }
  if (delta > 0) {
    return `Up ${delta} vs prior week`;
  }
  return `Down ${Math.abs(delta)} vs prior week`;
}

export function buildMunicipalInsights(
  reports: NoiseReport[],
  now = Date.now(),
): MunicipalInsights {
  const currentStart = now - HEATMAP_DAYS * 24 * 60 * 60 * 1000;
  const previousStart = now - INSIGHTS_DAYS * 24 * 60 * 60 * 1000;

  const currentReports = reports.filter((report) => {
    const t = new Date(report.created_at).getTime();
    return Number.isFinite(t) && t >= currentStart;
  });
  const previousReports = reports.filter((report) => {
    const t = new Date(report.created_at).getTime();
    return Number.isFinite(t) && t >= previousStart && t < currentStart;
  });

  const clusters = clusterNearbyReports(reports);
  const hotspots = clusters
    .map((cluster) => buildHotspot(cluster, currentStart, previousStart))
    .filter((item): item is NoiseHotspot => item !== null)
    .filter((item) => item.currentCount > 0 || item.status === "cooling")
    .sort((a, b) => b.priority - a.priority);

  const activeHotspots = hotspots.filter((item) => item.currentCount > 0);
  const recurring = activeHotspots.filter(
    (item) =>
      item.status === "recurring" ||
      item.status === "persistent" ||
      item.distinctDays >= 3,
  );

  const trends: TrendBucket[] = (
    [
      ["new", "New this week"],
      ["escalating", "Escalating"],
      ["cooling", "Cooling off"],
      ["recurring", "Recurring"],
      ["persistent", "Persistent"],
    ] as const
  )
    .map(([status, label]) => ({
      status,
      label,
      hotspots: hotspots.filter((item) => item.status === status).slice(0, 6),
    }))
    .filter((bucket) => bucket.hotspots.length > 0);

  const matrix = buildTimeMatrix(currentReports);
  const deltaVsPreviousWeek =
    currentReports.length === 0 && previousReports.length === 0
      ? null
      : currentReports.length - previousReports.length;

  return {
    windowDays: HEATMAP_DAYS,
    compareDays: HEATMAP_DAYS,
    currentTotal: currentReports.length,
    previousTotal: previousReports.length,
    deltaVsPreviousWeek,
    hotspotCount: activeHotspots.length,
    recurringCount: recurring.length,
    newCount: hotspots.filter((item) => item.status === "new").length,
    escalatingCount: hotspots.filter((item) => item.status === "escalating")
      .length,
    coolingCount: hotspots.filter((item) => item.status === "cooling").length,
    hotspots,
    recurring,
    trends,
    timeSlots: TIME_SLOTS,
    weekdayLabels: WEEKDAY_LABELS,
    timeMatrix: matrix.cells,
    timeMatrixMax: matrix.max,
    peakWindow: matrix.peak,
  };
}
