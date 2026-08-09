"use client";

import { useId, type ReactNode } from "react";
import { ChevronRight, Phone, Search, Siren, X } from "lucide-react";
import { Drawer } from "vaul";
import {
  formatPolicePhone,
  policeGoogleSearchHref,
  policePhoneHref,
  shortPoliceStationName,
  type SelectedPoliceStation,
} from "@/lib/police-stations";

type PoliceStationDrawerProps = {
  station: SelectedPoliceStation | null;
  container?: HTMLElement | null;
  onClose: () => void;
};

function ActionCell({
  href,
  label,
  tone,
  external,
  showDivider,
  children,
}: {
  href: string;
  label: string;
  tone: "call" | "search";
  external?: boolean;
  showDivider?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`bruit-place-action relative flex min-h-[5.5rem] min-w-[4.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-2 px-3 py-3 no-underline outline-none transition-colors duration-150 hover:bg-[var(--bruit-row-hover)] active:bg-[var(--bruit-row-active)] focus-visible:bg-[var(--bruit-row-hover)] ${
        showDivider
          ? "before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-[var(--bruit-hairline)]"
          : ""
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${
          tone === "call"
            ? "bg-[var(--bruit-call)]"
            : "bg-[var(--bruit-accent)]"
        }`}
        aria-hidden
      >
        {children}
      </span>
      <span className="text-[0.8rem] font-semibold tracking-[-0.01em] text-[var(--bruit-accent)]">
        {label}
      </span>
    </a>
  );
}

function DetailRow({
  href,
  label,
  value,
  external,
  showSeparator,
  leading,
}: {
  href: string;
  label: string;
  value: string;
  external?: boolean;
  showSeparator?: boolean;
  leading: ReactNode;
}) {
  return (
    <>
      {showSeparator ? (
        <div className="ml-[3.55rem] h-px bg-[var(--bruit-hairline)]" />
      ) : null}
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 px-3.5 py-2.5 no-underline transition-colors duration-150 hover:bg-[var(--bruit-row-hover)] active:bg-[var(--bruit-row-active)] focus-visible:bg-[var(--bruit-row-hover)] focus-visible:outline-none"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.55rem] bg-[var(--bruit-fill)] text-[var(--bruit-accent)]"
          aria-hidden
        >
          {leading}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-medium leading-none text-[var(--bruit-muted)]">
            {label}
          </span>
          <span className="mt-1 block truncate text-[1.02rem] font-semibold tracking-[-0.02em] text-[var(--bruit-accent)]">
            {value}
          </span>
        </span>
        <span className="shrink-0 text-[var(--bruit-hairline-strong)]" aria-hidden>
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      </a>
    </>
  );
}

export function PoliceStationDrawer({
  station,
  container = null,
  onClose,
}: PoliceStationDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const open = station !== null;
  const title = station ? shortPoliceStationName(station.name) : "";
  const phoneDisplay = station?.phone
    ? formatPolicePhone(station.phone)
    : null;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      shouldScaleBackground={false}
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay bruit-place-overlay fixed inset-0 z-[60]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content bruit-place-drawer fixed z-[60] flex w-full flex-col outline-none focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2 mb-0.5" />

          <div className="flex items-start gap-3 px-4 pb-3 pt-2">
            <span
              className="bruit-place-badge mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.95rem] text-white"
              aria-hidden
            >
              <Siren size={22} strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.35rem] font-bold leading-[1.15] tracking-[-0.03em] text-[var(--bruit-ink)]"
              >
                {title || "Commissariat"}
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-1 text-[0.9rem] font-medium leading-snug text-[var(--bruit-muted)]"
              >
                Police station
                {phoneDisplay ? ` · ${phoneDisplay}` : ""}
              </Drawer.Description>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bruit-icon-btn mt-0.5 cursor-pointer"
              aria-label="Close"
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          {station ? (
            <div className="flex flex-col gap-3 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
              <div
                className="bruit-place-actions flex overflow-hidden rounded-[1.05rem]"
                role="group"
                aria-label="Actions"
              >
                {station.phone ? (
                  <ActionCell
                    href={policePhoneHref(station.phone)}
                    label="Call"
                    tone="call"
                  >
                    <Phone size={20} strokeWidth={2} />
                  </ActionCell>
                ) : null}
                <ActionCell
                  href={policeGoogleSearchHref(station.name)}
                  label="Search"
                  tone="search"
                  external
                  showDivider={Boolean(station.phone)}
                >
                  <Search size={20} strokeWidth={2} />
                </ActionCell>
              </div>

              <div className="bruit-place-details overflow-hidden rounded-[1.05rem]">
                {station.phone ? (
                  <DetailRow
                    href={policePhoneHref(station.phone)}
                    label="Phone"
                    value={phoneDisplay ?? station.phone}
                    leading={<Phone size={15} strokeWidth={2} />}
                  />
                ) : null}
                <DetailRow
                  href={policeGoogleSearchHref(station.name)}
                  label={station.phone ? "Find another number" : "Phone number"}
                  value="Search on Google"
                  external
                  showSeparator={Boolean(station.phone)}
                  leading={<Search size={15} strokeWidth={2} />}
                />
              </div>
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
