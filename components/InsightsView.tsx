"use client";

import { ChartColumn, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { HistoryScrubber } from "@/components/HistoryScrubber";
import type { AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import {
  buildHistoryTimeline,
  reportsInSlot,
} from "@/lib/history-timeline";
import {
  buildMunicipalInsights,
  buildScopedReportInsights,
  formatPercent,
  type HotspotStatus,
  type NoiseHotspot,
} from "@/lib/insights";
import { formatHistoryRange } from "@/lib/history-timeline";
import {
  categoryLabel,
  formatWeekDeltaMessage,
  hotspotStatusLabel,
  intensityLabel,
} from "@/lib/i18n-helpers";
import type { NoiseIntensity } from "@/lib/noise-meta";
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

const INTENSITY_TINT: Record<NoiseIntensity, string> = {
  moderate: "#5ac8fa",
  loud: "#32ade6",
  very_loud: "#ff9f0a",
  extreme: "#ff2d55",
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

export function InsightsView({
  reports,
  onReport,
  canReport,
  onOpenHotspot,
}: InsightsViewProps) {
  const t = useTranslations("Insights");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();

  const insightLabels = useMemo(
    () => ({
      today: tCommon("today"),
      weekday: (index: number) => t(`weekdays.${index}` as "weekdays.0"),
      timeSlot: (id: number) => t(`timeSlots.${id}.label` as "timeSlots.0.label"),
      trend: (status: HotspotStatus) =>
        t(`trend.${status}` as "trend.new"),
    }),
    [t, tCommon],
  );

  const insights = useMemo(
    () => buildMunicipalInsights(reports, Date.now(), locale, insightLabels),
    [reports, locale, insightLabels],
  );
  const [labels, setLabels] = useState<AreaLabelMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const points = insights.hotspots.map((hotspot) => ({
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
  }, [insights.hotspots]);

  const hotspots = useMemo(
    () =>
      insights.hotspots.map((item) =>
        labeledHotspot(
          item,
          labels,
          t("nearCoords", {
            lat: item.lat.toFixed(3),
            lng: item.lng.toFixed(3),
          }),
        ),
      ),
    [insights.hotspots, labels, t],
  );

  const selected = useMemo(
    () => hotspots.find((item) => item.id === selectedId) ?? null,
    [hotspots, selectedId],
  );

  useEffect(() => {
    if (selectedId && !hotspots.some((item) => item.id === selectedId)) {
      const frame = window.requestAnimationFrame(() => setSelectedId(null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [hotspots, selectedId]);

  const weekDelta = formatWeekDeltaMessage(t, insights.deltaVsPreviousWeek);
  const hasSignal = hotspots.length > 0 || insights.currentTotal > 0;

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

  return (
    <section
      className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]"
      aria-labelledby="insights-title"
    >
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)] pt-[max(0.85rem,env(safe-area-inset-top))]">
        <header className="pb-3">
          <h1
            id="insights-title"
            className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]"
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
            {t("subtitle")}
          </p>
        </header>

        {!hasSignal ? (
          <div className="mx-auto mt-10 max-w-sm px-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bruit-surface)] text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <ChartColumn size={24} strokeWidth={1.8} aria-hidden />
            </div>
            <p className="text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
              {t("emptyTitle")}
            </p>
            <p className="mt-1.5 text-[0.92rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              {t("emptyBody")}
            </p>
            <button
              type="button"
              onClick={onReport}
              disabled={!canReport}
              className="bruit-primary-btn mt-6 cursor-pointer px-7 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {t("reportNoise")}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-5">
            <div className="bruit-insight-hero animate-[bruit-rise_280ms_ease-out]">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
                {t("thisWeek")}
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="bruit-brand text-[3.35rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)] tabular-nums">
                  {insights.hotspotCount}
                </span>
                <span className="text-[1rem] font-semibold text-[var(--bruit-muted)]">
                  {insights.hotspotCount === 1
                    ? t("hotspot")
                    : t("hotspots")}
                </span>
              </p>
              <p className="mt-2 text-[0.92rem] font-medium text-[var(--bruit-muted)]">
                {t("reportsCount", { count: insights.currentTotal })}
                {weekDelta ? (
                  <>
                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                      ·
                    </span>
                    {weekDelta}
                  </>
                ) : null}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bruit-insight-stat">
                  <p className="tabular-nums text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {insights.recurringCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold text-[var(--bruit-muted)]">
                    {t("recurring")}
                  </p>
                </div>
                <div className="bruit-insight-stat">
                  <p className="tabular-nums text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {insights.escalatingCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold text-[var(--bruit-muted)]">
                    {t("escalating")}
                  </p>
                </div>
                <div className="bruit-insight-stat">
                  <p className="tabular-nums text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {insights.newCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold text-[var(--bruit-muted)]">
                    {t("new")}
                  </p>
                </div>
              </div>
            </div>

            <section aria-labelledby="insights-hotspots-title">
              <p
                id="insights-hotspots-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("hotspotsSection")}
              </p>
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {hotspots.map((hotspot, index) => (
                    <li key={hotspot.id}>
                      {index > 0 ? (
                        <div className="bruit-list-separator-inset" />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedId(hotspot.id)}
                        className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
                      >
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
                            {t("dayCount", { count: hotspot.distinctDays })}
                            {hotspot.topCategory
                              ? ` · ${categoryLabel(tCategories, hotspot.topCategory.id)}`
                              : ""}
                          </span>
                        </span>
                        <Chevron />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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
