"use client";

import {
  Check,
  Ear,
  Map as MapIcon,
  MapPin,
  Radio,
  VolumeX,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Drawer } from "vaul";
import type { ReportCluster } from "@/lib/cluster-reports";
import { distanceMeters } from "@/lib/cluster-reports";
import { VICINITY_RADIUS_M } from "@/lib/constants";
import { formatDistanceKm, formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { isHotReportGroupFromReports } from "@/lib/live-map";
import { intensityIconStyle, loudestIntensity } from "@/lib/noise-meta";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";
import {
  canVerifyNearby,
  hearCount,
  isCommunityConfirmed,
  quietCount,
} from "@/lib/verification";

export type ActivityDrawerSelection = {
  cluster: ReportCluster;
  areaName: string | null;
};

type ActivityDrawerProps = {
  selection: ActivityDrawerSelection | null;
  userLocation: { lat: number; lng: number } | null;
  container?: HTMLElement | null;
  onClose: () => void;
  onShowOnMap: (report: NoiseReport) => void;
  onReportAgain?: (cluster: ReportCluster) => void;
};

function ActionButton({
  label,
  tone,
  disabled,
  showDivider,
  onClick,
  children,
}: {
  label: string;
  tone: "accent" | "muted";
  disabled?: boolean;
  showDivider?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`bruit-place-action relative flex min-h-[5.5rem] min-w-[4.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-2 px-3 py-3 outline-none transition-colors duration-150 hover:bg-[var(--bruit-row-hover)] active:bg-[var(--bruit-row-active)] focus-visible:bg-[var(--bruit-row-hover)] disabled:cursor-not-allowed disabled:opacity-45 ${
        showDivider
          ? "before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-[var(--bruit-hairline)]"
          : ""
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
          tone === "accent"
            ? "bg-[var(--bruit-accent)] text-[var(--bruit-on-accent)]"
            : "bg-[var(--bruit-fill)] text-[var(--bruit-ink)]"
        }`}
        aria-hidden
      >
        {children}
      </span>
      <span
        className={`text-[0.8rem] font-semibold tracking-[-0.01em] ${
          tone === "accent"
            ? "text-[var(--bruit-accent)]"
            : "text-[var(--bruit-ink)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function FactRow({
  label,
  value,
  leading,
  showSeparator,
  emphasize,
}: {
  label: string;
  value: string;
  leading: ReactNode;
  showSeparator?: boolean;
  emphasize?: "success" | "muted" | "accent";
}) {
  const valueClass =
    emphasize === "success"
      ? "text-[var(--bruit-success)]"
      : emphasize === "accent"
        ? "text-[var(--bruit-accent)]"
        : "text-[var(--bruit-ink)]";

  return (
    <>
      {showSeparator ? (
        <div className="ml-[3.55rem] h-px bg-[var(--bruit-hairline)]" />
      ) : null}
      <div className="flex min-h-[3.25rem] items-center gap-3 px-3.5 py-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-[var(--bruit-fill)] text-[var(--bruit-accent)]"
          aria-hidden
        >
          {leading}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-medium leading-none text-[var(--bruit-muted)]">
            {label}
          </span>
          <span
            className={`mt-1 block truncate text-[1.02rem] font-semibold tracking-[-0.02em] ${valueClass}`}
          >
            {value}
          </span>
        </span>
      </div>
    </>
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

export function ActivityDrawer({
  selection,
  userLocation,
  container = null,
  onClose,
  onShowOnMap,
  onReportAgain,
}: ActivityDrawerProps) {
  const t = useTranslations("Feed");
  const tIncident = useTranslations("Incident");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const titleId = useId();
  const descriptionId = useId();
  const open = selection !== null;
  const timeMessages = relativeTimeMessages(tTime);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  const cluster = selection?.cluster ?? null;
  const reports = cluster?.reports ?? [];
  const newest = reports[0] ?? null;
  const isGroup = reports.length > 1;

  const category = useMemo(() => {
    if (!cluster) {
      return null;
    }
    return isGroup ? dominantCategory(reports) : newest?.category;
  }, [cluster, isGroup, newest?.category, reports]);

  const level = useMemo(() => {
    if (!cluster) {
      return null;
    }
    return isGroup
      ? loudestIntensity(reports.map((report) => report.intensity))
      : (newest?.intensity ?? null);
  }, [cluster, isGroup, newest?.intensity, reports]);

  const hot = isHotReportGroupFromReports(reports, now);
  const hears = reports.reduce((sum, report) => sum + hearCount(report), 0);
  const quiets = reports.reduce((sum, report) => sum + quietCount(report), 0);
  const confirmed = reports.some((report) => isCommunityConfirmed(report));
  const markedQuiet = quiets > hears && quiets > 0;
  const inVicinity = newest
    ? canVerifyNearby(userLocation, newest, VICINITY_RADIUS_M)
    : false;

  const distanceKm = useMemo(() => {
    if (!cluster || !userLocation) {
      return null;
    }
    return distanceMeters(userLocation, cluster) / 1000;
  }, [cluster, userLocation]);

  const peakDb = useMemo(() => {
    let peak: number | null = null;
    for (const report of reports) {
      const value =
        typeof report.db_peak === "number"
          ? report.db_peak
          : typeof report.db_avg === "number"
            ? report.db_avg
            : null;
      if (value !== null && (peak === null || value > peak)) {
        peak = value;
      }
    }
    return peak;
  }, [reports]);

  const title = selection?.areaName ?? t("lookingUpArea");
  const subtitleParts = [
    category ? categoryLabel(tCategories, category) : null,
    newest
      ? formatRelativeTime(newest.created_at, timeMessages, now)
      : null,
  ].filter(Boolean);

  const statusValue = markedQuiet
    ? t("statusMarkedQuiet")
    : hot
      ? t("statusStillGoing")
      : t("statusSettled");

  const statusEmphasize = markedQuiet
    ? ("muted" as const)
    : hot
      ? ("accent" as const)
      : ("muted" as const);

  const distanceValue = !userLocation
    ? t("distanceUnknown")
    : inVicinity
      ? t("statusInVicinity")
      : distanceKm !== null
        ? t("away", { distance: formatDistanceKm(distanceKm) })
        : t("distanceUnknown");

  const communityValue = markedQuiet
    ? tIncident("markedQuiet", { count: quiets })
    : confirmed
      ? tIncident("confirmedBy", { count: hears })
      : hears > 0
        ? tIncident("heardBy", { count: hears })
        : tIncident("awaitingConfirm");

  const soundParts = [
    level ? intensityLabel(tIntensities, level) : null,
    peakDb !== null ? `${Math.round(peakDb)} dB` : null,
    isGroup ? t("reportsCount", { count: reports.length }) : null,
  ].filter(Boolean);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      shouldScaleBackground={false}
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay bruit-place-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content bruit-place-drawer bruit-activity-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

          <div className="flex items-start gap-3 px-4 pb-3 pt-2">
            <span
              className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={intensityIconStyle(level, { hot })}
            >
              <NoiseCategoryIcon
                category={category}
                size={20}
                strokeWidth={1.8}
              />
              {isGroup ? (
                <span className="bruit-cluster-badge" aria-hidden>
                  {reports.length}
                </span>
              ) : null}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.35rem] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--bruit-ink)]"
              >
                {title}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-1 text-[0.9rem] font-medium leading-snug text-[var(--bruit-muted)]"
              >
                {subtitleParts.join(" · ")}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bruit-icon-btn mt-0.5 cursor-pointer"
              aria-label={tCommon("close")}
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {cluster && newest ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-col gap-3">
                <div
                  className="bruit-place-actions flex overflow-hidden rounded-[1.05rem]"
                  role="group"
                  aria-label={tCommon("actions")}
                >
                  <ActionButton
                    label={t("showOnMapShort")}
                    tone="accent"
                    onClick={() => {
                      onShowOnMap(newest);
                      onClose();
                    }}
                  >
                    <MapIcon size={20} strokeWidth={2} />
                  </ActionButton>
                  {onReportAgain && inVicinity ? (
                    <ActionButton
                      label={t("reportAgain")}
                      tone="muted"
                      showDivider
                      onClick={() => {
                        onReportAgain(cluster);
                        onClose();
                      }}
                    >
                      <Ear size={20} strokeWidth={2} />
                    </ActionButton>
                  ) : null}
                </div>

                <div className="bruit-place-details overflow-hidden rounded-[1.05rem]">
                  <FactRow
                    label={t("detailStatus")}
                    value={statusValue}
                    emphasize={statusEmphasize}
                    leading={
                      markedQuiet ? (
                        <VolumeX size={15} strokeWidth={2} />
                      ) : hot ? (
                        <Radio size={15} strokeWidth={2} />
                      ) : (
                        <Check size={15} strokeWidth={2} />
                      )
                    }
                  />
                  <FactRow
                    label={t("detailDistance")}
                    value={distanceValue}
                    emphasize={inVicinity ? "accent" : "muted"}
                    showSeparator
                    leading={<MapPin size={15} strokeWidth={2} />}
                  />
                  <FactRow
                    label={t("detailCommunity")}
                    value={communityValue}
                    emphasize={
                      confirmed ? "success" : markedQuiet ? "muted" : undefined
                    }
                    showSeparator
                    leading={
                      markedQuiet ? (
                        <VolumeX size={15} strokeWidth={2} />
                      ) : (
                        <Ear size={15} strokeWidth={2} />
                      )
                    }
                  />
                  {soundParts.length > 0 ? (
                    <FactRow
                      label={t("detailSound")}
                      value={soundParts.join(" · ")}
                      showSeparator
                      leading={
                        <NoiseCategoryIcon
                          category={category}
                          size={15}
                          strokeWidth={2}
                        />
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
