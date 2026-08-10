"use client";

import { ChevronRight, List, Map as MapIcon, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ActivityDayChrome } from "@/components/ActivityDayChrome";
import {
  ACTIVITY_SCOPE_24H,
  buildActivityScopes,
  filterReportsByScope,
} from "@/lib/activity-scope";
import { areaCellKey, type AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import { NEARBY_ACTIVITY_KM } from "@/lib/constants";
import {
  ACTIVITY_CLUSTER_RADIUS_M,
  clusterNearbyReports,
  distanceMeters,
  type ReportCluster,
} from "@/lib/cluster-reports";
import { formatDistanceKm, formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import {
  groupByRegion,
  UNKNOWN_REGION,
} from "@/lib/madagascar-regions";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";

type NearbyCluster = ReportCluster & { distanceKm: number };

type ReportFeedProps = {
  reports: NoiseReport[];
  myReports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
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

function MetaDot() {
  return (
    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]" aria-hidden>
      ·
    </span>
  );
}

function ClusterRow({
  cluster,
  expanded,
  areaName,
  distanceLabel,
  now,
  timeMessages,
  onToggle,
  onSelectReport,
  t,
  tCategories,
  tIntensities,
}: {
  cluster: ReportCluster;
  expanded: boolean;
  areaName: string | null;
  distanceLabel?: string | null;
  now: number;
  timeMessages: ReturnType<typeof relativeTimeMessages>;
  onToggle: () => void;
  onSelectReport?: (report: NoiseReport) => void;
  t: ReturnType<typeof useTranslations<"Feed">>;
  tCategories: ReturnType<typeof useTranslations<"Categories">>;
  tIntensities: ReturnType<typeof useTranslations<"Intensities">>;
}) {
  const newest = cluster.reports[0];
  const isGroup = cluster.reports.length > 1;
  const category = isGroup
    ? dominantCategory(cluster.reports)
    : newest.category;

  if (isGroup) {
    return (
      <>
        <div className="flex w-full items-stretch">
          <button
            type="button"
            onClick={onToggle}
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
                  {formatRelativeTime(newest.created_at, timeMessages, now)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                {distanceLabel ? (
                  <>
                    {distanceLabel}
                    <MetaDot />
                  </>
                ) : null}
                {t("reportsCount", { count: cluster.reports.length })}
                <MetaDot />
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
            <MapIcon size={16} strokeWidth={1.7} aria-hidden />
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
                        {categoryLabel(tCategories, report.category)}
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
                      {intensityLabel(tIntensities, report.intensity)}
                    </span>
                  </span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  }

  return (
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
            {formatRelativeTime(newest.created_at, timeMessages, now)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
          {distanceLabel ? (
            <>
              {distanceLabel}
              <MetaDot />
            </>
          ) : null}
          {categoryLabel(tCategories, newest.category)}
          <MetaDot />
          {intensityLabel(tIntensities, newest.intensity)}
          {typeof newest.db_avg === "number" ? (
            <>
              <MetaDot />
              {Math.round(newest.db_avg)} dB
            </>
          ) : null}
        </span>
      </span>
      <Chevron />
    </button>
  );
}

export function ReportFeed({
  reports,
  myReports,
  userLocation,
  onReport,
  onSelectReport,
  onDeleteReport,
  canReport,
  deletingReportId = null,
}: ReportFeedProps) {
  const t = useTranslations("Feed");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [scopeKey, setScopeKey] = useState(ACTIVITY_SCOPE_24H);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [areaLabels, setAreaLabels] = useState<AreaLabelMap>({});
  const timeMessages = relativeTimeMessages(tTime);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const scopeLabels = useMemo(
    () => ({
      rolling24h: t("rolling24h"),
      rolling24hShort: t("rolling24hShort"),
      today: tCommon("today"),
      yesterday: tCommon("yesterday"),
    }),
    [t, tCommon],
  );

  const scopes = useMemo(
    () => buildActivityScopes(reports, scopeLabels, locale, now),
    [reports, scopeLabels, locale, now],
  );

  const activeScope = useMemo(
    () =>
      scopes.find((scope) => scope.key === scopeKey) ??
      scopes.find((scope) => scope.key === ACTIVITY_SCOPE_24H) ??
      scopes[scopes.length - 1] ??
      null,
    [scopes, scopeKey],
  );

  useEffect(() => {
    if (scopes.length === 0) {
      return;
    }
    if (!scopes.some((scope) => scope.key === scopeKey)) {
      setScopeKey(ACTIVITY_SCOPE_24H);
    }
  }, [scopes, scopeKey]);

  const scopedReports = useMemo(
    () => (activeScope ? filterReportsByScope(reports, activeScope) : reports),
    [reports, activeScope],
  );

  const scopedMyReports = useMemo(
    () =>
      activeScope ? filterReportsByScope(myReports, activeScope) : myReports,
    [myReports, activeScope],
  );

  const clusters = useMemo(
    () => clusterNearbyReports(scopedReports, ACTIVITY_CLUSTER_RADIUS_M),
    [scopedReports],
  );

  const { nearbyClusters, fartherClusters } = useMemo(() => {
    if (!userLocation) {
      return {
        nearbyClusters: [] as NearbyCluster[],
        fartherClusters: clusters,
      };
    }

    const nearby: NearbyCluster[] = [];
    const farther: ReportCluster[] = [];

    for (const cluster of clusters) {
      const distanceKm = distanceMeters(userLocation, cluster) / 1000;
      if (distanceKm <= NEARBY_ACTIVITY_KM) {
        nearby.push({ ...cluster, distanceKm });
      } else {
        farther.push(cluster);
      }
    }

    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    return { nearbyClusters: nearby, fartherClusters: farther };
  }, [clusters, userLocation]);

  const regionGroups = useMemo(
    () =>
      groupByRegion(fartherClusters, userLocation, (cluster) =>
        new Date(cluster.reports[0]?.created_at ?? 0).getTime(),
      ),
    [fartherClusters, userLocation],
  );

  const areaPoints = useMemo(
    () => [
      ...clusters.map((cluster) => ({
        lat: cluster.lat,
        lng: cluster.lng,
      })),
      ...scopedMyReports.map((report) => ({
        lat: report.lat,
        lng: report.lng,
      })),
    ],
    [clusters, scopedMyReports],
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

  const regionTitle = (region: string) =>
    region === UNKNOWN_REGION ? t("elsewhere") : region;

  const handleDelete = (report: NoiseReport) => {
    if (!onDeleteReport || deletingReportId) {
      return;
    }

    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }

    void onDeleteReport(report);
  };

  const periodLabel = activeScope?.label ?? t("rolling24h");
  const hasAnyInScope = scopedReports.length > 0;
  const myReportsEmptyCopy =
    myReports.length === 0 ? t("myReportsEmpty") : t("myReportsEmptyScoped");

  return (
    <section className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]">
      <header className="bruit-feed-header shrink-0 px-5 pb-2 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1 className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-sm text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          {t("subtitleScoped", { period: periodLabel })}
        </p>
        <ActivityDayChrome
          scopes={scopes}
          activeKey={activeScope?.key ?? ACTIVITY_SCOPE_24H}
          onChange={setScopeKey}
        />
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
            {scopedMyReports.length === 0 ? (
              <div className="bruit-grouped-list px-4 py-4 text-[0.9rem] font-medium text-[var(--bruit-muted)]">
                {myReportsEmptyCopy}
              </div>
            ) : (
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {scopedMyReports.map((report, index) => {
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

          {!hasAnyInScope ? (
            <section aria-labelledby="feed-empty-title">
              <p
                id="feed-empty-title"
                className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
              >
                {t("nearby")}
              </p>
              <div className="bruit-grouped-list px-2 py-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bruit-surface)] text-[var(--bruit-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <List size={24} strokeWidth={1.7} aria-hidden />
                </div>
                <p className="text-[1.2rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                  {reports.length === 0 ? t("emptyTitle") : t("emptyScopedTitle")}
                </p>
                <p className="mt-1.5 text-[0.92rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                  {reports.length === 0 ? t("emptyBody") : t("emptyScopedBody")}
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
            </section>
          ) : (
            <>
              <section aria-labelledby="feed-nearby-title">
                <p
                  id="feed-nearby-title"
                  className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
                >
                  {t("nearby")}
                </p>

                {!userLocation ? (
                  <div className="bruit-grouped-list px-4 py-3.5 text-[0.95rem] font-normal leading-snug text-[var(--bruit-muted)]">
                    {t("locationOff")}
                  </div>
                ) : nearbyClusters.length === 0 ? (
                  <div className="bruit-grouped-list px-4 py-3.5 text-[0.95rem] font-normal leading-snug text-[var(--bruit-muted)]">
                    {t("noneNearby")}
                  </div>
                ) : (
                  <div className="bruit-grouped-list overflow-hidden">
                    <ul>
                      {nearbyClusters.map((cluster, index) => (
                        <li key={cluster.id}>
                          {index > 0 ? (
                            <div className="bruit-list-separator" />
                          ) : null}
                          <ClusterRow
                            cluster={cluster}
                            expanded={expandedIds.has(cluster.id)}
                            areaName={areaNameFor(cluster)}
                            distanceLabel={t("away", {
                              distance: formatDistanceKm(cluster.distanceKm),
                            })}
                            now={now}
                            timeMessages={timeMessages}
                            onToggle={() => toggleExpanded(cluster.id)}
                            onSelectReport={onSelectReport}
                            t={t}
                            tCategories={tCategories}
                            tIntensities={tIntensities}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {regionGroups.map((group) => {
                const titleId = `feed-region-${group.region}`;
                return (
                  <section key={group.region} aria-labelledby={titleId}>
                    <p
                      id={titleId}
                      className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
                    >
                      {regionTitle(group.region)}
                    </p>
                    <div className="bruit-grouped-list overflow-hidden">
                      <ul>
                        {group.items.map((cluster, index) => (
                          <li key={cluster.id}>
                            {index > 0 ? (
                              <div className="bruit-list-separator" />
                            ) : null}
                            <ClusterRow
                              cluster={cluster}
                              expanded={expandedIds.has(cluster.id)}
                              areaName={areaNameFor(cluster)}
                              now={now}
                              timeMessages={timeMessages}
                              onToggle={() => toggleExpanded(cluster.id)}
                              onSelectReport={onSelectReport}
                              t={t}
                              tCategories={tCategories}
                              tIntensities={tIntensities}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
