"use client";

import { Check, ChevronRight, List, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityDrawer,
  type ActivityDrawerSelection,
} from "@/components/ActivityDrawer";
import { filterReportsLast24h } from "@/lib/activity-scope";
import { areaCellKey, type AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import {
  ACTIVITY_CLUSTER_RADIUS_M,
  clusterNearbyReports,
  distanceMeters,
  type ReportCluster,
} from "@/lib/cluster-reports";
import { NEARBY_ACTIVITY_KM } from "@/lib/constants";
import { formatDistanceKm, formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { isHotReportGroupFromReports } from "@/lib/live-map";
import {
  groupByRegion,
  UNKNOWN_REGION,
} from "@/lib/madagascar-regions";
import {
  intensityIconStyle,
  loudestIntensity,
} from "@/lib/noise-meta";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";
import { hearCount, isCommunityConfirmed } from "@/lib/verification";

type NearbyCluster = ReportCluster & { distanceKm: number };

type ReportFeedProps = {
  reports: NoiseReport[];
  myReports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  onReport: () => void;
  onShowOnMap?: (report: NoiseReport) => void;
  /** Open the confirmation drawer to corroborate a report group. */
  onReportAgain?: (cluster: ReportCluster) => void;
  onDeleteReport?: (report: NoiseReport) => void | Promise<void>;
  canReport: boolean;
  deletingReportId?: string | null;
  container?: HTMLElement | null;
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

function MetaDot() {
  return (
    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]" aria-hidden>
      ·
    </span>
  );
}

function VerifiedMark({ label }: { label: string }) {
  return (
    <span className="bruit-verified-inline" title={label}>
      <Check size={11} strokeWidth={2.6} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function clusterHearCount(reports: NoiseReport[]): number {
  return reports.reduce((sum, report) => sum + hearCount(report), 0);
}

function clusterIsConfirmed(reports: NoiseReport[]): boolean {
  return reports.some((report) => isCommunityConfirmed(report));
}

function clusterFromReport(report: NoiseReport): ReportCluster {
  return {
    id: report.id,
    reports: [report],
    lat: report.lat,
    lng: report.lng,
    cellKey: areaCellKey(report.lat, report.lng),
  };
}

function ClusterRow({
  cluster,
  areaName,
  distanceLabel,
  now,
  timeMessages,
  onOpen,
  t,
  tCategories,
  tIntensities,
}: {
  cluster: ReportCluster;
  areaName: string | null;
  distanceLabel?: string | null;
  now: number;
  timeMessages: ReturnType<typeof relativeTimeMessages>;
  onOpen: () => void;
  t: ReturnType<typeof useTranslations<"Feed">>;
  tCategories: ReturnType<typeof useTranslations<"Categories">>;
  tIntensities: ReturnType<typeof useTranslations<"Intensities">>;
}) {
  const newest = cluster.reports[0];
  const isGroup = cluster.reports.length > 1;
  const category = isGroup
    ? dominantCategory(cluster.reports)
    : newest.category;
  const confirmed = isGroup
    ? clusterIsConfirmed(cluster.reports)
    : isCommunityConfirmed(newest);
  const confirmedCount = isGroup
    ? clusterHearCount(cluster.reports)
    : hearCount(newest);
  const verifiedLabel =
    confirmedCount > 0 ? t("confirmedShort", { count: confirmedCount }) : null;
  const level = isGroup
    ? loudestIntensity(cluster.reports.map((report) => report.intensity))
    : newest.intensity;
  const hot = isHotReportGroupFromReports(cluster.reports, now);
  const iconStyle = intensityIconStyle(level, { hot });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
      aria-label={t("openDetails")}
    >
      <span
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={iconStyle}
      >
        <NoiseCategoryIcon
          category={category}
          size={17}
          strokeWidth={1.7}
        />
        {isGroup ? (
          <span className="bruit-cluster-badge" aria-hidden>
            {cluster.reports.length}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
            {areaName ?? t("lookingUpArea")}
            {confirmed && verifiedLabel ? (
              <>
                {" "}
                <VerifiedMark label={verifiedLabel} />
              </>
            ) : null}
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
          {categoryLabel(tCategories, category)}
          <MetaDot />
          {intensityLabel(tIntensities, level)}
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
  onShowOnMap,
  onReportAgain,
  onDeleteReport,
  canReport,
  deletingReportId = null,
  container = null,
}: ReportFeedProps) {
  const t = useTranslations("Feed");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const [now, setNow] = useState(() => Date.now());
  const [activitySelection, setActivitySelection] =
    useState<ActivityDrawerSelection | null>(null);
  const [areaLabels, setAreaLabels] = useState<AreaLabelMap>({});
  const timeMessages = relativeTimeMessages(tTime);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const scopedReports = useMemo(
    () => filterReportsLast24h(reports, now),
    [reports, now],
  );

  const scopedMyReports = useMemo(
    () => filterReportsLast24h(myReports, now),
    [myReports, now],
  );

  const clusters = useMemo(
    () => clusterNearbyReports(scopedReports, ACTIVITY_CLUSTER_RADIUS_M),
    [scopedReports],
  );

  const { nearbyClusters, fartherClusters } = useMemo(() => {
    if (!userLocation) {
      return {
        nearbyClusters: [] as NearbyCluster[],
        fartherClusters: [] as NearbyCluster[],
      };
    }

    const nearby: NearbyCluster[] = [];
    const farther: NearbyCluster[] = [];

    for (const cluster of clusters) {
      const distanceKm = distanceMeters(userLocation, cluster) / 1000;
      const withDistance = { ...cluster, distanceKm };
      if (distanceKm < NEARBY_ACTIVITY_KM) {
        nearby.push(withDistance);
      } else {
        farther.push(withDistance);
      }
    }

    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    farther.sort((a, b) => a.distanceKm - b.distanceKm);
    return { nearbyClusters: nearby, fartherClusters: farther };
  }, [clusters, userLocation]);

  const regionGroups = useMemo(() => {
    // Without location, show everything under region names (newest first).
    if (!userLocation) {
      return groupByRegion(clusters, null, (cluster) =>
        new Date(cluster.reports[0]?.created_at ?? 0).getTime(),
      );
    }

    return groupByRegion(
      fartherClusters,
      userLocation,
      (cluster) => new Date(cluster.reports[0]?.created_at ?? 0).getTime(),
      (cluster) => cluster.distanceKm,
    );
  }, [clusters, fartherClusters, userLocation]);

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

  const areaNameFor = (point: {
    cellKey?: string;
    lat: number;
    lng: number;
  }) =>
    (point.cellKey ? areaLabels[point.cellKey] : undefined) ??
    areaLabels[areaCellKey(point.lat, point.lng)] ??
    null;

  const openActivity = (cluster: ReportCluster) => {
    setActivitySelection({
      cluster,
      areaName: areaNameFor(cluster),
    });
  };

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

  const hasAnyInScope = scopedReports.length > 0;
  const myReportsEmptyCopy =
    myReports.length === 0 ? t("myReportsEmpty") : t("myReportsEmptyScoped");

  return (
    <section className="bruit-feed absolute inset-0 z-10 flex flex-col overflow-y-auto overscroll-contain bg-[var(--bruit-map-wash)] pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)] md:overflow-hidden md:pb-0">
      <header className="bruit-feed-header shrink-0 px-5 pb-2 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1 className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-sm text-[0.94rem] font-medium leading-snug text-[var(--bruit-muted)]">
          {t("subtitleScoped", { period: t("rolling24h") })}
        </p>
      </header>

      <div className="px-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)]">
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
                    const distanceLabel =
                      userLocation
                        ? t("away", {
                            distance: formatDistanceKm(
                              distanceMeters(userLocation, report) / 1000,
                            ),
                          })
                        : null;
                    return (
                      <li key={report.id}>
                        {index > 0 ? (
                          <div className="bruit-list-separator" />
                        ) : null}
                        <div className="flex w-full items-stretch">
                          <button
                            type="button"
                            onClick={() =>
                              openActivity(clusterFromReport(report))
                            }
                            className="bruit-feed-row min-w-0 flex-1 cursor-pointer text-left transition-colors duration-150"
                            aria-label={t("openDetails")}
                          >
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                              style={intensityIconStyle(report.intensity, {
                                hot: isHotReportGroupFromReports(
                                  [report],
                                  now,
                                ),
                              })}
                            >
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
                                {distanceLabel ? (
                                  <>
                                    {distanceLabel}
                                    <MetaDot />
                                  </>
                                ) : null}
                                {categoryLabel(tCategories, report.category)}
                                <MetaDot />
                                {intensityLabel(tIntensities, report.intensity)}
                                {typeof report.db_avg === "number" ? (
                                  <>
                                    <MetaDot />
                                    {Math.round(report.db_avg)} dB
                                  </>
                                ) : null}
                                {isCommunityConfirmed(report) ? (
                                  <>
                                    <MetaDot />
                                    <VerifiedMark
                                      label={t("confirmedShort", {
                                        count: hearCount(report),
                                      })}
                                    />
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
                  {reports.length === 0
                    ? t("emptyBody")
                    : t("empty24hBody")}
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
                            areaName={areaNameFor(cluster)}
                            distanceLabel={t("away", {
                              distance: formatDistanceKm(cluster.distanceKm),
                            })}
                            now={now}
                            timeMessages={timeMessages}
                            onOpen={() => openActivity(cluster)}
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
                        {group.items.map((cluster, index) => {
                          const distanceLabel =
                            typeof (cluster as NearbyCluster).distanceKm ===
                            "number"
                              ? t("away", {
                                  distance: formatDistanceKm(
                                    (cluster as NearbyCluster).distanceKm,
                                  ),
                                })
                              : null;
                          return (
                            <li key={cluster.id}>
                              {index > 0 ? (
                                <div className="bruit-list-separator" />
                              ) : null}
                              <ClusterRow
                                cluster={cluster}
                                areaName={areaNameFor(cluster)}
                                distanceLabel={distanceLabel}
                                now={now}
                                timeMessages={timeMessages}
                                onOpen={() => openActivity(cluster)}
                                t={t}
                                tCategories={tCategories}
                                tIntensities={tIntensities}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>

      <ActivityDrawer
        selection={activitySelection}
        userLocation={userLocation}
        container={container}
        onClose={() => setActivitySelection(null)}
        onShowOnMap={(report) => {
          setActivitySelection(null);
          onShowOnMap?.(report);
        }}
        onReportAgain={onReportAgain}
      />
    </section>
  );
}
