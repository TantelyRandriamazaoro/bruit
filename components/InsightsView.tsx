"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import {
  buildHotspotDetail,
  buildMunicipalInsights,
  formatGrowth,
  formatPercent,
  formatWeekDelta,
  hotspotStatusLabel,
  type HotspotStatus,
  type NoiseHotspot,
} from "@/lib/insights";
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
  loud: "#007aff",
  very_loud: "#ff9f0a",
  extreme: "#ff2d55",
};

function ChartGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 17V11M10 17V7M15 17v-4M20 17V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className="shrink-0 text-[var(--bruit-hairline-strong)]"
      aria-hidden
    >
      <path
        d="M4 1.5 8.5 6 4 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function matrixColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) {
    return "rgba(120, 120, 128, 0.1)";
  }
  const t = Math.min(1, value / max);
  if (t < 0.25) {
    return "rgba(90, 200, 250, 0.45)";
  }
  if (t < 0.5) {
    return "rgba(50, 173, 230, 0.65)";
  }
  if (t < 0.75) {
    return "rgba(255, 159, 10, 0.75)";
  }
  return "rgba(255, 45, 85, 0.85)";
}

function labeledHotspot(
  hotspot: NoiseHotspot,
  labels: AreaLabelMap,
): NoiseHotspot {
  const name = labels[hotspot.cellKey];
  if (!name) {
    return hotspot;
  }
  return { ...hotspot, label: name };
}

function TimeMatrix({
  weekdayLabels,
  timeSlots,
  timeMatrix,
  timeMatrixMax,
  peakWindow,
  ariaLabel,
}: {
  weekdayLabels: string[];
  timeSlots: ReturnType<typeof buildMunicipalInsights>["timeSlots"];
  timeMatrix: ReturnType<typeof buildMunicipalInsights>["timeMatrix"];
  timeMatrixMax: number;
  peakWindow: ReturnType<typeof buildMunicipalInsights>["peakWindow"];
  ariaLabel: string;
}) {
  return (
    <div className="bruit-grouped-list overflow-hidden px-3 py-3.5">
      {peakWindow ? (
        <p className="mb-3 px-1 text-[0.92rem] font-medium leading-snug text-[var(--bruit-ink)]">
          Loudest window:{" "}
          <span className="font-semibold">
            {peakWindow.weekdayLabel}, {peakWindow.slotLabel}
          </span>
        </p>
      ) : null}

      <div className="bruit-time-matrix" role="img" aria-label={ariaLabel}>
        <div className="bruit-time-matrix-corner" />
        {timeSlots.map((slot) => (
          <div
            key={slot.id}
            className="bruit-time-matrix-hour"
            title={slot.label}
          >
            {slot.startHour}
          </div>
        ))}
        {weekdayLabels.map((day, weekday) => (
          <div key={day} className="contents">
            <div className="bruit-time-matrix-day">{day}</div>
            {timeSlots.map((slot) => {
              const value = timeMatrix[weekday * 8 + slot.id]?.value ?? 0;
              return (
                <div
                  key={`${day}-${slot.id}`}
                  className="bruit-time-matrix-cell"
                  style={{
                    background: matrixColor(value, timeMatrixMax),
                  }}
                  title={`${day} ${slot.label}: ${value.toFixed(1)}`}
                >
                  <span className="sr-only">
                    {day} {slot.label}: intensity {value.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="bruit-time-legend mt-3 px-1">
        <span>Quiet</span>
        <div className="bruit-time-legend-bar" aria-hidden />
        <span>Loud</span>
      </div>
    </div>
  );
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
  const detail = useMemo(() => buildHotspotDetail(hotspot), [hotspot]);
  const growth = formatGrowth(hotspot.growthRate);
  const dayMax = Math.max(1, ...detail.days.map((day) => day.count));
  const mapReports =
    hotspot.reportsCurrent.length > 0
      ? hotspot.reportsCurrent
      : hotspot.reports;

  return (
    <div className="flex min-h-0 flex-1 flex-col animate-[bruit-fade-in_180ms_ease-out]">
      <header className="bruit-feed-header shrink-0 px-2 pb-2 pt-[max(0.45rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="bruit-nav-back cursor-pointer"
          >
            <svg width="11" height="18" viewBox="0 0 11 18" aria-hidden>
              <path
                d="M9.5 1.5 2 9l7.5 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Insights
          </button>
          <button
            type="button"
            onClick={onShowMap}
            className="cursor-pointer rounded-full px-3 py-1.5 text-[1.02rem] font-semibold text-[var(--bruit-accent)] transition-colors duration-150 hover:bg-[rgba(0,122,255,0.08)]"
          >
            Map
          </button>
        </div>
        <div className="px-3 pt-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="bruit-brand min-w-0 text-[1.85rem] font-bold leading-tight tracking-tight text-[var(--bruit-ink)]">
              {hotspot.label}
            </h1>
            <span
              className={`bruit-status-pill mt-1.5 shrink-0 ${STATUS_TONE[hotspot.status]}`}
            >
              {hotspotStatusLabel(hotspot.status)}
            </span>
          </div>
          <p className="mt-1 text-[0.9rem] font-medium text-[var(--bruit-muted)]">
            Patterns for this area · last {detail.windowDays} days
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28">
        <div className="mx-auto flex max-w-lg flex-col gap-5">
          <div className="bruit-hotspot-card overflow-hidden">
            <div className="bruit-hotspot-map-wrap bruit-hotspot-map-wrap-detail pointer-events-none">
              <HotspotMiniMap
                lat={hotspot.lat}
                lng={hotspot.lng}
                reports={mapReports}
                label={hotspot.label}
              />
            </div>
          </div>

          <div className="bruit-insight-hero">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
              Reports Here
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="bruit-brand text-[3.1rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)] tabular-nums">
                {hotspot.currentCount}
              </span>
              <span className="text-[1rem] font-semibold text-[var(--bruit-muted)]">
                this week
              </span>
            </p>
            <p className="mt-2 text-[0.92rem] font-medium text-[var(--bruit-muted)]">
              {hotspot.previousCount} prior week
              <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                ·
              </span>
              {hotspot.distinctDays} distinct day
              {hotspot.distinctDays === 1 ? "" : "s"}
              {growth ? (
                <>
                  <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                    ·
                  </span>
                  {growth}
                </>
              ) : null}
            </p>
            {hotspot.peakHourLabel ? (
              <p className="mt-1.5 text-[0.92rem] font-medium text-[var(--bruit-ink)]">
                Peaks around {hotspot.peakHourLabel}
              </p>
            ) : null}
          </div>

          <section aria-labelledby="hotspot-week-title">
            <p
              id="hotspot-week-title"
              className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
            >
              This Week
            </p>
            <div className="bruit-grouped-list overflow-hidden px-4 py-4">
              <div
                className="bruit-insight-days"
                role="img"
                aria-label={`Daily reports in ${hotspot.label}`}
              >
                {detail.days.map((day) => {
                  const height =
                    day.count === 0
                      ? 8
                      : Math.max(12, Math.round((day.count / dayMax) * 100));
                  return (
                    <div key={day.key} className="bruit-insight-day">
                      <div className="bruit-insight-day-track">
                        <div
                          className={`bruit-insight-day-bar ${
                            day.isToday ? "bruit-insight-day-bar-today" : ""
                          } ${day.count === 0 ? "bruit-insight-day-bar-empty" : ""}`}
                          style={{ height: `${height}%` }}
                          title={`${day.label}: ${day.count}`}
                        />
                      </div>
                      <span
                        className={`mt-2 text-[0.68rem] font-semibold tabular-nums ${
                          day.isToday
                            ? "text-[var(--bruit-accent)]"
                            : "text-[var(--bruit-muted)]"
                        }`}
                      >
                        {day.label === "Today" ? "Now" : day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {detail.timeMatrixMax > 0 ? (
            <section aria-labelledby="hotspot-when-title">
              <p
                id="hotspot-when-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                When It&apos;s Loud
              </p>
              <TimeMatrix
                weekdayLabels={detail.weekdayLabels}
                timeSlots={detail.timeSlots}
                timeMatrix={detail.timeMatrix}
                timeMatrixMax={detail.timeMatrixMax}
                peakWindow={detail.peakWindow}
                ariaLabel={`Noise timing in ${hotspot.label}`}
              />
            </section>
          ) : null}

          {hotspot.categories.length > 0 ? (
            <section aria-labelledby="hotspot-sources-title">
              <p
                id="hotspot-sources-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                Sources
              </p>
              <div className="bruit-grouped-list overflow-hidden px-4 py-3">
                <ul className="flex flex-col gap-3.5">
                  {hotspot.categories.map((category) => (
                    <li key={category.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {category.label}
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

          {detail.intensities.length > 0 ? (
            <section aria-labelledby="hotspot-levels-title">
              <p
                id="hotspot-levels-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                Levels
              </p>
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {detail.intensities.map((intensity, index) => (
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
                          {intensity.label}
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
                    {formatPercent(detail.loudShare)} of reports here were loud
                    or stronger.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {hotspot.status === "cooling" ? (
            <p className="px-3 text-[0.78rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              Cooling means fewer recent reports here — not proof the noise has
              stopped.
            </p>
          ) : null}

          <button
            type="button"
            onClick={onShowMap}
            className="bruit-primary-btn w-full cursor-pointer"
          >
            Show on Map
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
  const insights = useMemo(() => buildMunicipalInsights(reports), [reports]);
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
    () => insights.hotspots.map((item) => labeledHotspot(item, labels)),
    [insights.hotspots, labels],
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

  const weekDelta = formatWeekDelta(insights.deltaVsPreviousWeek);
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
      <header className="bruit-feed-header shrink-0 px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1
          id="insights-title"
          className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]"
        >
          Insights
        </h1>
        <p className="mt-1 text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          Choose a hotspot to inspect its patterns
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28">
        {!hasSignal ? (
          <div className="mx-auto mt-10 max-w-sm px-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <ChartGlyph />
            </div>
            <p className="text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
              No Hotspots Yet
            </p>
            <p className="mt-1.5 text-[0.92rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              When nearby reports cluster, each area becomes a hotspot you can
              open for details.
            </p>
            <button
              type="button"
              onClick={onReport}
              disabled={!canReport}
              className="bruit-primary-btn mt-6 cursor-pointer px-7 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Report Noise
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col gap-5">
            <div className="bruit-insight-hero animate-[bruit-rise_280ms_ease-out]">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
                This Week
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="bruit-brand text-[3.35rem] font-bold leading-none tracking-tight text-[var(--bruit-ink)] tabular-nums">
                  {insights.hotspotCount}
                </span>
                <span className="text-[1rem] font-semibold text-[var(--bruit-muted)]">
                  hotspot{insights.hotspotCount === 1 ? "" : "s"}
                </span>
              </p>
              <p className="mt-2 text-[0.92rem] font-medium text-[var(--bruit-muted)]">
                {insights.currentTotal} report
                {insights.currentTotal === 1 ? "" : "s"}
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
                    Recurring
                  </p>
                </div>
                <div className="bruit-insight-stat">
                  <p className="tabular-nums text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {insights.escalatingCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold text-[var(--bruit-muted)]">
                    Escalating
                  </p>
                </div>
                <div className="bruit-insight-stat">
                  <p className="tabular-nums text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                    {insights.newCount}
                  </p>
                  <p className="text-[0.72rem] font-semibold text-[var(--bruit-muted)]">
                    New
                  </p>
                </div>
              </div>
            </div>

            <section aria-labelledby="insights-hotspots-title">
              <p
                id="insights-hotspots-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                Hotspots
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
                              {hotspotStatusLabel(hotspot.status)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                            {hotspot.currentCount} this week
                            <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                              ·
                            </span>
                            {hotspot.distinctDays} day
                            {hotspot.distinctDays === 1 ? "" : "s"}
                            {hotspot.topCategory
                              ? ` · ${hotspot.topCategory.label}`
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
              Tap a hotspot for timing, sources, and severity in that area only.
              Clusters are about 120m across.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
