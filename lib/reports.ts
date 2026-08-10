import { HEATMAP_DAYS, INSIGHTS_DAYS } from "@/lib/constants";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import { getSupabase } from "@/lib/supabase/client";
import type {
  CreateNoiseReportResult,
  DeleteNoiseReportResult,
  ListMyNoiseReportsResult,
  ListMyNoiseVerificationsResult,
  NoiseReport,
  NoiseVerification,
  VerificationKind,
  VerifyNoiseReportResult,
} from "@/lib/supabase/types";

export async function fetchRecentReports(
  days: number = INSIGHTS_DAYS,
): Promise<NoiseReport[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await getSupabase()
    .from("noise_reports")
    .select(
      "id, lat, lng, category, intensity, db_avg, db_peak, hear_count, quiet_count, created_at",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback if migration 0006 is not applied yet
    const withDb = await getSupabase()
      .from("noise_reports")
      .select("id, lat, lng, category, intensity, db_avg, db_peak, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!withDb.error) {
      return withDb.data ?? [];
    }

    // Fallback if migration 0005 (or 0002) is not applied yet
    const withDetails = await getSupabase()
      .from("noise_reports")
      .select("id, lat, lng, category, intensity, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!withDetails.error) {
      return withDetails.data ?? [];
    }

    const legacy = await getSupabase()
      .from("noise_reports")
      .select("id, lat, lng, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (legacy.error) {
      throw error;
    }

    return legacy.data ?? [];
  }

  return data ?? [];
}

export function filterReportsSince(
  reports: NoiseReport[],
  days: number = HEATMAP_DAYS,
  now = Date.now(),
): NoiseReport[] {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return reports.filter((report) => {
    const created = new Date(report.created_at).getTime();
    return Number.isFinite(created) && created >= cutoff;
  });
}

export async function createNoiseReport(params: {
  deviceId: string;
  lat: number;
  lng: number;
  category: NoiseCategory;
  intensity: NoiseIntensity;
  dbAvg?: number | null;
  dbPeak?: number | null;
}): Promise<CreateNoiseReportResult> {
  const withDb = await getSupabase().rpc("create_noise_report", {
    p_device_id: params.deviceId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_category: params.category,
    p_intensity: params.intensity,
    p_db_avg: params.dbAvg ?? null,
    p_db_peak: params.dbPeak ?? null,
  });

  if (!withDb.error) {
    return withDb.data as CreateNoiseReportResult;
  }

  // Fallback if migration 0005 is not applied yet
  const legacy = await getSupabase().rpc("create_noise_report", {
    p_device_id: params.deviceId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_category: params.category,
    p_intensity: params.intensity,
  });

  if (legacy.error) {
    throw withDb.error;
  }

  return legacy.data as CreateNoiseReportResult;
}

export async function fetchMyReports(
  deviceId: string,
): Promise<NoiseReport[]> {
  const { data, error } = await getSupabase().rpc("list_my_noise_reports", {
    p_device_id: deviceId,
  });

  if (error) {
    throw error;
  }

  const result = data as ListMyNoiseReportsResult;
  if (!result?.ok) {
    throw new Error(result?.error ?? "list_my_noise_reports_failed");
  }

  return result.reports ?? [];
}

export async function deleteNoiseReport(params: {
  deviceId: string;
  reportId: string;
}): Promise<DeleteNoiseReportResult> {
  const { data, error } = await getSupabase().rpc("delete_noise_report", {
    p_device_id: params.deviceId,
    p_report_id: params.reportId,
  });

  if (error) {
    throw error;
  }

  return data as DeleteNoiseReportResult;
}

export async function fetchMyVerifications(
  deviceId: string,
): Promise<NoiseVerification[]> {
  const { data, error } = await getSupabase().rpc(
    "list_my_noise_verifications",
    { p_device_id: deviceId },
  );

  if (error) {
    // Migration 0006 may not be applied yet
    return [];
  }

  const result = data as ListMyNoiseVerificationsResult;
  if (!result?.ok) {
    return [];
  }

  return result.verifications ?? [];
}

export async function verifyNoiseReport(params: {
  deviceId: string;
  reportId: string;
  kind: VerificationKind;
  lat: number;
  lng: number;
}): Promise<VerifyNoiseReportResult> {
  const { data, error } = await getSupabase().rpc("verify_noise_report", {
    p_device_id: params.deviceId,
    p_report_id: params.reportId,
    p_kind: params.kind,
    p_lat: params.lat,
    p_lng: params.lng,
  });

  if (error) {
    throw error;
  }

  return data as VerifyNoiseReportResult;
}
