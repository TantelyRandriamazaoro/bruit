import { areaCellKey, LIVE_AREA_CELL_DEG } from "@/lib/area-cell";
import { LIVE_MAP_MAX_AGE_MS, LIVE_MAP_TTL_MS } from "@/lib/constants";
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
 * - Individual report timestamps stay unchanged; weight decays with age.
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

/** Decay so recent reports dominate; lingering ones stay faint. */
export function liveAgeDecay(ageMs: number): number {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 1;
  }

  const hours = ageMs / (60 * 60 * 1000);
  if (hours <= 1) {
    return 1;
  }
  if (hours <= 3) {
    return 1 - ((hours - 1) / 2) * 0.5;
  }
  if (hours <= 6) {
    return 0.5 - ((hours - 3) / 3) * 0.25;
  }
  if (hours <= 24) {
    return Math.max(0.1, 0.25 - ((hours - 6) / 18) * 0.15);
  }
  return 0;
}

export function liveMapWeight(
  report: Pick<NoiseReport, "intensity" | "created_at">,
  now = Date.now(),
): number {
  const created = new Date(report.created_at).getTime();
  const ageMs = Number.isFinite(created) ? now - created : 0;
  return intensityWeight(report.intensity) * liveAgeDecay(ageMs);
}
