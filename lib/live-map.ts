import { areaCellKey, LIVE_AREA_CELL_DEG } from "@/lib/area-cell";
import {
  HOT_REPORT_WINDOW_MS,
  LIVE_MAP_MAX_AGE_MS,
  LIVE_MAP_TTL_MS,
} from "@/lib/constants";
import { intensityWeight } from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

function liveAreaCellKey(lat: number, lng: number): string {
  return areaCellKey(lat, lng, LIVE_AREA_CELL_DEG);
}

/**
 * Live map visibility:
 * - A ~250m cell is active while its newest report is within LIVE_MAP_TTL_MS.
 * - A newer report in the same cell resets that cell clock.
 * - While active, older reports in the cell linger (up to LIVE_MAP_MAX_AGE_MS).
 * - Group weight decays with a ~24h half-life from the cell’s newest report.
 * - Cells within HOT_REPORT_WINDOW_MS paint warm; older active cells paint cool.
 */
export function filterLiveMapReports(
  reports: NoiseReport[],
  now = Date.now(),
): NoiseReport[] {
  const maxAgeCutoff = now - LIVE_MAP_MAX_AGE_MS;
  const candidates: NoiseReport[] = [];
  const newestByCell = new Map<string, number>();

  for (const report of reports) {
    const created = new Date(report.created_at).getTime();
    if (!Number.isFinite(created) || created < maxAgeCutoff) {
      continue;
    }

    candidates.push(report);
    const cell = liveAreaCellKey(report.lat, report.lng);
    const previous = newestByCell.get(cell) ?? 0;
    if (created > previous) {
      newestByCell.set(cell, created);
    }
  }

  const activeCells = new Set<string>();
  for (const [cell, newest] of newestByCell) {
    if (now - newest <= LIVE_MAP_TTL_MS) {
      activeCells.add(cell);
    }
  }

  if (activeCells.size === 0) {
    return [];
  }

  return candidates.filter((report) =>
    activeCells.has(liveAreaCellKey(report.lat, report.lng)),
  );
}

/** Newest `created_at` among reports, or 0 if none/invalid. */
export function newestReportTimeMs(
  reports: Array<{ created_at: string }>,
): number {
  let best = 0;
  for (const report of reports) {
    const created = new Date(report.created_at).getTime();
    if (Number.isFinite(created) && created > best) {
      best = created;
    }
  }
  return best;
}

/** True while a group’s last report is still inside the hot window. */
export function isHotReportGroup(
  newestMs: number,
  now = Date.now(),
): boolean {
  return Number.isFinite(newestMs) && newestMs > 0
    ? now - newestMs <= HOT_REPORT_WINDOW_MS
    : false;
}

export function isHotReportGroupFromReports(
  reports: Array<{ created_at: string }>,
  now = Date.now(),
): boolean {
  return isHotReportGroup(newestReportTimeMs(reports), now);
}

/**
 * Exponential decay across the live-map window (~24h half-life) from the
 * group’s last report. Hot vs cool color still flips at HOT_REPORT_WINDOW_MS.
 * Floored so older areas stay readable.
 */
export function liveAgeDecay(ageMs: number): number {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 1;
  }

  return Math.max(0.1, Math.pow(0.5, ageMs / LIVE_MAP_MAX_AGE_MS));
}

/** Weight for a point inside a report group aged from `groupNewestMs`. */
export function liveMapWeight(
  report: Pick<NoiseReport, "intensity">,
  groupNewestMs: number,
  now = Date.now(),
): number {
  const ageMs = Number.isFinite(groupNewestMs) ? now - groupNewestMs : 0;
  return intensityWeight(report.intensity) * liveAgeDecay(ageMs);
}

/** Newest report time per live-map cell for the given reports. */
export function newestByLiveCell(
  reports: Array<Pick<NoiseReport, "lat" | "lng" | "created_at">>,
): Map<string, number> {
  const newestByCell = new Map<string, number>();
  for (const report of reports) {
    const created = new Date(report.created_at).getTime();
    if (!Number.isFinite(created)) {
      continue;
    }
    const cell = liveAreaCellKey(report.lat, report.lng);
    const previous = newestByCell.get(cell) ?? 0;
    if (created > previous) {
      newestByCell.set(cell, created);
    }
  }
  return newestByCell;
}

export function liveCellKeyForReport(report: Pick<NoiseReport, "lat" | "lng">) {
  return liveAreaCellKey(report.lat, report.lng);
}
