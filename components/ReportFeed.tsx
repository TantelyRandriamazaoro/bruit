"use client";

import { Check, ChevronRight, Ear, List, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ActivityDayChrome } from "@/components/ActivityDayChrome";
import {
  ClusterDrawer,
  type ClusterDrawerSelection,
} from "@/components/ClusterDrawer";
import {
  ACTIVITY_SCOPE_24H,
  buildActivityScopes,
  filterReportsByScope,
} from "@/lib/activity-scope";
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
  onSelectReport?: (report: NoiseReport) => void;
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

function ClusterRow({
  cluster,
  areaName,
  distanceLabel,
  nearby,
  now,
  timeMessages,
  onOpenReports,
  onShowOnMap,
  onSelectReport,
  onReportAgain,
  t,
  tCategories,
  tIntensities,
}: {
  cluster: ReportCluster;
  areaName: string | null;
  distanceLabel?: string | null;
  nearby?: boolean;
  now: number;
  timeMessages: ReturnType<typeof relativeTimeMessages>;
  onOpenReports: () => void;
  onShowOnMap?: (report: NoiseReport) => void;
  onSelectReport?: (report: NoiseReport) => void;
  onReportAgain?: (cluster: ReportCluster) => void;
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

  const goToMap = () => {
    if (onShowOnMap) {
      onShowOnMap(newest);
      return;
    }
    onSelectReport?.(newest);
  };

  if (isGroup) {
    return (
      <div className="bruit-feed-row bruit-feed-row-group items-start">
        <span
          className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={iconStyle}
        >
          <NoiseCategoryIcon
            category={category}
            size={17}
            strokeWidth={1.7}
          />
          <span className="bruit-cluster-badge" aria-hidden>
            {cluster.reports.length}
          </span>
        </span>
        <div className="min-w-0 flex-1 py-0.5">
          <button
            type="button"
            onClick={goToMap}
            className="flex w-full cursor-pointer items-start gap-2 border-none bg-transparent p-0 text-left"
            aria-label={t("showOnMap")}
          >
            <span className="min-w-0 flex-1">
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
              </span>
            </span>
            <span className="mt-1.5 shrink-0">
              <Chevron />
            </span>
          </button>
          <div
            className="bruit-feed-chips"
            role="group"
            aria-label={t("groupActions")}
          >
            <button
              type="button"
              onClick={() => {
                if (onReportAgain) {
                  onReportAgain(cluster);
                  return;
                }
                onSelectReport?.(newest);
              }}
              className="bruit-feed-chip cursor-pointer"
              aria-label={t("reportAgainAria")}
            >
              <Ear size={13} strokeWidth={2.1} aria-hidden />
              {t("reportAgain")}
            </button>
            <button
              type="button"
              onClick={onOpenReports}
              className="bruit-feed-chip cursor-pointer"
            >
              {t("reportsCount", { count: cluster.reports.length })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (nearby) {
          onSelectReport?.(newest);
          return;
        }
        if (onShowOnMap) {
          onShowOnMap(newest);
          return;
        }
        onSelectReport?.(newest);
      }}
      className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={iconStyle}
      >
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
  onShowOnMap,
  onReportAgain,
  onDeleteReport,
  canReport,
  deletingReportId = null,
  container = null,
}: ReportFeedProps) {
  const t = useTranslations("Feed");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const locale = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [scopeKey, setScopeKey] = useState(ACTIVITY_SCOPE_24H);
  const [clusterSelection, setClusterSelection] =
    useState<ClusterDrawerSelection | null>(null);
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

  const openClusterDrawer = (
    cluster: ReportCluster,
    options?: { distanceLabel?: string | null; nearby?: boolean },
  ) => {
    setClusterSelection({
      cluster,
      areaName: areaNameFor(cluster),
      distanceLabel: options?.distanceLabel ?? null,
      nearby: Boolean(options?.nearby),
    });
  };

  const activateReport = (report: NoiseReport, nearby: boolean) => {
    if (nearby) {
      onSelectReport?.(report);
      return;
    }
    if (onShowOnMap) {
      onShowOnMap(report);
      return;
    }
    onSelectReport?.(report);
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

  const periodLabel = activeScope?.label ?? t("rolling24h");
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
          {t("subtitleScoped", { period: periodLabel })}
        </p>
        <ActivityDayChrome
          scopes={scopes}
          activeKey={activeScope?.key ?? ACTIVITY_SCOPE_24H}
          onChange={setScopeKey}
        />
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
                    return (
                      <li key={report.id}>
                        {index > 0 ? (
                          <div className="bruit-list-separator" />
                        ) : null}
                        <div className="flex w-full items-stretch">
                          <button
                            type="button"
                            onClick={() => {
                              const nearby = userLocation
                                ? distanceMeters(userLocation, report) /
                                    1000 <
                                  NEARBY_ACTIVITY_KM
                                : false;
                              activateReport(report, nearby);
                            }}
                            className="bruit-feed-row min-w-0 flex-1 cursor-pointer text-left transition-colors duration-150"
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
                                {isCommunityConfirmed(report) ? (
                                  <>
                                    <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                      ·
                                    </span>
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
                            areaName={areaNameFor(cluster)}
                            distanceLabel={t("away", {
                              distance: formatDistanceKm(cluster.distanceKm),
                            })}
                            nearby
                            now={now}
                            timeMessages={timeMessages}
                            onOpenReports={() =>
                              openClusterDrawer(cluster, {
                                distanceLabel: t("away", {
                                  distance: formatDistanceKm(
                                    cluster.distanceKm,
                                  ),
                                }),
                                nearby: true,
                              })
                            }
                            onShowOnMap={onShowOnMap}
                            onSelectReport={onSelectReport}
                            onReportAgain={onReportAgain}
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
                                nearby={false}
                                now={now}
                                timeMessages={timeMessages}
                                onOpenReports={() =>
                                  openClusterDrawer(cluster, {
                                    distanceLabel,
                                    nearby: false,
                                  })
                                }
                                onShowOnMap={onShowOnMap}
                                onSelectReport={onSelectReport}
                                onReportAgain={onReportAgain}
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

      <ClusterDrawer
        selection={clusterSelection}
        container={container}
        onClose={() => setClusterSelection(null)}
        onSelectReport={(report) => {
          const nearby = clusterSelection?.nearby ?? false;
          setClusterSelection(null);
          activateReport(report, nearby);
        }}
      />
    </section>
  );
}
