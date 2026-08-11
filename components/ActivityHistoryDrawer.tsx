"use client";

import { ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { ActivityDayChrome } from "@/components/ActivityDayChrome";
import {
  buildActivityScopes,
  filterReportsByScope,
} from "@/lib/activity-scope";
import { areaCellKey, type AreaLabelMap } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import {
  ACTIVITY_CLUSTER_RADIUS_M,
  clusterNearbyReports,
  type ReportCluster,
} from "@/lib/cluster-reports";
import { formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { isHotReportGroupFromReports } from "@/lib/live-map";
import { intensityIconStyle, loudestIntensity } from "@/lib/noise-meta";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";
import { hearCount, isCommunityConfirmed } from "@/lib/verification";

type ActivityHistoryDrawerProps = {
  open: boolean;
  reports: NoiseReport[];
  container?: HTMLElement | null;
  onClose: () => void;
  onOpenCluster: (cluster: ReportCluster, areaName: string | null) => void;
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

export function ActivityHistoryDrawer({
  open,
  reports,
  container = null,
  onClose,
  onOpenCluster,
}: ActivityHistoryDrawerProps) {
  const t = useTranslations("Feed");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const [now, setNow] = useState(() => Date.now());
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [areaLabels, setAreaLabels] = useState<AreaLabelMap>({});
  const timeMessages = relativeTimeMessages(tTime);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setNow(Date.now());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

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
    () =>
      buildActivityScopes(reports, scopeLabels, locale, now, {
        includeRolling24h: false,
      }),
    [reports, scopeLabels, locale, now],
  );

  const activeScope = useMemo(() => {
    if (scopes.length === 0) {
      return null;
    }
    return (
      scopes.find((scope) => scope.key === dayKey) ??
      scopes.find((scope) => scope.isToday) ??
      scopes[scopes.length - 1] ??
      null
    );
  }, [scopes, dayKey]);

  useEffect(() => {
    if (!open || scopes.length === 0) {
      return;
    }
    const preferred =
      scopes.find((scope) => scope.isToday)?.key ??
      scopes[scopes.length - 1]?.key ??
      null;
    if (!preferred) {
      return;
    }
    if (!dayKey || !scopes.some((scope) => scope.key === dayKey)) {
      const frame = window.requestAnimationFrame(() => setDayKey(preferred));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [open, scopes, dayKey]);

  const dayReports = useMemo(
    () => (activeScope ? filterReportsByScope(reports, activeScope) : []),
    [reports, activeScope],
  );

  const clusters = useMemo(
    () => clusterNearbyReports(dayReports, ACTIVITY_CLUSTER_RADIUS_M),
    [dayReports],
  );

  const areaPointsKey = useMemo(
    () =>
      clusters
        .map((cluster) => cluster.cellKey)
        .sort()
        .join("|"),
    [clusters],
  );

  useEffect(() => {
    if (!open || clusters.length === 0) {
      return;
    }
    let cancelled = false;
    void loadAreaLabelsForPoints(
      clusters.map((cluster) => ({ lat: cluster.lat, lng: cluster.lng })),
    ).then((labels) => {
      if (!cancelled) {
        setAreaLabels(labels);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- areaPointsKey
  }, [open, areaPointsKey]);

  const areaNameFor = (cluster: ReportCluster) =>
    areaLabels[cluster.cellKey] ??
    areaLabels[areaCellKey(cluster.lat, cluster.lng)] ??
    null;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      handleOnly
      shouldScaleBackground={false}
    >
      <Drawer.Portal container={container ?? undefined}>
        <Drawer.Overlay className="bruit-drawer-overlay fixed inset-0 z-[70]" />
        <Drawer.Content
          className="bruit-drawer-content bruit-activity-history-sheet fixed inset-x-0 bottom-0 z-[71] outline-none"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2" />

          <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-2">
            <div className="min-w-0">
              <Drawer.Title
                id={titleId}
                className="truncate text-[1.15rem] font-semibold tracking-tight text-[var(--bruit-ink)]"
              >
                {t("historyTitle")}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]"
              >
                {activeScope?.label ?? t("chooseDay")}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bruit-region-map-close cursor-pointer"
              aria-label={tCommon("done")}
            >
              <X size={18} strokeWidth={2.1} aria-hidden />
            </button>
          </header>

          <div className="px-3 pb-2 pt-1">
            <ActivityDayChrome
              className="bruit-activity-scope-drawer"
              scopes={scopes}
              activeKey={
                activeScope?.key ?? scopes[scopes.length - 1]?.key ?? ""
              }
              onChange={setDayKey}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {clusters.length === 0 ? (
              <div className="bruit-grouped-list px-4 py-8 text-center">
                <p className="text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                  {t("historyEmptyTitle")}
                </p>
                <p className="mt-1.5 text-[0.9rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                  {t("historyEmptyBody")}
                </p>
              </div>
            ) : (
              <div className="bruit-grouped-list overflow-hidden">
                <ul>
                  {clusters.map((cluster, index) => {
                    const newest = cluster.reports[0];
                    const isGroup = cluster.reports.length > 1;
                    const category = isGroup
                      ? dominantCategory(cluster.reports)
                      : newest?.category;
                    const level = isGroup
                      ? loudestIntensity(
                          cluster.reports.map((report) => report.intensity),
                        )
                      : (newest?.intensity ?? null);
                    const hot = isHotReportGroupFromReports(
                      cluster.reports,
                      now,
                    );
                    const areaName = areaNameFor(cluster);
                    const confirmed = cluster.reports.some((report) =>
                      isCommunityConfirmed(report),
                    );
                    const hears = cluster.reports.reduce(
                      (sum, report) => sum + hearCount(report),
                      0,
                    );

                    return (
                      <li key={cluster.id}>
                        {index > 0 ? (
                          <div className="bruit-list-separator" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onOpenCluster(cluster, areaName)}
                          className="bruit-feed-row w-full cursor-pointer text-left transition-colors duration-150"
                        >
                          <span
                            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            style={intensityIconStyle(level, { hot })}
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
                              </span>
                              <span className="shrink-0 text-[0.78rem] font-medium tabular-nums text-[var(--bruit-muted)]">
                                {newest
                                  ? formatRelativeTime(
                                      newest.created_at,
                                      timeMessages,
                                      now,
                                    )
                                  : null}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                              {categoryLabel(tCategories, category)}
                              <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                ·
                              </span>
                              {intensityLabel(tIntensities, level)}
                              {confirmed ? (
                                <>
                                  <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                                    ·
                                  </span>
                                  {t("confirmedShort", { count: hears })}
                                </>
                              ) : null}
                            </span>
                          </span>
                          <ChevronRight
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-[var(--bruit-hairline-strong)]"
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
