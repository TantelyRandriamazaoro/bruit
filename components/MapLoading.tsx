"use client";

import { useTranslations } from "next-intl";

export function MapLoading() {
  const t = useTranslations("Map");

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[var(--bruit-map-wash)]">
      <p className="text-sm font-medium text-[var(--bruit-muted)]">{t("loading")}</p>
    </div>
  );
}
