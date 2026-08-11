"use client";

import { Pause, Play, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { ActivityDayChrome } from "@/components/ActivityDayChrome";
import {
  ACTIVITY_SCOPE_24H,
  ACTIVITY_SCOPE_ALL,
  buildActivityScopes,
  filterReportsByScope,
  type ActivityScope,
} from "@/lib/activity-scope";
import { filterReportsByRegion } from "@/lib/insights";
import { boundsForRegion } from "@/lib/region-bounds";
import type { NoiseReport } from "@/lib/supabase/types";

const RegionMap = dynamic(
  () => import("@/components/RegionMap").then((mod) => mod.RegionMap),
  {
    ssr: false,
    loading: () => <div className="bruit-region-map bruit-region-map-loading" />,
  },
);

const PLAY_STEP_MS = 950;
const PLAY_STEP_REDUCED_MS = 1600;

type RegionMapDrawerProps = {
  open: boolean;
  region: string;
  regionLabel: string;
  reports: NoiseReport[];
  container?: HTMLElement | null;
  onClose: () => void;
};

function nextPlayableKey(
  scopes: ActivityScope[],
  playable: ActivityScope[],
  current: string,
): string {
  if (playable.length === 0) {
    return current;
  }
  const playableIndex = playable.findIndex((scope) => scope.key === current);
  if (playableIndex >= 0) {
    return playable[(playableIndex + 1) % playable.length]?.key ?? current;
  }
  const currentIndex = scopes.findIndex((scope) => scope.key === current);
  const upcoming =
    currentIndex >= 0
      ? playable.find((scope) => {
          const index = scopes.findIndex((item) => item.key === scope.key);
          return index > currentIndex;
        })
      : null;
  return upcoming?.key ?? playable[0]?.key ?? current;
}

export function RegionMapDrawer({
  open,
  region,
  regionLabel,
  reports,
  container = null,
  onClose,
}: RegionMapDrawerProps) {
  const t = useTranslations("Insights");
  const tFeed = useTranslations("Feed");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const [now, setNow] = useState(() => Date.now());
  const [scopeKey, setScopeKey] = useState(ACTIVITY_SCOPE_ALL);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setNow(Date.now());
      setScopeKey(ACTIVITY_SCOPE_ALL);
      setPlaying(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, region]);

  const regionReports = useMemo(
    () => filterReportsByRegion(reports, region),
    [reports, region],
  );

  const scopeLabels = useMemo(
    () => ({
      rolling24h: tFeed("rolling24h"),
      rolling24hShort: tFeed("rolling24hShort"),
      today: tCommon("today"),
      yesterday: tCommon("yesterday"),
      allTime: t("allTime"),
      allTimeShort: t("allTimeShort"),
    }),
    [t, tFeed, tCommon],
  );

  const scopes = useMemo(
    () =>
      buildActivityScopes(regionReports, scopeLabels, locale, now, {
        includeAllTime: true,
      }),
    [regionReports, scopeLabels, locale, now],
  );

  const playableScopes = useMemo(
    () =>
      scopes.filter(
        (scope) => scope.count > 0 && !scope.isAllTime,
      ),
    [scopes],
  );

  const activeScope = useMemo(
    () =>
      scopes.find((scope) => scope.key === scopeKey) ??
      scopes.find((scope) => scope.key === ACTIVITY_SCOPE_ALL) ??
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
      setScopeKey(ACTIVITY_SCOPE_ALL);
    }
  }, [scopes, scopeKey]);

  const scopedReports = useMemo(
    () => (activeScope ? filterReportsByScope(regionReports, activeScope) : []),
    [regionReports, activeScope],
  );

  const bounds = useMemo(
    () => boundsForRegion(region, regionReports),
    [region, regionReports],
  );

  useEffect(() => {
    if (!open || !playing || playableScopes.length === 0) {
      if (playing && playableScopes.length === 0) {
        setPlaying(false);
      }
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stepMs = reduceMotion ? PLAY_STEP_REDUCED_MS : PLAY_STEP_MS;

    const id = window.setInterval(() => {
      setScopeKey((current) => nextPlayableKey(scopes, playableScopes, current));
    }, stepMs);

    return () => window.clearInterval(id);
  }, [open, playing, playableScopes, scopes]);

  const handleScopeChange = (key: string) => {
    setPlaying(false);
    setScopeKey(key);
  };

  const periodLabel = activeScope?.label ?? t("allTime");
  const mapLabel = t("regionMapAria", {
    region: regionLabel,
    period: periodLabel,
  });
  const canPlay = playableScopes.length > 0;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPlaying(false);
          onClose();
        }
      }}
      handleOnly
      shouldScaleBackground={false}
    >
      <Drawer.Portal container={container ?? undefined}>
        <Drawer.Overlay className="bruit-drawer-overlay fixed inset-0 z-[80]" />
        <Drawer.Content
          className="bruit-drawer-content bruit-region-map-sheet fixed inset-x-0 bottom-0 z-[81] outline-none"
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
                {regionLabel}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]"
              >
                {t("regionMapSubtitle")}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                onClose();
              }}
              className="bruit-region-map-close cursor-pointer"
              aria-label={tCommon("done")}
            >
              <X size={18} strokeWidth={2.1} aria-hidden />
            </button>
          </header>

          <div className="px-3 pb-2 pt-1">
            <ActivityDayChrome
              scopes={scopes}
              activeKey={activeScope?.key ?? ACTIVITY_SCOPE_ALL}
              onChange={handleScopeChange}
            />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden px-3">
            <div className="bruit-region-map-drawer-frame" data-vaul-no-drag="">
              {open ? (
                <RegionMap
                  reports={scopedReports}
                  bounds={bounds}
                  label={mapLabel}
                  fitKey={`${region}:drawer`}
                  interactive
                />
              ) : null}
              <div className="bruit-region-map-legend" aria-hidden>
                <span>{t("regionMapQuiet")}</span>
                <span className="bruit-region-map-legend-bar" />
                <span>{t("regionMapLoud")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => {
                if (!canPlay) {
                  return;
                }
                setPlaying((value) => !value);
              }}
              disabled={!canPlay}
              className="bruit-region-map-play cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              aria-pressed={playing}
              aria-label={playing ? t("pausePlayback") : t("playPlayback")}
            >
              {playing ? (
                <Pause
                  size={20}
                  strokeWidth={2.1}
                  fill="currentColor"
                  aria-hidden
                />
              ) : (
                <Play
                  size={20}
                  strokeWidth={2.1}
                  fill="currentColor"
                  className="translate-x-[1px]"
                  aria-hidden
                />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.02rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                {periodLabel}
              </p>
              <p className="truncate text-[0.84rem] font-medium text-[var(--bruit-muted)]">
                {t("reportsCount", { count: scopedReports.length })}
                <span className="mx-1.5 text-[var(--bruit-hairline-strong)]">
                  ·
                </span>
                {playing
                  ? t("playingHint")
                  : canPlay
                    ? t("playbackHint")
                    : t("playbackEmpty")}
              </p>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
