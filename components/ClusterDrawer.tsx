"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Drawer } from "vaul";
import type { ReportCluster } from "@/lib/cluster-reports";
import { formatRelativeTime } from "@/lib/format";
import {
  categoryLabel,
  intensityLabel,
  relativeTimeMessages,
} from "@/lib/i18n-helpers";
import { isHotReportGroupFromReports } from "@/lib/live-map";
import { intensityIconStyle } from "@/lib/noise-meta";
import { NoiseCategoryIcon } from "@/lib/noise-icons";
import type { NoiseReport } from "@/lib/supabase/types";
import { hearCount, isCommunityConfirmed } from "@/lib/verification";

export type ClusterDrawerSelection = {
  cluster: ReportCluster;
  areaName: string | null;
  distanceLabel?: string | null;
  /** Nearby clusters open the confirmation drawer; others go to the map. */
  nearby: boolean;
};

type ClusterDrawerProps = {
  selection: ClusterDrawerSelection | null;
  container?: HTMLElement | null;
  onClose: () => void;
  onSelectReport: (report: NoiseReport) => void;
};

export function ClusterDrawer({
  selection,
  container = null,
  onClose,
  onSelectReport,
}: ClusterDrawerProps) {
  const t = useTranslations("Feed");
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
  const title = selection?.areaName ?? t("lookingUpArea");
  const hot = isHotReportGroupFromReports(reports, now);

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
          className="bruit-sheet bruit-drawer-content bruit-place-drawer bruit-cluster-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

          <div className="flex items-start gap-3 px-4 pb-3 pt-2">
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
                {t("reportsCount", { count: reports.length })}
                {selection?.distanceLabel ? (
                  <>
                    {" · "}
                    {selection.distanceLabel}
                  </>
                ) : null}
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

          {cluster ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
              <div className="bruit-place-details overflow-hidden rounded-[1.05rem]">
                <ul>
                  {reports.map((report, index) => {
                    const confirmed = isCommunityConfirmed(report);
                    const hears = hearCount(report);
                    return (
                      <li key={report.id}>
                        {index > 0 ? (
                          <div className="ml-[3.55rem] h-px bg-[var(--bruit-hairline)]" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSelectReport(report)}
                          className="flex min-h-[3.4rem] w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--bruit-row-hover)] active:bg-[var(--bruit-row-active)] focus-visible:bg-[var(--bruit-row-hover)] focus-visible:outline-none"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={intensityIconStyle(report.intensity, {
                              hot,
                            })}
                          >
                            <NoiseCategoryIcon
                              category={report.category}
                              size={16}
                              strokeWidth={1.7}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[var(--bruit-ink)]">
                                {categoryLabel(tCategories, report.category)}
                                {confirmed ? (
                                  <span className="bruit-verified-inline ml-1.5">
                                    <Check
                                      size={11}
                                      strokeWidth={2.6}
                                      aria-hidden
                                    />
                                    <span>
                                      {t("confirmedShort", { count: hears })}
                                    </span>
                                  </span>
                                ) : null}
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
                              {typeof report.db_peak === "number" ? (
                                <> · {Math.round(report.db_peak)} dB</>
                              ) : null}
                            </span>
                          </span>
                          <span
                            className="shrink-0 text-[var(--bruit-hairline-strong)]"
                            aria-hidden
                          >
                            <ChevronRight size={16} strokeWidth={2} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
