"use client";

import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";
import { RegionMapDrawer } from "@/components/RegionMapDrawer";
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

type RegionMapCardProps = {
  region: string;
  regionLabel: string;
  reports: NoiseReport[];
  container?: HTMLElement | null;
};

export function RegionMapCard({
  region,
  regionLabel,
  reports,
  container = null,
}: RegionMapCardProps) {
  const t = useTranslations("Insights");
  const titleId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDrawerOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [region]);

  const regionReports = useMemo(
    () => filterReportsByRegion(reports, region),
    [reports, region],
  );

  const bounds = useMemo(
    () => boundsForRegion(region, regionReports),
    [region, regionReports],
  );

  const periodLabel = t("allTime");
  const mapLabel = t("regionMapAria", {
    region: regionLabel,
    period: periodLabel,
  });

  return (
    <section
      className="bruit-region-map-card animate-[bruit-rise_280ms_ease-out]"
      aria-labelledby={titleId}
    >
      <div className="flex items-end justify-between gap-3 px-1 pb-2">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]"
          >
            {t("regionMapSection")}
          </h2>
          <p className="mt-0.5 truncate text-[1.05rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
            {regionLabel}
          </p>
        </div>
        <p className="shrink-0 text-[0.78rem] font-semibold tabular-nums text-[var(--bruit-muted)]">
          {t("reportsCount", { count: regionReports.length })}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="bruit-region-map-card-body bruit-region-map-card-hit cursor-pointer text-left transition-transform duration-200"
        aria-label={t("openRegionMapAria", { region: regionLabel })}
      >
        <div className="bruit-region-map-card-frame">
          <RegionMap
            reports={regionReports}
            bounds={bounds}
            label={mapLabel}
            fitKey={`${region}:preview`}
            interactive={false}
          />
          <div className="bruit-region-map-card-scrim" aria-hidden />
          <div className="bruit-region-map-card-caption">
            <div className="min-w-0">
              <p className="truncate text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                {periodLabel}
              </p>
              <p className="truncate text-[0.8rem] font-medium text-[var(--bruit-muted)]">
                {t("openRegionMapHint")}
              </p>
            </div>
            <span className="bruit-region-map-card-chevron" aria-hidden>
              <ChevronRight size={16} strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </button>

      <RegionMapDrawer
        open={drawerOpen}
        region={region}
        regionLabel={regionLabel}
        reports={reports}
        container={container}
        onClose={() => setDrawerOpen(false)}
      />
    </section>
  );
}
