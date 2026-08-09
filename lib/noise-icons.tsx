import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Car,
  CircleAlert,
  Construction,
  Factory,
  Music,
  PawPrint,
} from "lucide-react";
import type { NoiseCategory } from "@/lib/noise-meta";

const CATEGORY_ICONS: Record<NoiseCategory, LucideIcon> = {
  traffic: Car,
  construction: Construction,
  party: Music,
  animals: PawPrint,
  industry: Factory,
  other: CircleAlert,
};

export function NoiseCategoryIcon({
  category,
  size = 22,
  strokeWidth = 1.85,
  className,
  ...props
}: {
  category: NoiseCategory | string | null | undefined;
} & LucideProps) {
  const id = (category ?? "other") as NoiseCategory;
  const Icon = CATEGORY_ICONS[id] ?? CircleAlert;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
      {...props}
    />
  );
}
