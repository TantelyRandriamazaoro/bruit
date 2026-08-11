"use client";

import { CalendarDays, ChartColumn, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityDrawer,
  type ActivityDrawerSelection,
} from "@/components/ActivityDrawer";
import { ActivityHistoryDrawer } from "@/components/ActivityHistoryDrawer";
import { RegionMapCard } from "@/components/RegionMapCard";
import type { ReportCluster } from "@/lib/cluster-reports";
import { decibelTint } from "@/lib/decibel";
import {
  buildRegionalBrief,
  filterReportsByRegion,
  formatPercent,
  listActiveRegions,
  type HotspotStatus,
  type SituationTone,
} from "@/lib/insights";
import {
  categoryLabel,
  formatWeekDeltaMessage,
} from "@/lib/i18n-helpers";
import { UNKNOWN_REGION } from "@/lib/madagascar-regions";
import type { NoiseReport } from "@/lib/supabase/types";

type InsightsViewProps = {
  reports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  container?: HTMLElement | null;
  onReport: () => void;
  canReport: boolean;
  onOpenHotspot?: (hotspot: { lat: number; lng: number }) => void;
  onReportAgain?: (cluster: ReportCluster) => void;
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
  onReportAgain,
}: InsightsViewProps) {
  const t = useTranslations("Insights");
  const tFeed = useTranslations("Feed");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const locale = useLocale();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activitySelection, setActivitySelection] =
    useState<ActivityDrawerSelection | null>(null);

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

  const navigatorReports = useMemo(
    () =>
      activeRegion ? filterReportsByRegion(reports, activeRegion) : reports,
    [activeRegion, reports],
  );

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
                      ? t("hotspot")
                      : t("hotspots")}
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

            <section aria-labelledby="brief-history-title">
              <h2
                id="brief-history-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {tFeed("historySection")}
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="bruit-history-card w-full cursor-pointer text-left transition-colors duration-200"
                aria-label={tFeed("historyOpenAria")}
              >
                <span className="bruit-history-card-icon" aria-hidden>
                  <CalendarDays size={20} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {tFeed("historyCardTitle")}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                    {t("activityNavigatorHint", { region: regionTitle })}
                  </span>
                </span>
                <Chevron />
              </button>
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

      <ActivityHistoryDrawer
        open={historyOpen}
        reports={navigatorReports}
        container={container}
        onClose={() => setHistoryOpen(false)}
        onOpenCluster={(cluster, areaName) => {
          setActivitySelection({ cluster, areaName });
        }}
      />

      <ActivityDrawer
        selection={activitySelection}
        userLocation={userLocation}
        container={container}
        onClose={() => setActivitySelection(null)}
        onShowOnMap={(report) => {
          setActivitySelection(null);
          setHistoryOpen(false);
          onOpenHotspot?.(report);
        }}
        onReportAgain={onReportAgain}
      />
    </section>
  );
}
