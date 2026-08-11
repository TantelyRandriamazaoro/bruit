import { REGION_ANCHORS, UNKNOWN_REGION } from "@/lib/madagascar-regions";
import type { NoiseReport } from "@/lib/supabase/types";

export type RegionBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

function emptyBounds(): RegionBounds {
  return {
    west: Infinity,
    south: Infinity,
    east: -Infinity,
    north: -Infinity,
  };
}

function expand(
  bounds: RegionBounds,
  point: { lat: number; lng: number },
): void {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return;
  }
  bounds.west = Math.min(bounds.west, point.lng);
  bounds.east = Math.max(bounds.east, point.lng);
  bounds.south = Math.min(bounds.south, point.lat);
  bounds.north = Math.max(bounds.north, point.lat);
}

function isValid(bounds: RegionBounds): boolean {
  return (
    Number.isFinite(bounds.west) &&
    Number.isFinite(bounds.east) &&
    Number.isFinite(bounds.south) &&
    Number.isFinite(bounds.north) &&
    bounds.west <= bounds.east &&
    bounds.south <= bounds.north
  );
}

/** Pad degenerate / tiny bounds so fitBounds still reads clearly. */
export function padRegionBounds(
  bounds: RegionBounds,
  padDeg = 0.04,
): RegionBounds {
  const lngSpan = Math.max(padDeg * 2, bounds.east - bounds.west);
  const latSpan = Math.max(padDeg * 2, bounds.north - bounds.south);
  // Keep a little margin around clustered points.
  const paddedLng = lngSpan * 1.18;
  const paddedLat = latSpan * 1.18;
  const lngMid = (bounds.west + bounds.east) / 2;
  const latMid = (bounds.south + bounds.north) / 2;
  return {
    west: lngMid - paddedLng / 2,
    east: lngMid + paddedLng / 2,
    south: latMid - paddedLat / 2,
    north: latMid + paddedLat / 2,
  };
}

function boundsFromPoints(
  points: Array<{ lat: number; lng: number }>,
): RegionBounds | null {
  const bounds = emptyBounds();
  for (const point of points) {
    expand(bounds, point);
  }
  return isValid(bounds) ? padRegionBounds(bounds) : null;
}

/**
 * Prefer fitting the map to report points in the region.
 * Falls back to district anchors when there are no reports yet.
 */
export function boundsForRegion(
  region: string,
  reports: Array<Pick<NoiseReport, "lat" | "lng">> = [],
): RegionBounds | null {
  const reportBounds = boundsFromPoints(reports);
  if (reportBounds) {
    return reportBounds;
  }

  if (region === UNKNOWN_REGION) {
    return null;
  }

  const anchors = REGION_ANCHORS.filter((anchor) => anchor.region === region);
  return boundsFromPoints(anchors);
}
