import { COOLDOWN_MS, LAST_REPORT_AT_KEY } from "./constants";

export function getLastReportAt(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LAST_REPORT_AT_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function setLastReportAt(timestampMs: number): void {
  window.localStorage.setItem(LAST_REPORT_AT_KEY, String(timestampMs));
}

export function getCooldownRemainingMs(now = Date.now()): number {
  const last = getLastReportAt();
  if (last === null) {
    return 0;
  }

  return Math.max(0, last + COOLDOWN_MS - now);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
