"use client";

import { ChartColumn, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { HistoryScrubber } from "@/components/HistoryScrubber";
import { RegionMapCard } from "@/components/RegionMapCard";
import type { AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import {
  buildHistoryTimeline,
  reportsInSlot,
} from "@/lib/history-timeline";
import {
  buildRegionalBrief,
  buildScopedReportInsights,
  formatPercent,
  listActiveRegions,
  type HotspotStatus,
  type NoiseHotspot,
  type SituationTone,
} from "@/lib/insights";
import { formatHistoryRange } from "@/lib/history-timeline";
import {
  categoryLabel,
  formatWeekDeltaMessage,
  hotspotStatusLabel,
  intensityLabel,
} from "@/lib/i18n-helpers";
import { decibelTint } from "@/lib/decibel";
import {
  UNKNOWN_REGION,
} from "@/lib/madagascar-regions";
import { INTENSITY_TINT } from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

const HotspotMiniMap = dynamic(
  () =>
    import("@/components/HotspotMiniMap").then((mod) => mod.HotspotMiniMap),
  {
    ssr: false,
    loading: () => <div className="bruit-mini-map bruit-mini-map-loading" />,
  },
);

type InsightsViewProps = {
  reports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  container?: HTMLElement | null;
  onReport: () => void;
  canReport: boolean;
  onOpenHotspot?: (hotspot: { lat: number; lng: number }) => void;
};

const STATUS_TONE: Record<HotspotStatus, string> = {
  new: "bruit-status-new",
  escalating: "bruit-status-escalating",
  cooling: "bruit-status-cooling",
  recurring: "bruit-status-recurring",
  persistent: "bruit-status-persistent",
  active: "bruit-status-active",
};


function Chevron() {
  return (
    <ChevronRight
      size={14}
      strokeWidth={2}
      className="shrink-0 text-[var(--bruit-hairline-strong)]"
      aria-hidden
    />
  );
}

function labeledHotspot(
  hotspot: NoiseHotspot,
  labels: AreaLabelMap,
  fallbackLabel: string,
): NoiseHotspot {
  const name = labels[hotspot.cellKey];
  return { ...hotspot, label: name ?? fallbackLabel };
}

function HotspotDetail({
  hotspot,
  onBack,
  onShowMap,
}: {
  hotspot: NoiseHotspot;
  onBack: () => void;
  onShowMap: () => void;
}) {
  const t = useTranslations("Insights");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const locale = useLocale();
  const dayLabels = useMemo(
    () => ({
      today: tCommon("today"),
      yesterday: tCommon("yesterday"),
    }),
    [tCommon],
  );

  const timeline = useMemo(
    () =>
      buildHistoryTimeline(
        hotspot.reports,
        Date.now(),
        undefined,
        locale,
        dayLabels,
      ),
    [hotspot.reports, locale, dayLabels],
  );
  const [historyDayKey, setHistoryDayKey] = useState<string | null>(
    timeline.defaultDayKey,
  );
  const [historySlotId, setHistorySlotId] = useState<string | null>(
    timeline.defaultSlotId,
  );

  useEffect(() => {
    const next = buildHistoryTimeline(
      hotspot.reports,
      Date.now(),
      undefined,
      locale,
      dayLabels,
    );
    const frame = window.requestAnimationFrame(() => {
      setHistoryDayKey(next.defaultDayKey);
      setHistorySlotId(next.defaultSlotId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hotspot.id, hotspot.reports, locale, dayLabels]);

  const activeDay = useMemo(
    () => timeline.days.find((day) => day.key === historyDayKey) ?? null,
    [historyDayKey, timeline.days],
  );

  const activeSlot = useMemo(() => {
    if (!historyDayKey) {
      return null;
    }
    const slots = timeline.slotsByDay[historyDayKey] ?? [];
    return (
      slots.find((slot) => slot.id === historySlotId) ??
      slots[slots.length - 1] ??
      null
    );
  }, [historyDayKey, historySlotId, timeline.slotsByDay]);

  const dayReports = useMemo(() => {
    if (!activeDay) {
      return hotspot.reports;
    }
    return reportsInSlot(hotspot.reports, activeDay.startMs, activeDay.endMs);
  }, [activeDay, hotspot.reports]);

  const slotReports = useMemo(() => {
    if (!activeSlot) {
      return dayReports;
    }
    return reportsInSlot(hotspot.reports, activeSlot.startMs, activeSlot.endMs);
  }, [activeSlot, dayReports, hotspot.reports]);

  const dayInsights = useMemo(
    () => buildScopedReportInsights(dayReports, locale),
    [dayReports, locale],
  );
  const slotInsights = useMemo(
    () => buildScopedReportInsights(slotReports, locale),
    [slotReports, locale],
  );

  const daySlots = historyDayKey
    ? (timeline.slotsByDay[historyDayKey] ?? [])
    : [];
  const slotMax = Math.max(1, ...daySlots.map((slot) => slot.weight));
  const dayName = activeDay?.label ?? t("dayFallback");

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-[bruit-fade-in_180ms_ease-out]">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)]">
        <header className="px-2 pb-2 pt-[max(0.45rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBack}
              className="bruit-nav-back cursor-pointer"
            >
              <ChevronLeft size={18} strokeWidth={2.1} aria-hidden />
              {t("title")}
            </button>
            <button
              type="button"
              onClick={onShowMap}
              className="cursor-pointer rounded-full px-3 py-1.5 text-[1.02rem] font-semibold text-[var(--bruit-accent)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--bruit-accent)_8%,transparent)]"
            >
              {tCommon("map")}
            </button>
          </div>
          <div className="flex items-start justify-between gap-3 px-3 pt-1">
            <h1 className="bruit-brand min-w-0 text-[1.55rem] font-bold leading-tight tracking-tight text-[var(--bruit-ink)]">
              {hotspot.label}
            </h1>
            <span
              className={`bruit-status-pill mt-1 shrink-0 ${STATUS_TONE[hotspot.status]}`}
            >
              {hotspotStatusLabel(t, hotspot.status)}
            </span>
          </div>
        </header>

        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5 px-4">
          <HistoryScrubber
            reports={hotspot.reports}
            dayKey={historyDayKey}
            slotId={historySlotId}
            onDayChange={setHistoryDayKey}
            onSlotChange={setHistorySlotId}
          />

          <div className="bruit-hotspot-card overflow-hidden">
            <div className="bruit-hotspot-map-wrap bruit-hotspot-map-wrap-detail pointer-events-none">
              <HotspotMiniMap
                lat={hotspot.lat}
                lng={hotspot.lng}
                reports={slotReports}
                label={hotspot.label}
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="min-w-0 truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                {activeSlot
                  ? formatHistoryRange(
                      activeSlot.startMs,
                      activeSlot.endMs,
                      locale,
                    )
                  : t("selectedPeriod")}
              </p>
              <p className="shrink-0 text-[0.84rem] font-semibold tabular-nums text-[var(--bruit-ink)]">
                {t("reportsCount", { count: slotReports.length })}
              </p>
            </div>
          </div>

          <div className="bruit-insight-hero">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
              {t("thisHalfHour")}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="bruit-brand text-[3.1rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)] tabular-nums">
                {slotInsights.total}
              </span>
              <span className="text-[1rem] font-semibold text-[var(--bruit-muted)]">
                {slotInsights.total === 1
                  ? tCommon("report")
                  : tCommon("reports")}
              </span>
            </p>
            <p className="mt-2 text-[0.92rem] font-medium text-[var(--bruit-muted)]">
              {activeDay
                ? t("allDay", { count: dayInsights.total })
                : t("noDaySelected")}
              {slotInsights.topCategory ? (
                <>
                  <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                    ·
                  </span>
                  {t("mostly", {
                    category: categoryLabel(
                      tCategories,
                      slotInsights.topCategory.id,
                    ).toLowerCase(),
                  })}
                </>
              ) : slotInsights.total === 0 ? (
                <>
                  <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                    ·
                  </span>
                  {t("quietRightNow")}
                </>
              ) : null}
            </p>
            {dayInsights.peakHourLabel ? (
              <p className="mt-1.5 text-[0.92rem] font-medium text-[var(--bruit-ink)]">
                {t("loudestAround", { time: dayInsights.peakHourLabel })}
              </p>
            ) : null}
          </div>

          {dayInsights.measuredCount > 0 ? (
            <section aria-labelledby="hotspot-db-title">
              <p
                id="hotspot-db-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("measuredLevels", { day: dayName })}
              </p>
              <div className="bruit-db-card">
                <div className="bruit-db-card-grid">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                      {t("avgDb")}
                    </p>
                    <p
                      className="bruit-db-card-value"
                      style={{ color: decibelTint(dayInsights.avgDb) }}
                    >
                      {dayInsights.avgDb}
                      <span className="bruit-db-card-unit">dB</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                      {t("peakDb")}
                    </p>
                    <p
                      className="bruit-db-card-value"
                      style={{ color: decibelTint(dayInsights.peakDb) }}
                    >
                      {dayInsights.peakDb}
                      <span className="bruit-db-card-unit">dB</span>
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[0.82rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                  {t("measuredCount", { count: dayInsights.measuredCount })}
                  {slotInsights.avgDb != null &&
                  slotInsights.total !== dayInsights.total ? (
                    <>
                      <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                        ·
                      </span>
                      {t("slotAvgDb", { db: slotInsights.avgDb })}
                    </>
                  ) : null}
                </p>
              </div>
            </section>
          ) : null}

          {daySlots.length > 0 ? (
            <section aria-labelledby="hotspot-day-rhythm-title">
              <p
                id="hotspot-day-rhythm-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("dayRhythm", { day: dayName })}
              </p>
              <div className="bruit-grouped-list overflow-hidden px-3 py-3.5">
                <div
                  className="bruit-day-rhythm"
                  role="img"
                  aria-label={t("halfHourAria", { day: dayName })}
                >
                  {daySlots.map((slot) => {
                    const height =
                      slot.count === 0
                        ? 8
                        : Math.max(
                            12,
                            Math.round((slot.weight / slotMax) * 100),
                          );
                    const selected = slot.id === activeSlot?.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setHistorySlotId(slot.id)}
                        className="bruit-day-rhythm-cell cursor-pointer"
                        title={`${slot.label}: ${slot.count}`}
                        aria-label={t("slotAria", {
                          time: slot.label,
                          count: slot.count,
                        })}
                        aria-pressed={selected}
                      >
                        <div className="bruit-day-rhythm-track">
                          <div
                            className={`bruit-day-rhythm-bar ${
                              selected ? "bruit-day-rhythm-bar-active" : ""
                            } ${slot.count === 0 ? "bruit-day-rhythm-bar-empty" : ""}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 px-1 text-[0.78rem] font-medium text-[var(--bruit-muted)]">
                  {t("tapBar")}
                </p>
              </div>
            </section>
          ) : null}

          {dayInsights.categories.length > 0 ? (
            <section aria-labelledby="hotspot-sources-title">
              <p
                id="hotspot-sources-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("sources", { day: dayName })}
              </p>
              <div className="bruit-grouped-list overflow-hidden px-4 py-3">
                <ul className="flex flex-col gap-3.5">
                  {dayInsights.categories.map((category) => (
                    <li key={category.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {categoryLabel(tCategories, category.id)}
                        </span>
                        <span className="shrink-0 text-[0.82rem] font-semibold tabular-nums text-[var(--bruit-muted)]">
                          {formatPercent(category.share)}
                        </span>
                      </div>
                      <div className="bruit-insight-meter" aria-hidden>
                        <div
                          className="bruit-insight-meter-fill"
                          style={{
                            width: `${Math.max(4, category.share * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : (
            <section aria-labelledby="hotspot-sources-empty">
              <p
                id="hotspot-sources-empty"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("sources", { day: dayName })}
              </p>
              <div className="bruit-grouped-list px-4 py-4 text-[0.9rem] font-medium text-[var(--bruit-muted)]">
                {t("noReportsDay")}
              </div>
            </section>
          )}

          {dayInsights.intensities.length > 0 ? (
            <section aria-labelledby="hotspot-levels-title">
              <p
                id="hotspot-levels-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("levels", { day: dayName })}
              </p>
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {dayInsights.intensities.map((intensity, index) => (
                    <li key={intensity.id}>
                      {index > 0 ? (
                        <div className="bruit-list-separator-inset" />
                      ) : null}
                      <div className="bruit-feed-row">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: INTENSITY_TINT[intensity.id] }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {intensityLabel(tIntensities, intensity.id)}
                        </span>
                        <span className="shrink-0 text-[0.92rem] font-semibold tabular-nums text-[var(--bruit-muted)]">
                          {intensity.count}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t-[0.5px] border-[var(--bruit-hairline)] px-4 py-3">
                  <p className="text-[0.84rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                    {t("loudShare", {
                      percent: formatPercent(dayInsights.loudShare),
                    })}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {slotInsights.categories.length > 0 &&
          slotInsights.total !== dayInsights.total ? (
            <section aria-labelledby="hotspot-slot-sources-title">
              <p
                id="hotspot-slot-sources-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("sourcesHalfHour")}
              </p>
              <div className="bruit-grouped-list overflow-hidden px-4 py-3">
                <ul className="flex flex-col gap-3.5">
                  {slotInsights.categories.map((category) => (
                    <li key={category.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {categoryLabel(tCategories, category.id)}
                        </span>
                        <span className="shrink-0 text-[0.82rem] font-semibold tabular-nums text-[var(--bruit-muted)]">
                          {formatPercent(category.share)}
                        </span>
                      </div>
                      <div className="bruit-insight-meter" aria-hidden>
                        <div
                          className="bruit-insight-meter-fill"
                          style={{
                            width: `${Math.max(4, category.share * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <button
            type="button"
            onClick={onShowMap}
            className="bruit-primary-btn w-full cursor-pointer"
          >
            {t("showOnMap")}
          </button>
        </div>
      </div>
    </div>
  );
}

function regionDisplayName(
  region: string,
  elsewhereLabel: string,
): string {
  return region === UNKNOWN_REGION ? elsewhereLabel : region;
}

function situationHeadlineKey(tone: SituationTone) {
  return `situation.${tone}` as const;
}

function situationBodyKey(tone: SituationTone) {
  return `situationBody.${tone}` as const;
}

function matrixCellOpacity(value: number, max: number): number {
  if (max <= 0 || value <= 0) {
    return 0.08;
  }
  return 0.18 + (value / max) * 0.82;
}

export function InsightsView({
  reports,
  userLocation,
  container = null,
  onReport,
  canReport,
  onOpenHotspot,
}: InsightsViewProps) {
  const t = useTranslations("Insights");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();

  const regions = useMemo(
    () => listActiveRegions(reports, userLocation),
    [reports, userLocation],
  );
  const [region, setRegion] = useState<string | null>(null);

  useEffect(() => {
    if (regions.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setRegion((current) =>
        current && regions.includes(current) ? current : regions[0],
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [regions]);

  const activeRegion = region ?? regions[0] ?? null;

  const insightLabels = useMemo(
    () => ({
      today: tCommon("today"),
      weekday: (index: number) => t(`weekdays.${index}` as "weekdays.0"),
      timeSlot: (id: number) =>
        t(`timeSlots.${id}.label` as "timeSlots.0.label"),
      trend: (status: HotspotStatus) => t(`trend.${status}` as "trend.new"),
    }),
    [t, tCommon],
  );

  const brief = useMemo(
    () =>
      activeRegion
        ? buildRegionalBrief(
            reports,
            activeRegion,
            Date.now(),
            locale,
            insightLabels,
          )
        : null,
    [activeRegion, reports, locale, insightLabels],
  );

  const [labels, setLabels] = useState<AreaLabelMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const points = (brief?.priorityAreas ?? []).map((hotspot) => ({
      lat: hotspot.lat,
      lng: hotspot.lng,
    }));

    if (points.length === 0) {
      return;
    }

    let cancelled = false;
    void loadAreaLabelsForPoints(points).then((next) => {
      if (!cancelled) {
        setLabels(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [brief?.priorityAreas]);

  const priorityAreas = useMemo(
    () =>
      (brief?.priorityAreas ?? []).map((item) =>
        labeledHotspot(
          item,
          labels,
          t("nearCoords", {
            lat: item.lat.toFixed(3),
            lng: item.lng.toFixed(3),
          }),
        ),
      ),
    [brief?.priorityAreas, labels, t],
  );

  const allLabeledHotspots = useMemo(
    () =>
      (brief?.hotspots ?? []).map((item) =>
        labeledHotspot(
          item,
          labels,
          t("nearCoords", {
            lat: item.lat.toFixed(3),
            lng: item.lng.toFixed(3),
          }),
        ),
      ),
    [brief?.hotspots, labels, t],
  );

  const selected = useMemo(
    () => allLabeledHotspots.find((item) => item.id === selectedId) ?? null,
    [allLabeledHotspots, selectedId],
  );

  useEffect(() => {
    if (selectedId && !allLabeledHotspots.some((item) => item.id === selectedId)) {
      const frame = window.requestAnimationFrame(() => setSelectedId(null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [allLabeledHotspots, selectedId]);

  if (selected) {
    return (
      <section
        className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]"
        aria-labelledby="hotspot-detail-title"
      >
        <span id="hotspot-detail-title" className="sr-only">
          {selected.label}
        </span>
        <HotspotDetail
          hotspot={selected}
          onBack={() => setSelectedId(null)}
          onShowMap={() =>
            onOpenHotspot?.({ lat: selected.lat, lng: selected.lng })
          }
        />
      </section>
    );
  }

  const regionTitle = activeRegion
    ? regionDisplayName(activeRegion, t("elsewhere"))
    : t("title");
  const weekDelta = brief
    ? formatWeekDeltaMessage(t, brief.deltaVsPreviousWeek)
    : null;
  const hasSignal = Boolean(
    brief && (brief.currentTotal > 0 || brief.hotspotCount > 0),
  );
  const situation = brief?.situation ?? "quiet";

  return (
    <section
      className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]"
      aria-labelledby="insights-title"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)] pt-[max(0.85rem,env(safe-area-inset-top))]">
        <header className="bruit-brief-page-header mx-auto max-w-lg">
          <h1
            id="insights-title"
            className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]"
          >
            {t("title")}
          </h1>
          <p className="mt-1 max-w-sm text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
            {t("subtitle")}
          </p>
          {regions.length > 1 ? (
            <div
              className="bruit-brief-regions mt-3"
              role="tablist"
              aria-label={t("regionPicker")}
            >
              {regions.map((item) => {
                const selectedRegion = item === activeRegion;
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={selectedRegion}
                    onClick={() => setRegion(item)}
                    className={`bruit-brief-region cursor-pointer transition-colors duration-200 ${
                      selectedRegion ? "bruit-brief-region-active" : ""
                    }`}
                  >
                    {regionDisplayName(item, t("elsewhere"))}
                  </button>
                );
              })}
            </div>
          ) : null}
        </header>

        {!hasSignal || !brief ? (
          <div className="mx-auto mt-5 flex max-w-lg flex-col gap-5">
            <div className="bruit-brief-hero bruit-brief-tone-quiet px-5 py-7">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[var(--bruit-muted)]">
                {t("thisWeek")}
              </p>
              <p className="bruit-brand mt-1 text-[1.85rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)]">
                {regionTitle}
              </p>
              <p className="mt-4 text-[1.35rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                {t(situationHeadlineKey("quiet"))}
              </p>
              <p className="mt-1.5 text-[0.95rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {t("emptyBody")}
              </p>
            </div>
            {activeRegion ? (
              <RegionMapCard
                region={activeRegion}
                regionLabel={regionTitle}
                reports={reports}
                container={container}
              />
            ) : null}
            <div className="px-2 pb-2 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bruit-surface)] text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <ChartColumn size={24} strokeWidth={1.8} aria-hidden />
              </div>
              <p className="text-[1.1rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                {t("emptyTitle")}
              </p>
              <button
                type="button"
                onClick={onReport}
                disabled={!canReport}
                className="bruit-primary-btn mt-5 cursor-pointer px-7 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {t("reportNoise")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-5 flex max-w-lg flex-col gap-5">
            <div
              className={`bruit-brief-hero bruit-brief-tone-${situation} animate-[bruit-rise_280ms_ease-out]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[var(--bruit-muted)]">
                    {t("thisWeek")}
                  </p>
                  <p className="bruit-brand mt-1 truncate text-[1.85rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)]">
                    {regionTitle}
                  </p>
                </div>
                {brief.deltaPercent != null && brief.deltaPercent !== 0 ? (
                  <span
                    className={`bruit-brief-delta shrink-0 ${
                      brief.deltaPercent > 0
                        ? "bruit-brief-delta-up"
                        : "bruit-brief-delta-down"
                    }`}
                  >
                    {brief.deltaPercent > 0
                      ? t("deltaUpShort", { pct: brief.deltaPercent })
                      : t("deltaDownShort", {
                          pct: Math.abs(brief.deltaPercent),
                        })}
                  </span>
                ) : null}
              </div>

              <p className="mt-5 text-[1.85rem] font-semibold leading-tight tracking-tight text-[var(--bruit-ink)]">
                {t(situationHeadlineKey(situation))}
              </p>
              <p className="mt-1.5 max-w-md text-[0.98rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {t(situationBodyKey(situation))}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="bruit-brief-stat">
                  <p className="tabular-nums text-[1.45rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {brief.hotspotCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold leading-snug text-[var(--bruit-muted)]">
                    {brief.hotspotCount === 1
                      ? t("priorityArea")
                      : t("priorityAreas")}
                  </p>
                </div>
                <div className="bruit-brief-stat">
                  <p className="tabular-nums text-[1.45rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {brief.attentionCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold leading-snug text-[var(--bruit-muted)]">
                    {t("needAttention")}
                  </p>
                </div>
                <div className="bruit-brief-stat">
                  <p className="tabular-nums text-[1.45rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {brief.currentTotal}
                  </p>
                  <p className="text-[0.72rem] font-semibold leading-snug text-[var(--bruit-muted)]">
                    {t("reportsThisWeek")}
                  </p>
                </div>
              </div>

              {weekDelta ? (
                <p className="mt-3 text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                  {weekDelta}
                </p>
              ) : null}
            </div>

            {activeRegion ? (
              <RegionMapCard
                region={activeRegion}
                regionLabel={regionTitle}
                reports={reports}
                container={container}
              />
            ) : null}

            <section
              className="bruit-brief-card"
              aria-labelledby="brief-key-message"
            >
              <h2
                id="brief-key-message"
                className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("keyMessage")}
              </h2>
              <p className="mt-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-[var(--bruit-ink)]">
                {brief.peakWindow
                  ? t("keyMessagePeak", {
                      day: brief.peakWindow.weekdayLabel,
                      slot: brief.peakWindow.slotLabel,
                    })
                  : t("keyMessageQuiet")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bruit-brief-chip">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                    {t("peakWindow")}
                  </p>
                  <p className="mt-0.5 text-[0.95rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {brief.peakWindow
                      ? `${brief.peakWindow.weekdayLabel} · ${brief.peakWindow.slotLabel}`
                      : t("noPeakWindow")}
                  </p>
                </div>
                <div className="bruit-brief-chip">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                    {t("mainSource")}
                  </p>
                  <p className="mt-0.5 text-[0.95rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {brief.topCategory
                      ? categoryLabel(tCategories, brief.topCategory.id)
                      : t("noMainSource")}
                  </p>
                </div>
              </div>
              {brief.measuredCount > 0 ? (
                <div className="bruit-db-strip mt-3">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                      {t("avgDb")}
                    </p>
                    <p
                      className="text-[1.35rem] font-semibold tabular-nums tracking-tight"
                      style={{ color: decibelTint(brief.avgDb) }}
                    >
                      {brief.avgDb}
                      <span className="ml-1 text-[0.78rem] font-semibold text-[var(--bruit-muted)]">
                        dB
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-[var(--bruit-muted)]">
                      {t("peakDb")}
                    </p>
                    <p
                      className="text-[1.35rem] font-semibold tabular-nums tracking-tight"
                      style={{ color: decibelTint(brief.peakDb) }}
                    >
                      {brief.peakDb}
                      <span className="ml-1 text-[0.78rem] font-semibold text-[var(--bruit-muted)]">
                        dB
                      </span>
                    </p>
                  </div>
                  <p className="col-span-2 text-[0.78rem] font-medium text-[var(--bruit-muted)]">
                    {t("cityMeasured", {
                      count: brief.measuredCount,
                      peak: brief.peakDb ?? "—",
                    })}
                  </p>
                </div>
              ) : null}
            </section>

            {brief.timeMatrixMax > 0 ? (
              <section aria-labelledby="brief-time-title">
                <h2
                  id="brief-time-title"
                  className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
                >
                  {t("timePattern")}
                </h2>
                <div className={`bruit-brief-card bruit-brief-tone-${situation}`}>
                  <div
                    className="bruit-brief-matrix"
                    role="img"
                    aria-label={
                      brief.peakWindow
                        ? t("timePatternAria", {
                            day: brief.peakWindow.weekdayLabel,
                            slot: brief.peakWindow.slotLabel,
                          })
                        : t("timePattern")
                    }
                  >
                    <div className="bruit-brief-matrix-corner" aria-hidden />
                    {brief.weekdayLabels.map((label) => (
                      <div key={label} className="bruit-brief-matrix-day">
                        {label}
                      </div>
                    ))}
                    {brief.timeSlots.map((slot) => (
                      <div key={`row-${slot.id}`} className="contents">
                        <div className="bruit-brief-matrix-slot">
                          {t(
                            `timeSlots.${slot.id}.shortLabel` as "timeSlots.0.shortLabel",
                          )}
                        </div>
                        {brief.weekdayLabels.map((_, weekday) => {
                          const cell = brief.timeMatrix.find(
                            (item) =>
                              item.weekday === weekday && item.slot === slot.id,
                          );
                          const value = cell?.value ?? 0;
                          const isPeak =
                            brief.peakWindow != null &&
                            brief.peakWindow.weekdayLabel ===
                              brief.weekdayLabels[weekday] &&
                            brief.peakWindow.slotLabel === slot.label;
                          const strength = matrixCellOpacity(
                            value,
                            brief.timeMatrixMax,
                          );
                          return (
                            <div
                              key={`${weekday}-${slot.id}`}
                              className={`bruit-brief-matrix-cell ${
                                isPeak ? "bruit-brief-matrix-cell-peak" : ""
                              }`}
                              style={{
                                backgroundColor: `color-mix(in srgb, var(--bruit-brief-heat) ${Math.round(strength * 100)}%, transparent)`,
                              }}
                              title={`${brief.weekdayLabels[weekday]} ${slot.label}: ${Math.round(value)}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {brief.peakWindow ? (
                    <p className="mt-3 text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                      {t("strongestPattern", {
                        day: brief.peakWindow.weekdayLabel,
                        slot: brief.peakWindow.slotLabel,
                      })}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {brief.categories.length > 0 ? (
              <section aria-labelledby="brief-sources-title">
                <h2
                  id="brief-sources-title"
                  className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
                >
                  {t("sourceMix")}
                </h2>
                <div className="bruit-grouped-list overflow-hidden px-4 py-3">
                  <ul className="flex flex-col gap-3.5">
                    {brief.categories.map((category) => (
                      <li key={category.id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="truncate text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                            {categoryLabel(tCategories, category.id)}
                          </span>
                          <span className="shrink-0 text-[0.82rem] font-semibold tabular-nums text-[var(--bruit-muted)]">
                            {formatPercent(category.share)}
                          </span>
                        </div>
                        <div className="bruit-insight-meter" aria-hidden>
                          <div
                            className="bruit-insight-meter-fill"
                            style={{
                              width: `${Math.max(4, category.share * 100)}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            <section aria-labelledby="brief-priority-title">
              <h2
                id="brief-priority-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("prioritySection")}
              </h2>
              {priorityAreas.length === 0 ? (
                <div className="bruit-grouped-list px-4 py-4 text-[0.9rem] font-medium text-[var(--bruit-muted)]">
                  {t("noPriorityAreas")}
                </div>
              ) : (
                <div className="bruit-grouped-list overflow-hidden">
                  <ul>
                    {priorityAreas.map((hotspot, index) => {
                      const confirms = hotspot.reportsCurrent.reduce(
                        (sum, report) => sum + (report.hear_count ?? 0),
                        0,
                      );
                      return (
                        <li key={hotspot.id}>
                          {index > 0 ? (
                            <div className="bruit-list-separator-inset" />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setSelectedId(hotspot.id)}
                            className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
                          >
                            <span className="bruit-brief-rank tabular-nums">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1 py-0.5">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                  {hotspot.label}
                                </span>
                                <span
                                  className={`bruit-status-pill shrink-0 ${STATUS_TONE[hotspot.status]}`}
                                >
                                  {hotspotStatusLabel(t, hotspot.status)}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                                {t("thisWeekCount", {
                                  count: hotspot.currentCount,
                                })}
                                <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                  ·
                                </span>
                                {t("dayCount", {
                                  count: hotspot.distinctDays,
                                })}
                                {confirms > 0 ? (
                                  <>
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
                                    {t("confirmations", { count: confirms })}
                                  </>
                                ) : null}
                                {hotspot.avgDb != null ? (
                                  <>
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
                                    <span
                                      style={{
                                        color: decibelTint(hotspot.avgDb),
                                      }}
                                    >
                                      {t("avgDbValue", { db: hotspot.avgDb })}
                                    </span>
                                  </>
                                ) : hotspot.topCategory ? (
                                  ` · ${categoryLabel(tCategories, hotspot.topCategory.id)}`
                                ) : (
                                  ""
                                )}
                              </span>
                            </span>
                            <Chevron />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            <section
              className="bruit-brief-card"
              aria-labelledby="brief-confidence-title"
            >
              <h2
                id="brief-confidence-title"
                className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("confidence")}
              </h2>
              <p className="mt-2 text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                {t(`confidenceLevel.${brief.confidence}` as "confidenceLevel.high")}
              </p>
              <p className="mt-1 text-[0.84rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {t("confidenceBreakdown", {
                  high: brief.confidenceHighAreas,
                  moderate: brief.confidenceModerateAreas,
                  limited: brief.confidenceLimitedAreas,
                })}
              </p>
              <p className="mt-2 text-[0.84rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {t("confidenceFooter", {
                  reports: brief.currentTotal,
                  confirms: brief.confirmationCount,
                })}
              </p>
            </section>

            <p className="px-3 pb-2 text-[0.78rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              {t("footer")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
