"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MEASURE_SECONDS,
  WAVEFORM_BARS,
  type DecibelReading,
  rmsToDb,
  roundDb,
} from "@/lib/decibel";

export type NoiseMeterPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "done"
  | "denied"
  | "unsupported"
  | "error";

export type NoiseMeterState = {
  phase: NoiseMeterPhase;
  liveDb: number;
  peakDb: number;
  avgDb: number;
  secondsLeft: number;
  levels: number[];
  reading: DecibelReading | null;
  audioUrl: string | null;
};

const DB_FLOOR = 30;

const IDLE: NoiseMeterState = {
  phase: "idle",
  liveDb: 0,
  peakDb: 0,
  avgDb: 0,
  secondsLeft: MEASURE_SECONDS,
  levels: Array.from({ length: WAVEFORM_BARS }, () => 0.08),
  reading: null,
  audioUrl: null,
};

function computeRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i];
    sum += value * value;
  }
  return Math.sqrt(sum / Math.max(1, samples.length));
}

type MeterEngine = {
  stream: MediaStream | null;
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  audioUrl: string | null;
  raf: number | null;
  samples: number[];
  peak: number;
  startedAt: number;
  phase: NoiseMeterPhase;
};

function createEngine(): MeterEngine {
  return {
    stream: null,
    context: null,
    analyser: null,
    recorder: null,
    chunks: [],
    audioUrl: null,
    raf: null,
    samples: [],
    peak: 0,
    startedAt: 0,
    phase: "idle",
  };
}

export function useNoiseMeter(active: boolean) {
  const [state, setState] = useState<NoiseMeterState>(IDLE);
  const engineRef = useRef<MeterEngine>(createEngine());

  const revokeAudioUrl = useCallback((engine: MeterEngine) => {
    if (engine.audioUrl) {
      URL.revokeObjectURL(engine.audioUrl);
      engine.audioUrl = null;
    }
  }, []);

  const stopHardware = useCallback((engine: MeterEngine) => {
    if (engine.raf != null) {
      cancelAnimationFrame(engine.raf);
      engine.raf = null;
    }
    if (engine.recorder && engine.recorder.state !== "inactive") {
      try {
        engine.recorder.stop();
      } catch {
        // ignore
      }
    }
    engine.recorder = null;
    engine.stream?.getTracks().forEach((track) => track.stop());
    engine.stream = null;
    void engine.context?.close().catch(() => undefined);
    engine.context = null;
    engine.analyser = null;
  }, []);

  const finishRecording = useCallback(() => {
    const engine = engineRef.current;
    if (engine.phase !== "recording" && engine.phase !== "requesting") {
      return;
    }

    if (engine.raf != null) {
      cancelAnimationFrame(engine.raf);
      engine.raf = null;
    }

    const avg =
      engine.samples.length > 0
        ? engine.samples.reduce((sum, value) => sum + value, 0) /
          engine.samples.length
        : engine.peak;
    const peak = Math.max(engine.peak, avg);
    const reading: DecibelReading = {
      avgDb: roundDb(avg),
      peakDb: roundDb(peak),
      samples: engine.samples.length,
    };

    if (engine.recorder && engine.recorder.state !== "inactive") {
      try {
        engine.recorder.stop();
      } catch {
        // ignore
      }
    }

    engine.stream?.getTracks().forEach((track) => track.stop());
    engine.stream = null;
    void engine.context?.close().catch(() => undefined);
    engine.context = null;
    engine.analyser = null;
    engine.recorder = null;
    engine.phase = "done";

    setState((prev) => ({
      ...prev,
      phase: "done",
      liveDb: reading.avgDb,
      avgDb: reading.avgDb,
      peakDb: reading.peakDb,
      secondsLeft: 0,
      reading,
    }));
  }, []);

  const reset = useCallback(() => {
    const engine = engineRef.current;
    stopHardware(engine);
    revokeAudioUrl(engine);
    engine.samples = [];
    engine.peak = 0;
    engine.phase = "idle";
    setState(IDLE);
  }, [revokeAudioUrl, stopHardware]);

  useEffect(() => {
    if (active) {
      return;
    }
    const engine = engineRef.current;
    stopHardware(engine);
    revokeAudioUrl(engine);
    engine.samples = [];
    engine.peak = 0;
    engine.phase = "idle";
    const frame = window.requestAnimationFrame(() => {
      setState(IDLE);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, revokeAudioUrl, stopHardware]);

  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      stopHardware(engine);
      revokeAudioUrl(engine);
    };
  }, [revokeAudioUrl, stopHardware]);

  const start = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      engineRef.current.phase = "unsupported";
      setState((prev) => ({ ...prev, phase: "unsupported" }));
      return;
    }

    const engine = engineRef.current;
    stopHardware(engine);
    revokeAudioUrl(engine);
    engine.samples = [];
    engine.peak = 0;
    engine.chunks = [];
    engine.phase = "requesting";
    setState({
      ...IDLE,
      phase: "requesting",
      reading: null,
      audioUrl: null,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      engine.stream = stream;

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const context = new AudioContextCtor();
      engine.context = context;
      if (context.state === "suspended") {
        await context.resume();
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      engine.analyser = analyser;

      if (typeof MediaRecorder !== "undefined") {
        const mimeType = MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus",
        )
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        engine.recorder = recorder;
        engine.chunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            engine.chunks.push(event.data);
          }
        };
        recorder.onstop = () => {
          if (engine.chunks.length === 0) {
            return;
          }
          const blob = new Blob(engine.chunks, {
            type: recorder.mimeType || "audio/webm",
          });
          revokeAudioUrl(engine);
          const url = URL.createObjectURL(blob);
          engine.audioUrl = url;
          setState((prev) => ({ ...prev, audioUrl: url }));
        };
        recorder.start(250);
      }

      engine.startedAt = Date.now();
      engine.phase = "recording";
      setState((prev) => ({
        ...prev,
        phase: "recording",
        secondsLeft: MEASURE_SECONDS,
      }));

      const tick = () => {
        const current = engineRef.current;
        const node = current.analyser;
        if (!node || current.phase !== "recording") {
          return;
        }

        const buffer = new Float32Array(node.fftSize);
        node.getFloatTimeDomainData(buffer);
        const db = rmsToDb(computeRms(buffer));
        current.samples.push(db);
        current.peak = Math.max(current.peak, db);

        const recent = current.samples.slice(-WAVEFORM_BARS);
        const levels = Array.from({ length: WAVEFORM_BARS }, (_, index) => {
          const sample = recent[index] ?? recent[recent.length - 1] ?? DB_FLOOR;
          return Math.max(0.08, Math.min(1, (sample - 30) / 70));
        });

        const avg =
          current.samples.reduce((sum, value) => sum + value, 0) /
          Math.max(1, current.samples.length);
        const elapsed = (Date.now() - current.startedAt) / 1000;
        const secondsLeft = Math.max(0, Math.ceil(MEASURE_SECONDS - elapsed));

        setState((prev) => ({
          ...prev,
          phase: "recording",
          liveDb: roundDb(db),
          peakDb: roundDb(current.peak),
          avgDb: roundDb(avg),
          secondsLeft,
          levels,
        }));

        if (elapsed >= MEASURE_SECONDS) {
          finishRecording();
          return;
        }

        current.raf = requestAnimationFrame(tick);
      };

      engine.raf = requestAnimationFrame(tick);
    } catch (error) {
      stopHardware(engine);
      const name = error instanceof DOMException ? error.name : "Error";
      const phase =
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "denied"
          : "error";
      engine.phase = phase;
      setState((prev) => ({
        ...prev,
        phase,
      }));
    }
  }, [finishRecording, revokeAudioUrl, stopHardware]);

  const stop = useCallback(() => {
    finishRecording();
  }, [finishRecording]);

  return {
    ...state,
    start,
    stop,
    reset,
  };
}
