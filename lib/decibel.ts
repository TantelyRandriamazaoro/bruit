import type { NoiseIntensity } from "@/lib/noise-meta";

/** Approximate phone-mic → dB mapping (not a calibrated SPL meter). */
const DBFS_OFFSET = 100;
export const DB_MIN = 20;
export const DB_MAX = 120;
export const MEASURE_SECONDS = 8;
export const WAVEFORM_BARS = 28;

export type DecibelBand = "quiet" | "moderate" | "loud" | "very_loud" | "hazardous";

export type DecibelReading = {
  avgDb: number;
  peakDb: number;
  samples: number;
};

export function rmsToDb(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) {
    return DB_MIN;
  }
  const db = 20 * Math.log10(rms) + DBFS_OFFSET;
  return clampDb(db);
}

export function clampDb(value: number): number {
  if (!Number.isFinite(value)) {
    return DB_MIN;
  }
  return Math.min(DB_MAX, Math.max(DB_MIN, value));
}

export function roundDb(value: number): number {
  return Math.round(clampDb(value));
}

export function decibelBand(db: number): DecibelBand {
  const value = clampDb(db);
  if (value < 50) return "quiet";
  if (value < 65) return "moderate";
  if (value < 75) return "loud";
  if (value < 85) return "very_loud";
  return "hazardous";
}

export function intensityFromDb(db: number): NoiseIntensity {
  const band = decibelBand(db);
  if (band === "quiet" || band === "moderate") return "moderate";
  if (band === "loud") return "loud";
  if (band === "very_loud") return "very_loud";
  return "extreme";
}

/** Apple Noise–style level tint for a dB reading. */
export function decibelTint(db: number | null | undefined): string {
  if (db == null || !Number.isFinite(db)) {
    return "var(--bruit-muted)";
  }
  const band = decibelBand(db);
  switch (band) {
    case "quiet":
      return "#30d158";
    case "moderate":
      return "#34c759";
    case "loud":
      return "#ffd60a";
    case "very_loud":
      return "#ff9f0a";
    case "hazardous":
      return "#ff453a";
  }
}

export function decibelProgress(db: number): number {
  return (clampDb(db) - DB_MIN) / (DB_MAX - DB_MIN);
}

export function averageDb(
  reports: { db_avg?: number | null }[],
): number | null {
  let sum = 0;
  let count = 0;
  for (const report of reports) {
    if (typeof report.db_avg === "number" && Number.isFinite(report.db_avg)) {
      sum += report.db_avg;
      count += 1;
    }
  }
  return count > 0 ? roundDb(sum / count) : null;
}

export function peakDbAmong(
  reports: { db_peak?: number | null }[],
): number | null {
  let peak = -Infinity;
  for (const report of reports) {
    if (typeof report.db_peak === "number" && Number.isFinite(report.db_peak)) {
      peak = Math.max(peak, report.db_peak);
    }
  }
  return Number.isFinite(peak) ? roundDb(peak) : null;
}

export function measuredCount(
  reports: { db_avg?: number | null }[],
): number {
  return reports.filter(
    (report) =>
      typeof report.db_avg === "number" && Number.isFinite(report.db_avg),
  ).length;
}
