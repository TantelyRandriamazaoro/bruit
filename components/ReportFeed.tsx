"use client";

import { useEffect, useMemo, useState } from "react";
import { areaCellKey, type AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import { clusterNearbyReports } from "@/lib/cluster-reports";
import { formatCoordPair, formatRelativeTime } from "@/lib/format";
import {
  NOISE_CATEGORIES,
  NOISE_INTENSITIES,
  type NoiseCategory,
} from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

type ReportFeedProps = {
  reports: NoiseReport[];
  onReport: () => void;
  onSelectReport?: (report: NoiseReport) => void;
  canReport: boolean;
};

function categoryLabel(category: string | null | undefined) {
  return (
    NOISE_CATEGORIES.find((item) => item.id === category)?.label ?? "Noise"
  );
}

function intensityLabel(intensity: string | null | undefined) {
  return (
    NOISE_INTENSITIES.find((item) => item.id === intensity)?.label ?? "Loud"
  );
}

function dominantCategory(reports: NoiseReport[]): string | null | undefined {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = report.category ?? "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function FeedIcon({ category }: { category: string | null | undefined }) {
  const id = (category ?? "other") as NoiseCategory;
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "traffic":
      return (
        <svg {...common}>
          <path
            d="M5 16h14l-1.2-7.2A2 2 0 0 0 15.84 7H8.16a2 2 0 0 0-1.96 1.8L5 16Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="16.5" r="1.3" fill="currentColor" />
          <circle cx="16.5" cy="16.5" r="1.3" fill="currentColor" />
        </svg>
      );
    case "construction":
      return (
        <svg {...common}>
          <path
            d="M14 5 8 11l5 5 6-6-2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "party":
      return (
        <svg {...common}>
          <path
            d="M9 18V8.5a3.5 3.5 0 1 1 3.5 3.5H9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "animals":
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="1.25" fill="currentColor" />
          <circle cx="15" cy="10" r="1.25" fill="currentColor" />
          <path
            d="M12 13c2.2 0 4 1.2 4 2.8V18H8v-2.2C8 14.2 9.8 13 12 13Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "industry":
      return (
        <svg {...common}>
          <path
            d="M4 20V10l5 3V10l5 3V8h3v12H4Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 9v3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" />
        </svg>
      );
  }
}

function Chevron({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={`shrink-0 text-[var(--bruit-hairline-strong)] transition-transform duration-200 ${
        expanded ? "rotate-90" : ""
      }`}
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

export function ReportFeed({
  reports,
  onReport,
  onSelectReport,
  canReport,
}: ReportFeedProps) {
  const [now, setNow] = useState(() => Date.now());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [areaLabels, setAreaLabels] = useState<AreaLabelMap>({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clusters = useMemo(() => clusterNearbyReports(reports), [reports]);

  const areaPoints = useMemo(
    () =>
      clusters.map((cluster) => ({
        lat: cluster.lat,
        lng: cluster.lng,
      })),
    [clusters],
  );

  const areaPointsKey = useMemo(
    () =>
      areaPoints
        .map((point) => areaCellKey(point.lat, point.lng))
        .sort()
        .join("|"),
    [areaPoints],
  );

  useEffect(() => {
    if (areaPoints.length === 0) {
      return;
    }

    let cancelled = false;

    void loadAreaLabelsForPoints(areaPoints).then((labels) => {
      if (!cancelled) {
        setAreaLabels(labels);
      }
    });

    return () => {
      cancelled = true;
    };
    // areaPointsKey captures cell identity; areaPoints is rebuilt with clusters.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [areaPointsKey]);

  const toggleExpanded = (clusterId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  };

  const areaNameFor = (cluster: {
    cellKey: string;
    lat: number;
    lng: number;
  }) =>
    areaLabels[cluster.cellKey] ??
    areaLabels[areaCellKey(cluster.lat, cluster.lng)] ??
    null;

  return (
    <section className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]">
      <header className="bruit-feed-header shrink-0 px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1 className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]">
          Activity
        </h1>
        <p className="mt-1 text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          Nearby reports are grouped · last 7 days
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28">
        {reports.length === 0 ? (
          <div className="mx-auto mt-10 max-w-sm px-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 7h14M5 12h14M5 17h10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <p className="text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
              No Activity
            </p>
            <p className="mt-1.5 text-[0.92rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
              When people report loud noise nearby, it shows up here.
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
          <div className="bruit-grouped-list mx-auto max-w-lg overflow-hidden">
            <ul>
              {clusters.map((cluster, index) => {
                const newest = cluster.reports[0];
                const isGroup = cluster.reports.length > 1;
                const expanded = expandedIds.has(cluster.id);
                const category = isGroup
                  ? dominantCategory(cluster.reports)
                  : newest.category;
                const areaName = areaNameFor(cluster);

                return (
                  <li key={cluster.id}>
                    {index > 0 ? <div className="bruit-list-separator" /> : null}

                    {isGroup ? (
                      <>
                        <div className="flex w-full items-stretch">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(cluster.id)}
                            className="bruit-feed-row min-w-0 flex-1 cursor-pointer text-left transition-colors duration-150"
                            aria-expanded={expanded}
                          >
                            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.12)] text-[var(--bruit-accent)]">
                              <FeedIcon category={category} />
                              <span className="bruit-cluster-badge" aria-hidden>
                                {cluster.reports.length}
                              </span>
                            </span>
                            <span className="min-w-0 flex-1 py-0.5">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                  {areaName ?? "Looking up area…"}
                                </span>
                                <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                  {formatRelativeTime(newest.created_at, now)}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                                {cluster.reports.length} reports
                                <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                  ·
                                </span>
                                {categoryLabel(category)}
                              </span>
                            </span>
                            <Chevron expanded={expanded} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectReport?.(newest)}
                            className="bruit-feed-map-btn cursor-pointer"
                            aria-label="Show this area on the map"
                            title="Show on map"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>

                        {expanded ? (
                          <ul className="bruit-cluster-children">
                            {cluster.reports.map((report) => (
                              <li key={report.id}>
                                <button
                                  type="button"
                                  onClick={() => onSelectReport?.(report)}
                                  className="bruit-feed-row bruit-feed-row-nested w-full cursor-pointer text-left transition-colors duration-150"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.08)] text-[var(--bruit-accent)]">
                                    <FeedIcon category={report.category} />
                                  </span>
                                  <span className="min-w-0 flex-1 py-0.5">
                                    <span className="flex items-baseline justify-between gap-3">
                                      <span className="truncate text-[0.95rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                        {categoryLabel(report.category)}
                                      </span>
                                      <span className="shrink-0 text-[0.74rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                        {formatRelativeTime(report.created_at, now)}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block truncate text-[0.8rem] font-medium text-[var(--bruit-muted)]">
                                      {intensityLabel(report.intensity)}
                                    </span>
                                  </span>
                                  <Chevron />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectReport?.(newest)}
                        className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.12)] text-[var(--bruit-accent)]">
                          <FeedIcon category={newest.category} />
                        </span>
                        <span className="min-w-0 flex-1 py-0.5">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                              {categoryLabel(newest.category)}
                            </span>
                            <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                              {formatRelativeTime(newest.created_at, now)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                            {intensityLabel(newest.intensity)}
                            <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                              ·
                            </span>
                            {areaName ?? formatCoordPair(newest.lat, newest.lng)}
                          </span>
                        </span>
                        <Chevron />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
