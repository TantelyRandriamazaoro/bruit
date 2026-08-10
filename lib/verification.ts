import { distanceMeters } from "@/lib/cluster-reports";
import { VERIFY_RADIUS_M } from "@/lib/constants";
import type { NoiseReport } from "@/lib/supabase/types";

export type VerificationKind = "hear" | "quiet";

export function hearCount(report: Pick<NoiseReport, "hear_count">): number {
  return Math.max(0, report.hear_count ?? 0);
}

export function quietCount(report: Pick<NoiseReport, "quiet_count">): number {
  return Math.max(0, report.quiet_count ?? 0);
}

/** Positive net confirms make an incident feel community-backed. */
export function isCommunityConfirmed(
  report: Pick<NoiseReport, "hear_count" | "quiet_count">,
): boolean {
  return hearCount(report) > quietCount(report) && hearCount(report) >= 1;
}

export function canVerifyNearby(
  userLocation: { lat: number; lng: number } | null | undefined,
  report: Pick<NoiseReport, "lat" | "lng">,
  radiusM = VERIFY_RADIUS_M,
): boolean {
  if (!userLocation) {
    return false;
  }
  return distanceMeters(userLocation, report) <= radiusM;
}
