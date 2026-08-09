"use client";

import type { ReactNode } from "react";
import { ChevronRight, Phone, Search, Siren } from "lucide-react";
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

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.max(50, Math.round(km * 1000))} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

function PoliceMark() {
  return (
    <span
      className="bruit-place-badge flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] text-white"
      aria-hidden
    >
      <Siren size={15} strokeWidth={2.35} />
    </span>
  );
}

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
          : "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--bruit-accent)] no-underline transition-colors duration-150 hover:bg-[rgba(0,122,255,0.1)] focus-visible:bg-[rgba(0,122,255,0.1)] focus-visible:outline-none active:bg-[rgba(0,122,255,0.16)]"
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
}: {
  station: Pick<PoliceStation, "id" | "name" | "phone">;
  distanceKm: number;
  showSeparator: boolean;
}) {
  const label = shortPoliceStationName(station.name);
  const searchHref = policeGoogleSearchHref(station.name);
  const phone = station.phone;
  const number = phone ? formatPolicePhone(phone) : null;
  const distance = formatDistance(distanceKm);

  if (!phone) {
    return (
      <li>
        {showSeparator ? <div className="bruit-list-separator" /> : null}
        <a
          href={searchHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search Google for ${station.name} phone number, ${distance} away`}
          className="bruit-feed-row flex w-full min-h-11 cursor-pointer items-center text-left no-underline transition-colors duration-150 focus-visible:bg-[rgba(0,122,255,0.06)] focus-visible:outline-none"
        >
          <PoliceMark />
          <span className="min-w-0 flex-1 py-0.5">
            <span className="block truncate text-[1.05rem] font-normal tracking-[-0.01em] text-[var(--bruit-ink)]">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-[0.82rem] font-normal text-[var(--bruit-muted)]">
              {distance} away
            </span>
          </span>
          <span className="shrink-0 text-[0.95rem] font-normal text-[var(--bruit-accent)]">
            Search
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
        <PoliceMark />
        <span className="min-w-0 flex-1 py-0.5">
          <span className="block truncate text-[1.05rem] font-normal tracking-[-0.01em] text-[var(--bruit-ink)]">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[0.82rem] font-normal text-[var(--bruit-muted)]">
            {distance} away
            <span className="text-[var(--bruit-hairline-strong)]"> · </span>
            <span className="tabular-nums">{number}</span>
          </span>
        </span>
        <TrailingButton
          href={searchHref}
          label={`Search Google for ${station.name}`}
          tone="search"
          external
        >
          <Search size={18} strokeWidth={2.15} />
        </TrailingButton>
        <TrailingButton
          href={policePhoneHref(phone)}
          label={`Call ${station.name}, ${number}`}
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
  if (hidden) {
    return null;
  }

  const nearby = userLocation ? nearbyPoliceStations(userLocation) : [];

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
          Help
        </h1>
        <p className="mt-1 max-w-sm text-[0.94rem] font-normal leading-snug text-[var(--bruit-muted)]">
          {userLocation
            ? "Call a nearby commissariat, or look up a number on Google."
            : "Enable location to see commissariats near you."}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(var(--bruit-tabbar-space)+var(--bruit-fab-space)+1rem)]">
        <p className="mb-1.5 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--bruit-muted)]">
          Nearby
        </p>

        {!userLocation ? (
          <EmptyGroup>
            Location is off. Turn it on to list commissariats near you.
          </EmptyGroup>
        ) : nearby.length === 0 ? (
          <EmptyGroup>
            No commissariats within about 40 km. Search Google for a local
            station.
          </EmptyGroup>
        ) : (
          <div className="bruit-grouped-list mx-auto max-w-lg overflow-hidden">
            <ul>
              {nearby.map((station, index) => (
                <StationRow
                  key={station.id}
                  station={station}
                  distanceKm={station.distanceKm}
                  showSeparator={index > 0}
                />
              ))}
            </ul>
          </div>
        )}

        <p className="mx-auto mt-5 max-w-lg px-3 text-[0.78rem] font-normal leading-relaxed text-[var(--bruit-muted)]">
          Bruit reports are community signals — not a substitute for official
          help.
        </p>
      </div>
    </section>
  );
}
