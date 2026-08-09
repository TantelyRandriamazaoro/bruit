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

export type ListMyNoiseReportsSuccess = {
  ok: true;
  reports: NoiseReport[];
};

export type ListMyNoiseReportsFailure = {
  ok: false;
  error: "invalid_device_id" | string;
};

export type ListMyNoiseReportsResult =
  | ListMyNoiseReportsSuccess
  | ListMyNoiseReportsFailure;

export type DeleteNoiseReportSuccess = {
  ok: true;
  id: string;
};

export type DeleteNoiseReportFailure = {
  ok: false;
  error:
    | "invalid_device_id"
    | "invalid_report_id"
    | "not_found"
    | string;
};

export type DeleteNoiseReportResult =
  | DeleteNoiseReportSuccess
  | DeleteNoiseReportFailure;

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
      list_my_noise_reports: {
        Args: {
          p_device_id: string;
        };
        Returns: ListMyNoiseReportsResult;
      };
      delete_noise_report: {
        Args: {
          p_device_id: string;
          p_report_id: string;
        };
        Returns: DeleteNoiseReportResult;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
