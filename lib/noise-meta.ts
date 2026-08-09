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
  label: string;
  description: string;
}[] = [
  {
    id: "traffic",
    label: "Traffic",
    description: "Cars, horns, motorbikes",
  },
  {
    id: "construction",
    label: "Construction",
    description: "Drills, worksites, machinery",
  },
  {
    id: "party",
    label: "Music & gatherings",
    description: "Bars, events, loud music",
  },
  {
    id: "animals",
    label: "Animals",
    description: "Barking, roosters, wildlife",
  },
  {
    id: "industry",
    label: "Industry",
    description: "Factories, generators, HVAC",
  },
  {
    id: "other",
    label: "Other",
    description: "Anything else that’s too loud",
  },
];

export const NOISE_INTENSITIES: {
  id: NoiseIntensity;
  label: string;
  hint: string;
  weight: number;
}[] = [
  { id: "moderate", label: "Noticeable", hint: "Hard to ignore", weight: 0.45 },
  { id: "loud", label: "Loud", hint: "Disrupts conversation", weight: 0.75 },
  {
    id: "very_loud",
    label: "Very loud",
    hint: "Uncomfortable outdoors",
    weight: 1,
  },
  {
    id: "extreme",
    label: "Extreme",
    hint: "Painful or alarming",
    weight: 1.35,
  },
];

export function intensityWeight(intensity: NoiseIntensity | string | null | undefined): number {
  return (
    NOISE_INTENSITIES.find((item) => item.id === intensity)?.weight ?? 0.75
  );
}
