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
