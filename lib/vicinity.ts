import {
  CLUSTER_RADIUS_M,
  clusterNearbyReports,
  distanceMeters,
  type ReportCluster,
} from "@/lib/cluster-reports";
import { VICINITY_RADIUS_M } from "@/lib/constants";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import type { NoiseReport } from "@/lib/supabase/types";

export type VicinityIncident = {
  clusterId: string;
  report: NoiseReport;
  cluster: ReportCluster;
  distanceM: number;
  reportCount: number;
  category: NoiseCategory | string;
  intensity: NoiseIntensity | string;
};

const DISMISSED_KEY = "bruit_vicinity_dismissed";

function dominantField(
  reports: NoiseReport[],
  field: "category" | "intensity",
): string {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = String(report[field] ?? (field === "category" ? "other" : "loud"));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = field === "category" ? "other" : "loud";
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isVicinityDismissed(clusterId: string): boolean {
  return Boolean(readDismissed()[clusterId]);
}

export function dismissVicinityCluster(clusterId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = { ...readDismissed(), [clusterId]: Date.now() };
  window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
}

/** Build a vicinity card context from an activity cluster (e.g. Report Again). */
export function vicinityFromCluster(
  cluster: ReportCluster,
  userLocation: { lat: number; lng: number } | null,
): VicinityIncident | null {
  const report = cluster.reports[0];
  if (!report) {
    return null;
  }

  return {
    clusterId: cluster.id,
    report,
    cluster,
    distanceM: userLocation
      ? distanceMeters(userLocation, cluster)
      : Number.POSITIVE_INFINITY,
    reportCount: cluster.reports.length,
    category: dominantField(cluster.reports, "category"),
    intensity: dominantField(cluster.reports, "intensity"),
  };
}

/**
 * Nearest live report cluster within VICINITY_RADIUS_M that still has
 * at least one report from someone else.
 */
export function findVicinityIncident(params: {
  reports: NoiseReport[];
  userLocation: { lat: number; lng: number } | null;
  myReportIds: Set<string>;
  radiusM?: number;
}): VicinityIncident | null {
  const { reports, userLocation, myReportIds } = params;
  const radiusM = params.radiusM ?? VICINITY_RADIUS_M;

  if (!userLocation || reports.length === 0) {
    return null;
  }

  const clusters = clusterNearbyReports(reports, CLUSTER_RADIUS_M);
  let best: VicinityIncident | null = null;

  for (const cluster of clusters) {
    const foreign = cluster.reports.filter(
      (report) => !myReportIds.has(report.id),
    );
    if (foreign.length === 0) {
      continue;
    }

    const distanceM = distanceMeters(userLocation, cluster);
    if (distanceM > radiusM) {
      continue;
    }

    if (best && distanceM >= best.distanceM) {
      continue;
    }

    const newest = foreign[0] ?? cluster.reports[0];
    best = {
      clusterId: cluster.id,
      report: newest,
      cluster,
      distanceM,
      reportCount: cluster.reports.length,
      category: dominantField(cluster.reports, "category"),
      intensity: dominantField(cluster.reports, "intensity"),
    };
  }

  return best;
}
