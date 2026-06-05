"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Play, Pause, RotateCcw, Timer as TimerIcon, Minimize2, Maximize2 } from "lucide-react";

interface StudyTimerProps {
  defaultMinutes?: number;
  label?: string;
  compact?: boolean;
  /** When set, timer state (duration, remaining, running, lastTick) is persisted to localStorage. */
  storageKey?: string;
  onRunningChange?: (running: boolean) => void;
  onComplete?: () => void;
}

export interface StudyTimerHandle {
  start: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  isRunning: () => boolean;
}

type PersistedState = {
  duration: number;
  remaining: number;
  running: boolean;
  lastTick: number; // epoch ms
};

function loadPersisted(key: string | undefined, defaultDuration: number): PersistedState {
  if (!key || typeof window === "undefined") {
    return { duration: defaultDuration, remaining: defaultDuration, running: false, lastTick: Date.now() };
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return { duration: defaultDuration, remaining: defaultDuration, running: false, lastTick: Date.now() };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const duration = Math.max(1, parsed.duration ?? defaultDuration);
    let remaining = Math.max(0, Math.min(duration, parsed.remaining ?? duration));
    let running = !!parsed.running;
    const lastTick = parsed.lastTick ?? Date.now();
    // Advance for elapsed time while we were away.
    if (running) {
      const elapsed = Math.floor((Date.now() - lastTick) / 1000);
      remaining = Math.max(0, remaining - elapsed);
      if (remaining === 0) running = false;
    }
    return { duration, remaining, running, lastTick: Date.now() };
  } catch {
    return { duration: defaultDuration, remaining: defaultDuration, running: false, lastTick: Date.now() };
  }
}

/**
 * Configurable study timer with start/pause/reset and a focus ring that
 * fills as the session progresses. Persists across refresh when `storageKey`
 * is provided, and exposes an imperative handle for external triggers.
 */
export const StudyTimer = forwardRef<StudyTimerHandle, StudyTimerProps>(function StudyTimer(
  { defaultMinutes = 25, label = "Focus session", compact = false, storageKey, onRunningChange, onComplete },
  ref,
) {
  const defaultDuration = defaultMinutes * 60;
  const initial = useRef<PersistedState | null>(null);
  if (initial.current === null) {
    initial.current = loadPersisted(storageKey, defaultDuration);
  }

  const [duration, setDuration] = useState(initial.current.duration);
  const [remaining, setRemaining] = useState(initial.current.remaining);
  const [running, setRunning] = useState(initial.current.running);
  const [collapsed, setCollapsed] = useState(compact);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeFired = useRef(false);

  // Tick loop
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Persist on every change
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const payload: PersistedState = { duration, remaining, running, lastTick: Date.now() };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }, [duration, remaining, running, storageKey]);

  // Notify parent when running flips
  useEffect(() => {
    onRunningChange?.(running);
  }, [running, onRunningChange]);

  // Fire onComplete exactly once per countdown reaching 0
  useEffect(() => {
    if (remaining === 0 && !completeFired.current) {
      completeFired.current = true;
      onComplete?.();
    }
    if (remaining > 0) completeFired.current = false;
  }, [remaining, onComplete]);

  // Re-sync when tab is restored (handles long backgrounding)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible" || !storageKey) return;
      const next = loadPersisted(storageKey, defaultDuration);
      setDuration(next.duration);
      setRemaining(next.remaining);
      setRunning(next.running);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [storageKey, defaultDuration]);

  const setPreset = (mins: number) => {
    setDuration(mins * 60);
    setRemaining(mins * 60);
    setRunning(false);
  };

  const reset = () => {
    setRemaining(duration);
    setRunning(false);
  };

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        setRemaining((r) => (r === 0 ? duration : r));
        setRunning(true);
        setCollapsed(false);
      },
      pause: () => setRunning(false),
      toggle: () => {
        setRemaining((r) => (r === 0 ? duration : r));
        setRunning((v) => !v);
      },
      reset,
      isRunning: () => running,
    }),
    [duration, running],
  );

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const progress = duration === 0 ? 0 : 1 - remaining / duration;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference * (1 - progress);

  if (collapsed) {
    return (
      <div className="inline-flex items-center gap-1 px-1.5 h-9 rounded-lg bg-surface-raised border border-border/40">
        <button
          onClick={() => {
            setRemaining((r) => (r === 0 ? duration : r));
            setRunning((v) => !v);
          }}
          className="size-6 rounded-md flex items-center justify-center text-foreground hover:bg-surface transition-colors"
          aria-label={running ? "Pause timer" : "Start timer"}
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5 text-primary" />}
        </button>
        <span className="font-mono tabular-nums text-sm font-semibold text-foreground tracking-tight px-1">
          {mins}:{secs}
        </span>
        {running && <span className="size-1.5 rounded-full bg-good animate-pulse" />}
        <button
          onClick={() => setCollapsed(false)}
          className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          aria-label="Expand timer"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface border border-border/40 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <TimerIcon className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{label}</div>
            <div className="text-[11px] text-muted-foreground">Pomodoro-style sprint</div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised flex items-center justify-center"
          aria-label="Minimize timer"
        >
          <Minimize2 className="size-4" />
        </button>
      </div>

      <div className="relative flex items-center justify-center my-2">
        <svg viewBox="0 0 100 100" className="size-44 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-raised" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="url(#timerGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s linear" }}
          />
          <defs>
            <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.18 255)" />
              <stop offset="100%" stopColor="oklch(0.72 0.15 195)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-mono font-bold tabular-nums text-foreground">
            {mins}:{secs}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
            {running ? "Focusing" : remaining === 0 ? "Done" : remaining < duration ? "Paused" : "Ready"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => {
            setRemaining((r) => (r === 0 ? duration : r));
            setRunning((v) => !v);
          }}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Pause" : remaining === 0 ? "Restart" : remaining < duration ? "Resume" : "Start"}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center size-10 rounded-lg bg-surface-raised hover:bg-surface-raised/80 text-foreground transition-colors"
          aria-label="Reset"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-border/30">
        {[15, 25, 45, 60].map((m) => (
          <button
            key={m}
            onClick={() => setPreset(m)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-colors ${
              duration === m * 60
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  );
});
