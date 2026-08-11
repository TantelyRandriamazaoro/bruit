"use client";

import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  MEASURE_SECONDS,
  decibelBand,
  decibelProgress,
  decibelTint,
  roundDb,
} from "@/lib/decibel";
import { useNoiseMeter } from "@/lib/use-noise-meter";

type NoiseMeterProps = {
  active: boolean;
  busy?: boolean;
  /** Prefill a completed sample (e.g. when opening report from measure). */
  seedReading?: { avgDb: number; peakDb: number } | null;
  /** Hide the section title when the parent sheet already provides one. */
  showHeading?: boolean;
  /** `sheet` = Apple-style hero meter; `card` = denser inset used in report. */
  variant?: "card" | "sheet";
  onReadingChange: (
    reading: { avgDb: number; peakDb: number } | null,
  ) => void;
};

export function NoiseMeter({
  active,
  busy = false,
  seedReading = null,
  showHeading = true,
  variant = "card",
  onReadingChange,
}: NoiseMeterProps) {
  const t = useTranslations("Report");
  const meter = useNoiseMeter(
    active,
    seedReading
      ? {
          avgDb: seedReading.avgDb,
          peakDb: seedReading.peakDb,
          samples: 1,
        }
      : null,
  );
  const titleId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const isSheet = variant === "sheet";
  const displayDb =
    meter.phase === "recording"
      ? meter.liveDb
      : meter.phase === "done"
        ? meter.avgDb
        : 0;
  const tint =
    meter.phase === "idle" ||
    meter.phase === "requesting" ||
    meter.phase === "denied" ||
    meter.phase === "unsupported" ||
    meter.phase === "error"
      ? "var(--bruit-hairline-strong)"
      : decibelTint(displayDb || meter.peakDb);
  const progress =
    meter.phase === "idle" || meter.phase === "requesting"
      ? 0
      : decibelProgress(displayDb || meter.peakDb);
  const band =
    meter.phase === "done" || meter.phase === "recording"
      ? decibelBand(displayDb || meter.peakDb)
      : null;

  useEffect(() => {
    onReadingChange(
      meter.reading
        ? { avgDb: meter.reading.avgDb, peakDb: meter.reading.peakDb }
        : null,
    );
  }, [meter.reading, onReadingChange]);

  const audioUrl = meter.audioUrl;

  const radius = isSheet ? 62 : 54;
  const ringSize = isSheet ? 168 : 148;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.max(0.02, progress);

  const bandLabel = (() => {
    if (!band) return t("measureHint");
    return t(`band.${band}` as "band.quiet");
  })();

  const statusCopy = (() => {
    switch (meter.phase) {
      case "requesting":
        return t("measureRequesting");
      case "recording":
        return t("measureListening", { seconds: meter.secondsLeft });
      case "done":
        return isSheet
          ? bandLabel
          : t("measureDone", {
              avg: roundDb(meter.avgDb),
              peak: roundDb(meter.peakDb),
            });
      case "denied":
        return t("measureDenied");
      case "unsupported":
        return t("measureUnsupported");
      case "error":
        return t("measureError");
      default:
        return t("measureIdle");
    }
  })();

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true));
    }
  };

  return (
    <section
      className={`bruit-noise-meter${isSheet ? " bruit-noise-meter--sheet" : ""}`}
      aria-labelledby={titleId}
      aria-live="polite"
    >
      {!isSheet ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            {showHeading ? (
              <p
                id={titleId}
                className="text-[0.8rem] font-semibold text-[var(--bruit-muted)]"
              >
                {t("measure")}
              </p>
            ) : (
              <span id={titleId} className="sr-only">
                {t("measure")}
              </span>
            )}
            <p
              className={`${showHeading ? "mt-0.5" : ""} text-[0.78rem] font-medium leading-snug text-[var(--bruit-muted)]`}
            >
              {statusCopy}
            </p>
          </div>
          {meter.phase === "done" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => meter.reset()}
              className="bruit-meter-ghost-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={14} strokeWidth={2.2} aria-hidden />
              {t("measureAgain")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <span id={titleId} className="sr-only">
            {t("measure")}
          </span>
          {meter.phase !== "idle" ? (
            <div className="bruit-meter-sheet-status">
              <p className="bruit-meter-sheet-status-copy">{statusCopy}</p>
            </div>
          ) : null}
        </>
      )}

      <div className="bruit-meter-stage">
        <div className="bruit-meter-ring-wrap" aria-hidden>
          <svg
            className="bruit-meter-ring"
            viewBox="0 0 128 128"
            width={ringSize}
            height={ringSize}
          >
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="var(--bruit-fill)"
              strokeWidth={isSheet ? 6 : 8}
            />
            <circle
              className="bruit-meter-ring-progress"
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={tint}
              strokeWidth={isSheet ? 6 : 8}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(-90 64 64)"
            />
          </svg>
          <div className="bruit-meter-readout">
            <p
              className="bruit-meter-value"
              style={{
                color:
                  tint === "var(--bruit-hairline-strong)" ? undefined : tint,
              }}
            >
              {meter.phase === "idle" || meter.phase === "requesting"
                ? "—"
                : roundDb(displayDb || 0)}
            </p>
            <p className="bruit-meter-unit">dB</p>
            {!isSheet ? <p className="bruit-meter-band">{bandLabel}</p> : null}
          </div>
        </div>

        <div className="bruit-meter-wave" aria-hidden>
          {meter.levels.map((level, index) => (
            <span
              key={index}
              className="bruit-meter-bar"
              style={{
                transform: `scaleY(${level})`,
                background:
                  meter.phase === "recording" || meter.phase === "done"
                    ? tint
                    : "var(--bruit-hairline-strong)",
                opacity:
                  meter.phase === "recording" || meter.phase === "done"
                    ? 0.55 + level * 0.45
                    : 0.35,
              }}
            />
          ))}
        </div>
      </div>

      {!(isSheet && meter.phase === "done") ? (
        <div className="bruit-meter-actions">
          {meter.phase === "recording" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => meter.stop()}
              className="bruit-meter-record-btn bruit-meter-record-btn-stop cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t("measureStop")}
            >
              <Square
                size={isSheet ? 16 : 18}
                strokeWidth={2.4}
                fill="currentColor"
                aria-hidden
              />
            </button>
          ) : meter.phase === "done" ? (
            <div className="flex w-full items-center justify-center gap-3">
              {audioUrl ? (
                <>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    onEnded={() => setPlaying(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={togglePlayback}
                    className="bruit-meter-ghost-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {playing ? (
                      <Pause size={14} strokeWidth={2.2} aria-hidden />
                    ) : (
                      <Play size={14} strokeWidth={2.2} aria-hidden />
                    )}
                    {playing ? t("measurePause") : t("measurePlay")}
                  </button>
                </>
              ) : null}
              <div className="bruit-meter-stats">
                <span>
                  <strong>{roundDb(meter.avgDb)}</strong> {t("avgShort")}
                </span>
                <span className="bruit-meter-stats-sep" aria-hidden>
                  ·
                </span>
                <span>
                  <strong>{roundDb(meter.peakDb)}</strong> {t("peakShort")}
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || meter.phase === "requesting"}
              onClick={() => void meter.start()}
              className="bruit-meter-record-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t("measureStart")}
            >
              <Mic size={isSheet ? 24 : 22} strokeWidth={2.1} aria-hidden />
            </button>
          )}
        </div>
      ) : null}

      {isSheet && meter.phase === "done" ? (
        <>
          <div className="bruit-meter-metrics" role="group">
            <div className="bruit-meter-metric">
              <span className="bruit-meter-metric-label">{t("avgLabel")}</span>
              <span className="bruit-meter-metric-value">
                {roundDb(meter.avgDb)}
                <span className="bruit-meter-metric-unit">dB</span>
              </span>
            </div>
            <div className="bruit-meter-metric-divider" aria-hidden />
            <div className="bruit-meter-metric">
              <span className="bruit-meter-metric-label">{t("peakLabel")}</span>
              <span className="bruit-meter-metric-value">
                {roundDb(meter.peakDb)}
                <span className="bruit-meter-metric-unit">dB</span>
              </span>
            </div>
          </div>

          <div
            className="bruit-meter-sheet-tools"
            role="group"
            aria-label={t("measure")}
          >
            {audioUrl ? (
              <>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  preload="metadata"
                  onEnded={() => setPlaying(false)}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={togglePlayback}
                  className="bruit-meter-tool-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={
                    playing ? t("measurePause") : t("measurePlayAria")
                  }
                >
                  <span className="bruit-meter-tool-icon" aria-hidden>
                    {playing ? (
                      <Pause size={18} strokeWidth={2.1} />
                    ) : (
                      <Play size={18} strokeWidth={2.1} />
                    )}
                  </span>
                  <span className="bruit-meter-tool-label">
                    {playing ? t("measurePause") : t("measurePlay")}
                  </span>
                </button>
              </>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => meter.reset()}
              className="bruit-meter-tool-btn cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("measureAgainAria")}
            >
              <span className="bruit-meter-tool-icon" aria-hidden>
                <RotateCcw size={18} strokeWidth={2.1} />
              </span>
              <span className="bruit-meter-tool-label">{t("measureAgain")}</span>
            </button>
          </div>
        </>
      ) : null}

      <p className="bruit-meter-footnote">
        {t("measureFootnote", { seconds: MEASURE_SECONDS })}
      </p>
    </section>
  );
}
