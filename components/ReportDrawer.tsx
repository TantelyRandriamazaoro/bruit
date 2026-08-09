"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  NOISE_CATEGORIES,
  NOISE_INTENSITIES,
  type NoiseCategory,
  type NoiseIntensity,
} from "@/lib/noise-meta";

type ReportDrawerProps = {
  open: boolean;
  busy?: boolean;
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
  onClose,
  onSubmit,
}: ReportDrawerProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [category, setCategory] = useState<NoiseCategory>("traffic");
  const [intensity, setIntensity] = useState<NoiseIntensity>("loud");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="bruit-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bruit-sheet relative z-10 flex max-h-[min(82dvh,40rem)] w-full max-w-lg flex-col outline-none animate-[bruit-sheet-in_320ms_cubic-bezier(0.32,0.72,0,1)]"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="h-1 w-10 rounded-full bg-[var(--bruit-hairline)]" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1">
          <div>
            <h2
              id={titleId}
              className="bruit-brand text-[1.35rem] font-semibold tracking-tight text-[var(--bruit-ink)]"
            >
              Report a noise
            </h2>
            <p className="mt-0.5 text-[0.84rem] font-medium text-[var(--bruit-muted)]">
              Tell us what you’re hearing
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bruit-icon-btn cursor-pointer"
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
          <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
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
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bruit-fill)] text-[var(--bruit-ink)]">
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

          <p className="mb-2 mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-[var(--bruit-muted)]">
            How loud
          </p>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-[var(--bruit-fill)] p-1.5">
            {NOISE_INTENSITIES.map((item) => {
              const selected = intensity === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntensity(item.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-[0.9rem] px-3.5 py-2.5 text-left transition-colors duration-200 ${
                    selected
                      ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                      : "bg-transparent"
                  }`}
                >
                  <span>
                    <span className="block text-[0.92rem] font-semibold text-[var(--bruit-ink)]">
                      {item.label}
                    </span>
                    <span className="block text-[0.72rem] font-medium text-[var(--bruit-muted)]">
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
              );
            })}
          </div>
        </div>

        <div className="border-t border-[var(--bruit-hairline)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit({ category, intensity })}
            className="bruit-primary-btn w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Sending…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
