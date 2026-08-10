"use client";

import { ChevronRight, List, Map as MapIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { areaCellKey, type AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import { clusterNearbyReports } from "@/lib/cluster-reports";
import { formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";

type ReportFeedProps = {
  reports: NoiseReport[];
  myReports: NoiseReport[];
  onReport: () => void;
  onSelectReport?: (report: NoiseReport) => void;
  onDeleteReport?: (report: NoiseReport) => void | Promise<void>;
  canReport: boolean;
  deletingReportId?: string | null;
};

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

function Chevron({ expanded }: { expanded?: boolean }) {
  return (
    <ChevronRight
      size={14}
      strokeWidth={2}
      className={`shrink-0 text-[var(--bruit-hairline-strong)] transition-transform duration-200 ${
        expanded ? "rotate-90" : ""
      }`}
      aria-hidden
    />
  );
}

export function ReportFeed({
  reports,
  myReports,
  onReport,
  onSelectReport,
  onDeleteReport,
  canReport,
  deletingReportId = null,
}: ReportFeedProps) {
  const t = useTranslations("Feed");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const [now, setNow] = useState(() => Date.now());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [areaLabels, setAreaLabels] = useState<AreaLabelMap>({});
  const timeMessages = relativeTimeMessages(tTime);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const clusters = useMemo(() => clusterNearbyReports(reports), [reports]);

  const areaPoints = useMemo(
    () => [
      ...clusters.map((cluster) => ({
        lat: cluster.lat,
        lng: cluster.lng,
      })),
      ...myReports.map((report) => ({
        lat: report.lat,
        lng: report.lng,
      })),
    ],
    [clusters, myReports],
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

  const areaNameFor = (point: {
    cellKey?: string;
    lat: number;
    lng: number;
  }) =>
    (point.cellKey ? areaLabels[point.cellKey] : undefined) ??
    areaLabels[areaCellKey(point.lat, point.lng)] ??
    null;

  const handleDelete = (report: NoiseReport) => {
    if (!onDeleteReport || deletingReportId) {
      return;
    }

    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }

    void onDeleteReport(report);
  };

  return (
    <section className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]">
      <header className="bruit-feed-header shrink-0 px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1 className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]">
          {t("title")}
        </h1>
        <p className="mt-1 text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          {t("subtitle")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)]">
        <div className="mx-auto max-w-lg space-y-5">
          <section aria-labelledby="feed-my-reports-title">
            <p
              id="feed-my-reports-title"
              className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
            >
              {t("myReports")}
            </p>
            {myReports.length === 0 ? (
              <div className="bruit-grouped-list px-4 py-4 text-[0.9rem] font-medium text-[var(--bruit-muted)]">
                {t("myReportsEmpty")}
              </div>
            ) : (
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {myReports.map((report, index) => {
                    const deleting = deletingReportId === report.id;
                    const areaName = areaNameFor(report);
                    return (
                      <li key={report.id}>
                        {index > 0 ? (
                          <div className="bruit-list-separator" />
                        ) : null}
                        <div className="flex w-full items-stretch">
                          <button
                            type="button"
                            onClick={() => onSelectReport?.(report)}
                            className="bruit-feed-row min-w-0 flex-1 cursor-pointer text-left transition-colors duration-150"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,122,255,0.12)] text-[var(--bruit-accent)]">
                              <NoiseCategoryIcon
                                category={report.category}
                                size={17}
                                strokeWidth={1.7}
                              />
                            </span>
                            <span className="min-w-0 flex-1 py-0.5">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                  {areaName ?? t("lookingUpArea")}
                                </span>
                                <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                  {formatRelativeTime(
                                    report.created_at,
                                    timeMessages,
                                    now,
                                  )}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                                {categoryLabel(tCategories, report.category)}
                                <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                  ·
                                </span>
                                {intensityLabel(tIntensities, report.intensity)}
                                {typeof report.db_avg === "number" ? (
                                  <>
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
                                    {Math.round(report.db_avg)} dB
                                  </>
                                ) : null}
                              </span>
                            </span>
                            <Chevron />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            disabled={Boolean(deletingReportId)}
                            className="bruit-feed-delete-btn cursor-pointer"
                            aria-label={
                              deleting ? t("deleting") : t("deleteReport")
                            }
                            title={t("deleteReport")}
                          >
                            <Trash2 size={16} strokeWidth={1.7} aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="feed-nearby-title">
            <p
              id="feed-nearby-title"
              className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
            >
              {t("nearby")}
            </p>

            {reports.length === 0 ? (
              <div className="bruit-grouped-list px-2 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bruit-surface)] text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <List size={24} strokeWidth={1.7} aria-hidden />
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
              <div className="bruit-grouped-list overflow-hidden">
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
                        {index > 0 ? (
                          <div className="bruit-list-separator" />
                        ) : null}

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
                                  <NoiseCategoryIcon
                                    category={category}
                                    size={17}
                                    strokeWidth={1.7}
                                  />
                                  <span className="bruit-cluster-badge" aria-hidden>
                                    {cluster.reports.length}
                                  </span>
                                </span>
                                <span className="min-w-0 flex-1 py-0.5">
                                  <span className="flex items-baseline justify-between gap-3">
                                    <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                      {areaName ?? t("lookingUpArea")}
                                    </span>
                                    <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                      {formatRelativeTime(
                                        newest.created_at,
                                        timeMessages,
                                        now,
                                      )}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                                    {t("reportsCount", {
                                      count: cluster.reports.length,
                                    })}
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
                                    {categoryLabel(tCategories, category)}
                                  </span>
                                </span>
                                <Chevron expanded={expanded} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectReport?.(newest)}
                                className="bruit-feed-map-btn cursor-pointer"
                                aria-label={t("showOnMap")}
                                title={t("showOnMapShort")}
                              >
                                <MapIcon
                                  size={16}
                                  strokeWidth={1.7}
                                  aria-hidden
                                />
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
                                        <NoiseCategoryIcon
                                          category={report.category}
                                          size={15}
                                          strokeWidth={1.7}
                                        />
                                      </span>
                                      <span className="min-w-0 flex-1 py-0.5">
                                        <span className="flex items-baseline justify-between gap-3">
                                          <span className="truncate text-[0.95rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                            {categoryLabel(
                                              tCategories,
                                              report.category,
                                            )}
                                          </span>
                                          <span className="shrink-0 text-[0.74rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                            {formatRelativeTime(
                                              report.created_at,
                                              timeMessages,
                                              now,
                                            )}
                                          </span>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[0.8rem] font-medium text-[var(--bruit-muted)]">
                                          {intensityLabel(
                                            tIntensities,
                                            report.intensity,
                                          )}
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
                              <NoiseCategoryIcon
                                category={newest.category}
                                size={17}
                                strokeWidth={1.7}
                              />
                            </span>
                            <span className="min-w-0 flex-1 py-0.5">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                                  {areaName ?? t("lookingUpArea")}
                                </span>
                                <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                  {formatRelativeTime(
                                    newest.created_at,
                                    timeMessages,
                                    now,
                                  )}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                                {categoryLabel(tCategories, newest.category)}
                                <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                  ·
                                </span>
                                {intensityLabel(tIntensities, newest.intensity)}
                                {typeof newest.db_avg === "number" ? (
                                  <>
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
                                    {Math.round(newest.db_avg)} dB
                                  </>
                                ) : null}
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
          </section>
        </div>
      </div>
    </section>
  );
}
