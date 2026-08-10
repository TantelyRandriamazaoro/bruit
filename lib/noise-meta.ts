export type NoiseCategory =
  | "traffic"
  | "construction"
  | "party"
  | "animals"
  | "industry"
  | "other";

export type NoiseIntensity = "moderate" | "loud" | "very_loud" | "extreme";

export const NOISE_CATEGORIES: {
  id: NoiseCategory;
}[] = [
  { id: "traffic" },
  { id: "construction" },
  { id: "party" },
  { id: "animals" },
  { id: "industry" },
  { id: "other" },
];

export const NOISE_INTENSITIES: {
  id: NoiseIntensity;
  weight: number;
}[] = [
  { id: "moderate", weight: 0.9 },
  { id: "loud", weight: 1 },
  { id: "very_loud", weight: 1.15 },
  { id: "extreme", weight: 1.35 },
];

/** Hot heatmap / legend tints: orange (low) → purple (extreme). */
export const INTENSITY_TINT: Record<NoiseIntensity, string> = {
  moderate: "#ff9f0a",
  loud: "#ff780a",
  very_loud: "#ff453a",
  extreme: "#af52de",
};

/**
 * Cool / historical map tints (past ~3h hot window) — vivid cyan → electric blue.
 * Reads clearly as “cooled off,” distinct from warm hot clusters.
 */
export const COOL_INTENSITY_TINT: Record<NoiseIntensity, string> = {
  moderate: "#22d3ee",
  loud: "#06b6d4",
  very_loud: "#0ea5e9",
  extreme: "#2563eb",
};

export const HEAT_SCALE_GRADIENT = `linear-gradient(90deg, ${INTENSITY_TINT.moderate} 0%, ${INTENSITY_TINT.loud} 28%, ${INTENSITY_TINT.very_loud} 58%, ${INTENSITY_TINT.extreme} 100%)`;

export const COOL_HEAT_SCALE_GRADIENT = `linear-gradient(90deg, ${COOL_INTENSITY_TINT.moderate} 0%, ${COOL_INTENSITY_TINT.loud} 28%, ${COOL_INTENSITY_TINT.very_loud} 58%, ${COOL_INTENSITY_TINT.extreme} 100%)`;

/** MapLibre heatmap-color stops for hot (within ~3h) density. */
export const HOT_HEATMAP_COLOR: Array<number | string> = [
  0,
  "rgba(0,0,0,0)",
  0.08,
  "rgba(255, 159, 10, 0.58)",
  0.28,
  "rgba(255, 120, 10, 0.7)",
  0.5,
  "rgba(255, 69, 58, 0.78)",
  0.72,
  "rgba(191, 90, 242, 0.86)",
  1,
  "rgba(175, 82, 222, 0.94)",
];

/** MapLibre heatmap-color stops for cool / historical density. */
export const COOL_HEATMAP_COLOR: Array<number | string> = [
  0,
  "rgba(0,0,0,0)",
  0.08,
  "rgba(34, 211, 238, 0.55)",
  0.28,
  "rgba(6, 182, 212, 0.68)",
  0.5,
  "rgba(14, 165, 233, 0.78)",
  0.72,
  "rgba(37, 99, 235, 0.88)",
  1,
  "rgba(29, 78, 216, 0.95)",
];

export function intensityWeight(
  intensity: NoiseIntensity | string | null | undefined,
): number {
  return (
    NOISE_INTENSITIES.find((item) => item.id === intensity)?.weight ?? 0.75
  );
}

/**
 * Relative heatmap kernel size by loudness (1 ≈ 150 m loud baseline).
 * Tuned to typical urban annoyance radii, not just visual weight.
 */
export function intensityRadiusScale(
  intensity: NoiseIntensity | string | null | undefined,
): number {
  switch (intensity) {
    case "moderate":
      return 0.67; // ~100 m
    case "loud":
      return 1; // ~150 m
    case "very_loud":
      return 1.33; // ~200 m
    case "extreme":
      return 1.87; // ~280 m
    default:
      return 1;
  }
}

export function intensityTint(
  intensity: NoiseIntensity | string | null | undefined,
  hot = true,
): string {
  const table = hot ? INTENSITY_TINT : COOL_INTENSITY_TINT;
  if (intensity && intensity in table) {
    return table[intensity as NoiseIntensity];
  }
  return table.loud;
}

/** Soft fill + matching icon color for list / sheet avatars. */
export function intensityIconStyle(
  intensity: NoiseIntensity | string | null | undefined,
  options?: { hot?: boolean },
): { background: string; color: string } {
  const hot = options?.hot !== false;
  if (!hot) {
    // Past hot window — brand primary (tracks light/dark accent tokens).
    return {
      background:
        "color-mix(in srgb, var(--bruit-accent) 16%, transparent)",
      color: "var(--bruit-accent)",
    };
  }
  const tint = intensityTint(intensity, true);
  return {
    background: `color-mix(in srgb, ${tint} 16%, transparent)`,
    color: tint,
  };
}

/** Loudest intensity in a group — used for cluster avatar color. */
export function loudestIntensity(
  intensities: Array<NoiseIntensity | string | null | undefined>,
): NoiseIntensity {
  let best: NoiseIntensity = "loud";
  let bestWeight = 0;
  for (const intensity of intensities) {
    const weight = intensityWeight(intensity);
    if (weight > bestWeight) {
      bestWeight = weight;
      best =
        intensity && intensity in INTENSITY_TINT
          ? (intensity as NoiseIntensity)
          : "loud";
    }
  }
  return best;
}
