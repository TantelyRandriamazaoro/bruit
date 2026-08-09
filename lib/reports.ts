import { HEATMAP_DAYS } from "@/lib/constants";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import { getSupabase } from "@/lib/supabase/client";
import type {
  CreateNoiseReportResult,
  NoiseReport,
} from "@/lib/supabase/types";

export async function fetchRecentReports(): Promise<NoiseReport[]> {
  const since = new Date();
  since.setDate(since.getDate() - HEATMAP_DAYS);

  const { data, error } = await getSupabase()
    .from("noise_reports")
    .select("id, lat, lng, category, intensity, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback if migration 0002 is not applied yet
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

export async function createNoiseReport(params: {
  deviceId: string;
  lat: number;
  lng: number;
  category: NoiseCategory;
  intensity: NoiseIntensity;
}): Promise<CreateNoiseReportResult> {
  const { data, error } = await getSupabase().rpc("create_noise_report", {
    p_device_id: params.deviceId,
    p_lat: params.lat,
    p_lng: params.lng,
    p_category: params.category,
    p_intensity: params.intensity,
  });

  if (error) {
    throw error;
  }

  return data as CreateNoiseReportResult;
}
