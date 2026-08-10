"use client";

import {
  Check,
  Ear,
  Map as MapIcon,
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
import { areaCellKey } from "@/lib/area-cell";
import { loadAreaLabelsForPoints } from "@/lib/area-labels";
import { distanceMeters } from "@/lib/cluster-reports";
import { VICINITY_RADIUS_M } from "@/lib/constants";
import { formatDistanceKm, formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { intensityIconStyle } from "@/lib/noise-meta";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport, VerificationKind } from "@/lib/supabase/types";
import {
  canVerifyNearby,
  hearCount,
  isCommunityConfirmed,
  quietCount,
} from "@/lib/verification";

type IncidentDrawerProps = {
  report: NoiseReport | null;
  /** Auto-prompt when the user walks into a noisy area. */
  vicinity?: boolean;
  reportCount?: number;
  myKind?: VerificationKind | null;
  isOwnReport?: boolean;
  canReport?: boolean;
  userLocation: { lat: number; lng: number } | null;
  busy?: boolean;
  container?: HTMLElement | null;
  onClose: () => void;
  /** Create a new report for “I hear this too”. */
  onHearThis: () => void;
  /** Mark quiet (verification only). */
  onQuiet: () => void;
  onShowMap?: (report: NoiseReport) => void;
};

function ActionButton({
  label,
  selected,
  disabled,
  tone,
  showDivider,
  onClick,
  children,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  tone: "hear" | "quiet";
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
      } ${selected ? "bruit-verify-action-selected" : ""}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
          selected
            ? tone === "hear"
              ? "bg-[var(--bruit-accent)] text-[var(--bruit-on-accent)]"
              : "bg-[var(--bruit-muted)] text-[var(--bruit-surface)]"
            : tone === "hear"
              ? "bg-[color-mix(in_srgb,var(--bruit-accent)_14%,transparent)] text-[var(--bruit-accent)]"
              : "bg-[var(--bruit-fill)] text-[var(--bruit-ink)]"
        }`}
        aria-hidden
      >
        {selected ? <Check size={20} strokeWidth={2.2} /> : children}
      </span>
      <span
        className={`text-[0.8rem] font-semibold tracking-[-0.01em] ${
          selected
            ? "text-[var(--bruit-ink)]"
            : tone === "hear"
              ? "text-[var(--bruit-accent)]"
              : "text-[var(--bruit-muted)]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export function IncidentDrawer({
  report,
  vicinity = false,
  reportCount = 1,
  myKind = null,
  isOwnReport = false,
  canReport = true,
  userLocation,
  busy = false,
  container = null,
  onClose,
  onHearThis,
  onQuiet,
  onShowMap,
}: IncidentDrawerProps) {
  const t = useTranslations("Incident");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tIntensities = useTranslations("Intensities");
  const tTime = useTranslations("Time");
  const titleId = useId();
  const descriptionId = useId();
  const open = report !== null;
  const timeMessages = relativeTimeMessages(tTime);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!report) {
      const frame = window.requestAnimationFrame(() => setAreaName(null));
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const cell = areaCellKey(report.lat, report.lng);
    void loadAreaLabelsForPoints([{ lat: report.lat, lng: report.lng }]).then(
      (labels) => {
        if (!cancelled) {
          setAreaName(labels[cell] ?? null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [report]);

  const distanceLabel = useMemo(() => {
    if (!report || !userLocation) {
      return null;
    }
    const km = distanceMeters(userLocation, report) / 1000;
    return formatDistanceKm(km);
  }, [report, userLocation]);

  const nearby = report
    ? canVerifyNearby(userLocation, report, VICINITY_RADIUS_M)
    : false;
  const hears = report ? hearCount(report) : 0;
  const quiets = report ? quietCount(report) : 0;
  const confirmed = report ? isCommunityConfirmed(report) : false;

  const trustLine = (() => {
    if (!report) {
      return "";
    }
    if (vicinity) {
      return reportCount > 1
        ? t("vicinityGroup", { count: reportCount })
        : t("vicinitySingle");
    }
    if (confirmed) {
      return t("confirmedBy", { count: hears });
    }
    if (quiets > hears && quiets > 0) {
      return t("markedQuiet", { count: quiets });
    }
    if (hears > 0) {
      return t("heardBy", { count: hears });
    }
    return t("awaitingConfirm");
  })();

  const verifyHint = (() => {
    if (isOwnReport && !vicinity) {
      return t("ownReportHint");
    }
    if (!userLocation) {
      return t("needLocation");
    }
    if (!nearby) {
      return t("tooFar");
    }
    if (!canReport) {
      return t("cooldownHint");
    }
    if (myKind === "quiet") {
      return t("youQuietHint");
    }
    return vicinity ? t("vicinityHint") : t("verifyHint");
  })();

  const canHear = Boolean(report && nearby && canReport && !busy);
  const canQuiet = Boolean(
    report && nearby && !isOwnReport && !busy,
  );

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          onClose();
        }
      }}
      dismissible={!busy}
      shouldScaleBackground={false}
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay bruit-place-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content bruit-place-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

          <div className="flex items-start gap-3 px-4 pb-3 pt-2">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={intensityIconStyle(report?.intensity)}
            >
              <NoiseCategoryIcon
                category={report?.category}
                size={20}
                strokeWidth={1.8}
              />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.35rem] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--bruit-ink)]"
              >
                {vicinity
                  ? t("vicinityTitle")
                  : report
                    ? categoryLabel(tCategories, report.category)
                    : t("title")}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-1 text-[0.9rem] font-medium leading-snug text-[var(--bruit-muted)]"
              >
                {vicinity && report
                  ? categoryLabel(tCategories, report.category)
                  : (areaName ?? t("lookingUpArea"))}
                {report ? (
                  <>
                    {" · "}
                    {formatRelativeTime(report.created_at, timeMessages, now)}
                  </>
                ) : null}
              </Drawer.Description>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="bruit-icon-btn mt-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={tCommon("close")}
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {report ? (
            <div className="flex flex-col gap-3 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
              <div
                className={`bruit-verify-trust ${
                  confirmed || vicinity ? "bruit-verify-trust--confirmed" : ""
                }`}
                role="status"
              >
                <span className="bruit-verify-trust-icon" aria-hidden>
                  {confirmed || vicinity ? (
                    <Check size={15} strokeWidth={2.4} />
                  ) : (
                    <Ear size={15} strokeWidth={2.1} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.95rem] font-semibold tracking-[-0.02em] text-[var(--bruit-ink)]">
                    {trustLine}
                  </span>
                  <span className="mt-0.5 block text-[0.78rem] font-medium text-[var(--bruit-muted)]">
                    {areaName ? <>{areaName} · </> : null}
                    {intensityLabel(tIntensities, report.intensity)}
                    {typeof report.db_peak === "number" ? (
                      <> · {Math.round(report.db_peak)} dB</>
                    ) : null}
                    {distanceLabel ? (
                      <> · {t("away", { distance: distanceLabel })}</>
                    ) : null}
                  </span>
                </span>
              </div>

              <div
                className="bruit-place-actions flex overflow-hidden rounded-[1.05rem]"
                role="group"
                aria-label={t("verifyActions")}
              >
                <ActionButton
                  label={t("hearThis")}
                  tone="hear"
                  disabled={!canHear}
                  onClick={onHearThis}
                >
                  <Ear size={20} strokeWidth={2} />
                </ActionButton>
                <ActionButton
                  label={myKind === "quiet" ? t("markedQuietShort") : t("quietNow")}
                  tone="quiet"
                  selected={myKind === "quiet"}
                  disabled={busy || (!canQuiet && myKind !== "quiet")}
                  showDivider
                  onClick={onQuiet}
                >
                  <VolumeX size={20} strokeWidth={2} />
                </ActionButton>
                {onShowMap ? (
                  <ActionButton
                    label={tCommon("map")}
                    tone="quiet"
                    disabled={busy}
                    showDivider
                    onClick={() => onShowMap(report)}
                  >
                    <MapIcon size={20} strokeWidth={2} />
                  </ActionButton>
                ) : null}
              </div>

              <p className="px-1 text-[0.78rem] font-medium leading-relaxed text-[var(--bruit-muted)]">
                {verifyHint}
              </p>
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
