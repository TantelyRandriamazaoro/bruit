import { HEATMAP_DAYS, INSIGHTS_DAYS } from "@/lib/constants";
import { clusterNearbyReports } from "@/lib/cluster-reports";
import {
  averageDb,
  measuredCount,
  peakDbAmong,
} from "@/lib/decibel";
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
  avgDb: number | null;
  peakDb: number | null;
  measuredCount: number;
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
  avgDb: number | null;
  peakDb: number | null;
  measuredCount: number;
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
  avgDb: number | null;
  peakDb: number | null;
  measuredCount: number;
};

const WEEKDAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export const TIME_SLOTS: TimeSlotMeta[] = [
  { id: 0, label: "0", shortLabel: "0", startHour: 0 },
  { id: 1, label: "1", shortLabel: "1", startHour: 3 },
  { id: 2, label: "2", shortLabel: "2", startHour: 6 },
  { id: 3, label: "3", shortLabel: "3", startHour: 9 },
  { id: 4, label: "4", shortLabel: "4", startHour: 12 },
  { id: 5, label: "5", shortLabel: "5", startHour: 15 },
  { id: 6, label: "6", shortLabel: "6", startHour: 18 },
  { id: 7, label: "7", shortLabel: "7", startHour: 21 },
];

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekdayShort(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: "short" });
}

function formatHourLabel(hour: number, locale: string): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(locale, { hour: "numeric" });
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function slotForHour(hour: number): number {
  return Math.min(7, Math.floor(hour / 3));
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
      label: category.id,
      count,
      share: total > 0 ? count / total : 0,
    };
  })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function peakHourFor(reports: NoiseReport[], locale: string): string | null {
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
  return bestHour >= 0 ? formatHourLabel(bestHour, locale) : null;
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
  locale: string,
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
  const dbSource =
    reportsCurrent.length > 0 ? reportsCurrent : cluster.reports;

  return {
    id: cluster.id,
    lat: cluster.lat,
    lng: cluster.lng,
    cellKey: cluster.cellKey,
    label: "",
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
      locale,
    ),
    avgDb: averageDb(dbSource),
    peakDb: peakDbAmong(dbSource),
    measuredCount: measuredCount(dbSource),
  };
}

function buildTimeMatrix(
  reports: NoiseReport[],
  weekdayLabels: string[],
  slotLabels: string[],
): {
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
        label: `${weekdayLabels[weekday]} ${slotLabels[slot]}`,
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
          weekdayLabel: weekdayLabels[Number(peakKey.split(":")[0])],
          slotLabel: slotLabels[Number(peakKey.split(":")[1])],
          value: peakValue,
        }
      : null;

  return { cells, max, peak };
}

function buildDayBars(
  reports: NoiseReport[],
  now = Date.now(),
  locale = "en",
  todayLabel = "Today",
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
      label: isToday ? todayLabel : weekdayShort(date, locale),
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
      label: intensity.id,
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
  avgDb: number | null;
  peakDb: number | null;
  measuredCount: number;
};

export type InsightLabelMessages = {
  today: string;
  weekday: (index: number) => string;
  timeSlot: (id: number) => string;
  trend: (status: HotspotStatus) => string;
};

/** Analytics for an arbitrary report slice (day, half-hour, etc.). */
export function buildScopedReportInsights(
  reports: NoiseReport[],
  locale = "en",
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
    peakHourLabel: peakHourFor(reports, locale),
    topCategory: categories[0] ?? null,
    avgDb: averageDb(reports),
    peakDb: peakDbAmong(reports),
    measuredCount: measuredCount(reports),
  };
}

/** Scoped analytics for a single hotspot drill-down. */
export function buildHotspotDetail(
  hotspot: NoiseHotspot,
  now = Date.now(),
  locale = "en",
  labels?: Pick<InsightLabelMessages, "today" | "weekday" | "timeSlot">,
): HotspotDetailInsights {
  const currentStart = now - HEATMAP_DAYS * 24 * 60 * 60 * 1000;
  const scoped =
    hotspot.reportsCurrent.length > 0
      ? hotspot.reportsCurrent
      : hotspot.reports.filter((report) => {
          const t = new Date(report.created_at).getTime();
          return Number.isFinite(t) && t >= currentStart;
        });

  const weekdayLabels = WEEKDAY_KEYS.map((key) =>
    labels ? labels.weekday(Number(key)) : key,
  );
  const slotLabels = TIME_SLOTS.map((slot) =>
    labels ? labels.timeSlot(slot.id) : String(slot.id),
  );
  const matrix = buildTimeMatrix(
    scoped.length > 0 ? scoped : hotspot.reports,
    weekdayLabels,
    slotLabels,
  );
  const intensities = intensityBreakdown(
    scoped.length > 0 ? scoped : hotspot.reports,
  );
  const loudCount = intensities
    .filter((item) => item.id !== "moderate")
    .reduce((sum, item) => sum + item.count, 0);
  const total = intensities.reduce((sum, item) => sum + item.count, 0);

  return {
    windowDays: HEATMAP_DAYS,
    timeSlots: TIME_SLOTS.map((slot, index) => ({
      ...slot,
      label: slotLabels[index],
      shortLabel: slotLabels[index],
    })),
    weekdayLabels,
    timeMatrix: matrix.cells,
    timeMatrixMax: matrix.max,
    peakWindow: matrix.peak,
    days: buildDayBars(scoped, now, locale, labels?.today ?? "Today"),
    intensities,
    loudShare: total > 0 ? loudCount / total : 0,
    avgDb: averageDb(scoped.length > 0 ? scoped : hotspot.reports),
    peakDb: peakDbAmong(scoped.length > 0 ? scoped : hotspot.reports),
    measuredCount: measuredCount(scoped.length > 0 ? scoped : hotspot.reports),
  };
}

export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function buildMunicipalInsights(
  reports: NoiseReport[],
  now = Date.now(),
  locale = "en",
  labels?: InsightLabelMessages,
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
    .map((cluster) =>
      buildHotspot(cluster, currentStart, previousStart, locale),
    )
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

  const trendStatuses = [
    "new",
    "escalating",
    "cooling",
    "recurring",
    "persistent",
  ] as const;
  const trends: TrendBucket[] = trendStatuses
    .map((status) => ({
      status,
      label: labels ? labels.trend(status) : status,
      hotspots: hotspots.filter((item) => item.status === status).slice(0, 6),
    }))
    .filter((bucket) => bucket.hotspots.length > 0);

  const weekdayLabels = WEEKDAY_KEYS.map((key) =>
    labels ? labels.weekday(Number(key)) : key,
  );
  const slotLabels = TIME_SLOTS.map((slot) =>
    labels ? labels.timeSlot(slot.id) : String(slot.id),
  );
  const matrix = buildTimeMatrix(currentReports, weekdayLabels, slotLabels);
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
    timeSlots: TIME_SLOTS.map((slot, index) => ({
      ...slot,
      label: slotLabels[index],
      shortLabel: slotLabels[index],
    })),
    weekdayLabels,
    timeMatrix: matrix.cells,
    timeMatrixMax: matrix.max,
    peakWindow: matrix.peak,
    avgDb: averageDb(currentReports),
    peakDb: peakDbAmong(currentReports),
    measuredCount: measuredCount(currentReports),
  };
}
