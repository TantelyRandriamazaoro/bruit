import type { useTranslations } from "next-intl";
import type { RelativeTimeMessages } from "@/lib/format";
import type { NoiseCategory, NoiseIntensity } from "@/lib/noise-meta";
import type { HotspotStatus } from "@/lib/insights";

type Translate = ReturnType<typeof useTranslations>;

export function relativeTimeMessages(t: Translate): RelativeTimeMessages {
  return {
    justNow: t("justNow"),
    minutesAgo: (count) => t("minutesAgo", { count }),
    hoursAgo: (count) => t("hoursAgo", { count }),
    daysAgo: (count) => t("daysAgo", { count }),
  };
}

export function categoryLabel(t: Translate, id: string | null | undefined) {
  const key = (id ?? "other") as NoiseCategory;
  if (
    key === "traffic" ||
    key === "construction" ||
    key === "party" ||
    key === "animals" ||
    key === "industry" ||
    key === "other"
  ) {
    return t(`${key}.label`);
  }
  return t("fallback");
}

export function intensityLabel(t: Translate, id: string | null | undefined) {
  const key = (id ?? "loud") as NoiseIntensity;
  if (
    key === "moderate" ||
    key === "loud" ||
    key === "very_loud" ||
    key === "extreme"
  ) {
    return t(`${key}.label`);
  }
  return t("fallback");
}

export function intensityShort(t: Translate, id: NoiseIntensity) {
  return t(`${id}.short`);
}

export function hotspotStatusLabel(t: Translate, status: HotspotStatus) {
  return t(`status.${status}`);
}

export function formatWeekDeltaMessage(
  t: Translate,
  delta: number | null,
): string | null {
  if (delta === null) {
    return null;
  }
  if (delta === 0) {
    return t("sameAsPriorWeek");
  }
  if (delta > 0) {
    return t("upVsPriorWeek", { delta });
  }
  return t("downVsPriorWeek", { delta: Math.abs(delta) });
}
