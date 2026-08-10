import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";

export type NoiseReport = {
  id: string;
  lat: number;
  lng: number;
  category?: NoiseCategory | string | null;
  intensity?: NoiseIntensity | string | null;
  db_avg?: number | null;
  db_peak?: number | null;
  hear_count?: number | null;
  quiet_count?: number | null;
  created_at: string;
};

export type VerificationKind = "hear" | "quiet";

export type NoiseVerification = {
  report_id: string;
  kind: VerificationKind;
  created_at: string;
  updated_at?: string;
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

export type VerifyNoiseReportSuccess = {
  ok: true;
  action: "created" | "updated" | "cleared";
  my_kind: VerificationKind | null;
  report: NoiseReport;
};

export type VerifyNoiseReportFailure = {
  ok: false;
  error:
    | "invalid_device_id"
    | "invalid_report_id"
    | "invalid_kind"
    | "invalid_coordinates"
    | "not_found"
    | "own_report"
    | "report_too_old"
    | "too_far"
    | "rate_limited"
    | string;
  retry_after_seconds?: number;
  distance_m?: number;
};

export type VerifyNoiseReportResult =
  | VerifyNoiseReportSuccess
  | VerifyNoiseReportFailure;

export type ListMyNoiseVerificationsSuccess = {
  ok: true;
  verifications: NoiseVerification[];
};

export type ListMyNoiseVerificationsFailure = {
  ok: false;
  error: "invalid_device_id" | string;
};

export type ListMyNoiseVerificationsResult =
  | ListMyNoiseVerificationsSuccess
  | ListMyNoiseVerificationsFailure;

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
          db_avg: number | null;
          db_peak: number | null;
          hear_count: number;
          quiet_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          lat: number;
          lng: number;
          category?: string;
          intensity?: string;
          db_avg?: number | null;
          db_peak?: number | null;
          hear_count?: number;
          quiet_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          lat?: number;
          lng?: number;
          category?: string;
          intensity?: string;
          db_avg?: number | null;
          db_peak?: number | null;
          hear_count?: number;
          quiet_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      noise_verifications: {
        Row: {
          id: string;
          report_id: string;
          device_id: string;
          kind: VerificationKind;
          lat: number | null;
          lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          device_id: string;
          kind: VerificationKind;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          device_id?: string;
          kind?: VerificationKind;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
          updated_at?: string;
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
          p_db_avg?: number | null;
          p_db_peak?: number | null;
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
      verify_noise_report: {
        Args: {
          p_device_id: string;
          p_report_id: string;
          p_kind: VerificationKind;
          p_lat?: number | null;
          p_lng?: number | null;
        };
        Returns: VerifyNoiseReportResult;
      };
      list_my_noise_verifications: {
        Args: {
          p_device_id: string;
        };
        Returns: ListMyNoiseVerificationsResult;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
