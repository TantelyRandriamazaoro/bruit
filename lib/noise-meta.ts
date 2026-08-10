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

/** Heatmap / legend tints: orange (low) → purple (extreme). */
export const INTENSITY_TINT: Record<NoiseIntensity, string> = {
  moderate: "#ff9f0a",
  loud: "#ff780a",
  very_loud: "#ff453a",
  extreme: "#af52de",
};

export const HEAT_SCALE_GRADIENT = `linear-gradient(90deg, ${INTENSITY_TINT.moderate} 0%, ${INTENSITY_TINT.loud} 28%, ${INTENSITY_TINT.very_loud} 58%, ${INTENSITY_TINT.extreme} 100%)`;

export function intensityWeight(
  intensity: NoiseIntensity | string | null | undefined,
): number {
  return (
    NOISE_INTENSITIES.find((item) => item.id === intensity)?.weight ?? 0.75
  );
}

export function intensityTint(
  intensity: NoiseIntensity | string | null | undefined,
): string {
  if (intensity && intensity in INTENSITY_TINT) {
    return INTENSITY_TINT[intensity as NoiseIntensity];
  }
  return INTENSITY_TINT.loud;
}

/** Soft fill + matching icon color for list / sheet avatars. */
export function intensityIconStyle(
  intensity: NoiseIntensity | string | null | undefined,
): { background: string; color: string } {
  const tint = intensityTint(intensity);
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
