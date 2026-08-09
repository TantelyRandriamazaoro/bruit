import { areaCellKey } from "@/lib/area-cell";
import type { NoiseReport } from "@/lib/supabase/types";

/** Reports within this radius are treated as the same place. */
export const CLUSTER_RADIUS_M = 120;

export type ReportCluster = {
  id: string;
  reports: NoiseReport[];
  lat: number;
  lng: number;
  cellKey: string;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadius = 6_371_000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function centroid(reports: NoiseReport[]): { lat: number; lng: number } {
  const n = reports.length;
  if (n === 0) {
    return { lat: 0, lng: 0 };
  }
  let lat = 0;
  let lng = 0;
  for (const report of reports) {
    lat += report.lat;
    lng += report.lng;
  }
  return { lat: lat / n, lng: lng / n };
}

/**
 * Greedy clustering: walk newest→oldest and attach each report to the nearest
 * existing cluster within CLUSTER_RADIUS_M, else start a new cluster.
 * Clusters stay ordered by most recent report.
 */
export function clusterNearbyReports(
  reports: NoiseReport[],
  radiusM = CLUSTER_RADIUS_M,
): ReportCluster[] {
  const clusters: ReportCluster[] = [];

  for (const report of reports) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < clusters.length; i += 1) {
      const cluster = clusters[i];
      const d = distanceMeters(report, cluster);
      if (d <= radiusM && d < bestDistance) {
        bestDistance = d;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0) {
      const cluster = clusters[bestIndex];
      cluster.reports.push(report);
      const center = centroid(cluster.reports);
      cluster.lat = center.lat;
      cluster.lng = center.lng;
      cluster.cellKey = areaCellKey(center.lat, center.lng);
    } else {
      clusters.push({
        id: `cluster-${report.id}`,
        reports: [report],
        lat: report.lat,
        lng: report.lng,
        cellKey: areaCellKey(report.lat, report.lng),
      });
    }
  }

  return clusters;
}
