"use client";

import type { ReactNode } from "react";
import { ChevronRight, Phone, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistanceKm } from "@/lib/format";
import {
  formatPolicePhone,
  nearbyPoliceStations,
  policeGoogleSearchHref,
  policePhoneHref,
  shortPoliceStationName,
  type PoliceStation,
} from "@/lib/police-stations";

type HelpContactsProps = {
  hidden?: boolean;
  userLocation: { lat: number; lng: number } | null;
};

function TrailingButton({
  href,
  label,
  tone,
  external,
  children,
}: {
  href: string;
  label: string;
  tone: "call" | "search";
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className={
        tone === "call"
          ? "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bruit-call)] no-underline transition-colors duration-150 hover:bg-[rgba(52,199,89,0.12)] focus-visible:bg-[rgba(52,199,89,0.12)] focus-visible:outline-none active:bg-[rgba(52,199,89,0.18)]"
          : "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bruit-accent)] no-underline transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--bruit-accent)_10%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--bruit-accent)_10%,transparent)] focus-visible:outline-none active:bg-[color-mix(in_srgb,var(--bruit-accent)_16%,transparent)]"
      }
    >
      {children}
    </a>
  );
}

function StationRow({
  station,
  distanceKm,
  showSeparator,
  phoneQuery,
}: {
  station: Pick<PoliceStation, "id" | "name" | "phone">;
  distanceKm: number;
  showSeparator: boolean;
  phoneQuery: string;
}) {
  const t = useTranslations("Help");
  const tCommon = useTranslations("Common");
  const label = shortPoliceStationName(station.name);
  const searchHref = policeGoogleSearchHref(station.name, phoneQuery);
  const phone = station.phone;
  const number = phone ? formatPolicePhone(phone) : null;
  const distance = formatDistanceKm(distanceKm);

  if (!phone) {
    return (
      <li>
        {showSeparator ? <div className="bruit-list-separator" /> : null}
        <a
          href={searchHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("searchGoogleAria", {
            name: station.name,
            distance,
          })}
          className="bruit-feed-row flex w-full min-h-11 cursor-pointer items-center text-left no-underline transition-colors duration-150 focus-visible:bg-[color-mix(in_srgb,var(--bruit-accent)_6%,transparent)] focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1 py-0.5">
            <span className="block truncate text-[1.05rem] font-normal tracking-[-0.01em] text-[var(--bruit-ink)]">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-[0.82rem] font-normal text-[var(--bruit-muted)]">
              {t("away", { distance })}
            </span>
          </span>
          <span className="shrink-0 text-[0.95rem] font-normal text-[var(--bruit-accent)]">
            {tCommon("search")}
          </span>
          <span className="ml-0.5 text-[var(--bruit-muted)] opacity-55" aria-hidden>
            <ChevronRight size={18} strokeWidth={2.2} />
          </span>
        </a>
      </li>
    );
  }

  return (
    <li>
      {showSeparator ? <div className="bruit-list-separator" /> : null}
      <div className="bruit-feed-row flex w-full min-h-11 items-center">
        <span className="min-w-0 flex-1 py-0.5">
          <span className="block truncate text-[1.05rem] font-normal tracking-[-0.01em] text-[var(--bruit-ink)]">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[0.82rem] font-normal text-[var(--bruit-muted)]">
            {t("away", { distance })}
            <span className="text-[var(--bruit-hairline-strong)]"> · </span>
            <span className="tabular-nums">{number}</span>
          </span>
        </span>
        <TrailingButton
          href={searchHref}
          label={t("searchGoogleName", { name: station.name })}
          tone="search"
          external
        >
          <Search size={18} strokeWidth={2.15} />
        </TrailingButton>
        <TrailingButton
          href={policePhoneHref(phone)}
          label={t("callAria", { name: station.name, number: number ?? "" })}
          tone="call"
        >
          <Phone size={18} strokeWidth={2.15} />
        </TrailingButton>
      </div>
    </li>
  );
}

function EmptyGroup({ children }: { children: ReactNode }) {
  return (
    <div className="bruit-grouped-list mx-auto max-w-lg overflow-hidden">
      <p className="px-4 py-3.5 text-[0.95rem] font-normal leading-snug text-[var(--bruit-muted)]">
        {children}
      </p>
    </div>
  );
}

export function HelpContacts({
  hidden = false,
  userLocation,
}: HelpContactsProps) {
  const t = useTranslations("Help");

  if (hidden) {
    return null;
  }

  const nearby = userLocation ? nearbyPoliceStations(userLocation) : [];
  const phoneQuery = t("phoneQuery");

  return (
    <section
      className="bruit-feed absolute inset-0 z-10 flex flex-col bg-[var(--bruit-map-wash)]"
      aria-labelledby="help-title"
    >
      <header className="bruit-feed-header shrink-0 px-5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <h1
          id="help-title"
          className="bruit-brand text-[2.15rem] font-bold tracking-tight text-[var(--bruit-ink)]"
        >
          {t("title")}
        </h1>
        <p className="mt-1 max-w-sm text-[0.94rem] font-normal leading-snug text-[var(--bruit-muted)]">
          {userLocation ? t("subtitleLocated") : t("subtitleNoLocation")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)]">
        <p className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--bruit-muted)]">
          {t("nearby")}
        </p>

        {!userLocation ? (
          <EmptyGroup>{t("locationOff")}</EmptyGroup>
        ) : nearby.length === 0 ? (
          <EmptyGroup>{t("noneNearby")}</EmptyGroup>
        ) : (
          <div className="bruit-grouped-list mx-auto max-w-lg overflow-hidden">
            <ul>
              {nearby.map((station, index) => (
                <StationRow
                  key={station.id}
                  station={station}
                  distanceKm={station.distanceKm}
                  showSeparator={index > 0}
                  phoneQuery={phoneQuery}
                />
              ))}
            </ul>
          </div>
        )}

        <p className="mx-auto mt-5 max-w-lg px-3 text-[0.78rem] font-normal leading-relaxed text-[var(--bruit-muted)]">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}
