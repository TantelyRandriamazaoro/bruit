"use client";

import { useId, useState } from "react";
import { Drawer } from "vaul";
import {
  NOISE_CATEGORIES,
  NOISE_INTENSITIES,
  type NoiseCategory,
  type NoiseIntensity,
} from "@/lib/noise-meta";

type ReportDrawerProps = {
  open: boolean;
  busy?: boolean;
  /** Keep drawer inside the app shell so the tab bar stays above the sheet. */
  container?: HTMLElement | null;
  onClose: () => void;
  onSubmit: (details: {
    category: NoiseCategory;
    intensity: NoiseIntensity;
  }) => void;
};

function CategoryIcon({ id }: { id: NoiseCategory }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "traffic":
      return (
        <svg {...common}>
          <path
            d="M5 16h14l-1.2-7.2A2 2 0 0 0 15.84 7H8.16a2 2 0 0 0-1.96 1.8L5 16Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="16.5" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" />
        </svg>
      );
    case "construction":
      return (
        <svg {...common}>
          <path
            d="M14 5 8 11l5 5 6-6-2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 20h7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "party":
      return (
        <svg {...common}>
          <path
            d="M9 18V8.5a3.5 3.5 0 1 1 3.5 3.5H9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 12v6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "animals":
      return (
        <svg {...common}>
          <path
            d="M12 13c2.5 0 4.5 1.4 4.5 3.2V18H7.5v-1.8C7.5 14.4 9.5 13 12 13Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="10" r="1.4" fill="currentColor" />
          <circle cx="15" cy="10" r="1.4" fill="currentColor" />
          <path
            d="M8 7.5 6.5 5M16 7.5 17.5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "industry":
      return (
        <svg {...common}>
          <path
            d="M4 20V10l5 3V10l5 3V8h3v12H4Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 9v3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" />
        </svg>
      );
  }
}

export function ReportDrawer({
  open,
  busy = false,
  container = null,
  onClose,
  onSubmit,
}: ReportDrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [category, setCategory] = useState<NoiseCategory>("traffic");
  const [intensity, setIntensity] = useState<NoiseIntensity>("loud");

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      dismissible={!busy}
      shouldScaleBackground={false}
      repositionInputs
      container={container ?? undefined}
      autoFocus
    >
      <Drawer.Portal>
        <Drawer.Overlay className="bruit-drawer-overlay fixed inset-x-0 top-0 z-40 bottom-[var(--bruit-tabbar-space)]" />
        <Drawer.Content
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="bruit-sheet bruit-drawer-content fixed inset-x-0 z-40 mx-auto flex h-[calc(100dvh-var(--bruit-tabbar-space))] max-h-[calc(100dvh-var(--bruit-tabbar-space))] w-full max-w-lg flex-col outline-none bottom-[var(--bruit-tabbar-space)] focus:outline-none"
        >
          <Drawer.Handle className="bruit-drawer-handle mx-auto mt-2.5 mb-1" />

          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1">
            <div>
              <Drawer.Title
                id={titleId}
                className="bruit-brand text-[1.35rem] font-semibold tracking-tight text-[var(--bruit-ink)]"
              >
                Report a noise
              </Drawer.Title>
              <Drawer.Description
                id={descriptionId}
                className="mt-0.5 text-[0.84rem] font-medium text-[var(--bruit-muted)]"
              >
                Tell us what you’re hearing
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="bruit-icon-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path
                  d="M3 3l8 8M11 3 3 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
            <p className="mb-2 text-[0.8rem] font-semibold text-[var(--bruit-muted)]">
              Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {NOISE_CATEGORIES.map((item) => {
                const selected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`bruit-choice cursor-pointer text-left transition-colors duration-200 ${
                      selected ? "bruit-choice-selected" : ""
                    }`}
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-[0.85rem] bg-[var(--bruit-fill)] text-[var(--bruit-ink)]">
                      <CategoryIcon id={item.id} />
                    </span>
                    <span className="block text-[0.92rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] font-medium leading-snug text-[var(--bruit-muted)]">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mb-2 mt-5 text-[0.8rem] font-semibold text-[var(--bruit-muted)]">
              How Loud
            </p>
            <div className="overflow-hidden rounded-[1rem] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              {NOISE_INTENSITIES.map((item, index) => {
                const selected = intensity === item.id;
                return (
                  <div key={item.id}>
                    {index > 0 ? (
                      <div className="ml-4 h-px bg-[var(--bruit-hairline)]" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIntensity(item.id)}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-black/[0.03]"
                    >
                      <span>
                        <span className="block text-[0.98rem] font-semibold tracking-tight text-[var(--bruit-ink)]">
                          {item.label}
                        </span>
                        <span className="block text-[0.78rem] font-medium text-[var(--bruit-muted)]">
                          {item.hint}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                          selected
                            ? "border-[var(--bruit-accent)] bg-[var(--bruit-accent)] text-white"
                            : "border-[var(--bruit-hairline-strong)]"
                        }`}
                        aria-hidden
                      >
                        {selected ? (
                          <svg width="10" height="10" viewBox="0 0 10 10">
                            <path
                              d="M2 5.2 4.1 7.2 8 2.8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--bruit-hairline)] px-5 pb-4 pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit({ category, intensity })}
              className="bruit-primary-btn w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Sending…" : "Submit report"}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
