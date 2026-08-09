import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";

export type NoiseReport = {
  id: string;
  lat: number;
  lng: number;
  category?: NoiseCategory | string | null;
  intensity?: NoiseIntensity | string | null;
  created_at: string;
};

export type AreaLabel = {
  cell_key: string;
  lat: number;
  lng: number;
  name: string;
  source: string;
  created_at: string;
};

export type CreateNoiseReportSuccess = {
  ok: true;
  report: NoiseReport;
};

export type CreateNoiseReportFailure = {
  ok: false;
  error:
    | "rate_limited"
    | "invalid_device_id"
    | "invalid_coordinates"
    | "invalid_category"
    | "invalid_intensity"
    | string;
  retry_after_seconds?: number;
};

export type CreateNoiseReportResult =
  | CreateNoiseReportSuccess
  | CreateNoiseReportFailure;

export type Database = {
  public: {
    Tables: {
      noise_reports: {
        Row: {
          id: string;
          device_id: string;
          lat: number;
          lng: number;
          category: string;
          intensity: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          lat: number;
          lng: number;
          category?: string;
          intensity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          lat?: number;
          lng?: number;
          category?: string;
          intensity?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      area_labels: {
        Row: AreaLabel;
        Insert: {
          cell_key: string;
          lat: number;
          lng: number;
          name: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          cell_key?: string;
          lat?: number;
          lng?: number;
          name?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_noise_report: {
        Args: {
          p_device_id: string;
          p_lat: number;
          p_lng: number;
          p_category?: string;
          p_intensity?: string;
        };
        Returns: CreateNoiseReportResult;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
