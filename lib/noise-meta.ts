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
  { id: "moderate", weight: 0.45 },
  { id: "loud", weight: 0.75 },
  { id: "very_loud", weight: 1 },
  { id: "extreme", weight: 1.35 },
];

export function intensityWeight(
  intensity: NoiseIntensity | string | null | undefined,
): number {
  return (
    NOISE_INTENSITIES.find((item) => item.id === intensity)?.weight ?? 0.75
  );
}
