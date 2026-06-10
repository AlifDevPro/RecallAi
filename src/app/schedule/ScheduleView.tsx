"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Zap,
  BookOpen,
  BrainCircuit,
  Coffee,
  Target,
  Dumbbell,
  Briefcase,
  Moon,
  Sun,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Wand2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import {
  ScheduleAiPanel,
  type ScheduleGenerateParams,
} from "@/components/schedule/ScheduleAiPanel";
import {
  DAY_LABELS,
  type BlockKind,
  type ScheduleBlock,
  type ScheduleSummary,
} from "@/lib/schedule/types";
import { aiBlocksToScheduleBlocks, parseAiScheduleBlocks } from "@/lib/schedule/map-ai-blocks";
import {
  minutesOf,
  normalizeTime,
  validateScheduleBlocks,
} from "@/lib/schedule/validate-blocks";

const kindMeta: Record<
  BlockKind,
  { label: string; icon: typeof Zap; color: string; bg: string; ring: string; bar: string }
> = {
  review: { label: "Spaced Review", icon: Zap, color: "text-primary", bg: "bg-primary/10", ring: "ring-primary/30", bar: "bg-primary" },
  learn: { label: "New Learning", icon: BookOpen, color: "text-accent", bg: "bg-accent/10", ring: "ring-accent/30", bar: "bg-accent" },
  recall: { label: "Active Recall", icon: BrainCircuit, color: "text-good", bg: "bg-good/10", ring: "ring-good/30", bar: "bg-good" },
  personal: { label: "Personal Goal", icon: Target, color: "text-hard", bg: "bg-hard/10", ring: "ring-hard/30", bar: "bg-hard" },
  work: { label: "Work / Focus", icon: Briefcase, color: "text-foreground", bg: "bg-surface-raised", ring: "ring-border", bar: "bg-muted-foreground" },
  break: { label: "Break", icon: Coffee, color: "text-muted-foreground", bg: "bg-muted/40", ring: "ring-border", bar: "bg-muted-foreground/50" },
  fitness: { label: "Movement", icon: Dumbbell, color: "text-easy", bg: "bg-easy/10", ring: "ring-easy/30", bar: "bg-easy" },
  sleep: { label: "Rest", icon: Moon, color: "text-muted-foreground", bg: "bg-surface", ring: "ring-border", bar: "bg-muted-foreground/30" },
};

function durationOf(b: ScheduleBlock) {
  let d = minutesOf(b.end) - minutesOf(b.start);
  if (d <= 0) d += 24 * 60;
  return d;
}

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

async function fetchSchedule(day: number): Promise<ScheduleBlock[]> {
  const res = await fetch(`/api/me/schedule?day=${day}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `Failed to load schedule (${res.status})`);
  }
  const data = await res.json();
  return (data.blocks ?? []) as ScheduleBlock[];
}

async function fetchSummary(day: number): Promise<ScheduleSummary> {
  const res = await fetch(`/api/me/schedule/summary?day=${day}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `Failed to load summary (${res.status})`);
  }
  return res.json();
}

async function putSchedule(day: number, blocks: ScheduleBlock[]) {
  const res = await fetch("/api/me/schedule", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day, blocks }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to save schedule");
  }
}

function ScheduleSkeleton() {
  return (
    <div className="max-w-[1500px] mx-auto px-5 lg:px-10 py-8 lg:py-10 space-y-8 animate-pulse">
      <div className="flex justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="h-3 w-32 bg-surface-raised rounded" />
          <div className="h-10 w-72 bg-surface-raised rounded" />
          <div className="h-4 w-full max-w-xl bg-surface-raised rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-36 bg-surface-raised rounded-xl" />
          <div className="h-11 w-44 bg-surface-raised rounded-xl" />
        </div>
      </div>
      <div className="h-20 bg-surface-dim rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface-dim rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-dim rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-surface-dim rounded-2xl" />
          <div className="h-32 bg-surface-dim rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

type SchedulePreferences = {
  hoursPerDay: number;
  scheduleNarrative: string;
};

async function fetchPreferences(): Promise<SchedulePreferences> {
  const res = await fetch("/api/me/schedule/preferences");
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? "Failed to load preferences");
  }
  return res.json() as Promise<SchedulePreferences>;
}

export function ScheduleView() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const welcomeMode = searchParams.get("welcome") === "1";
  const today = new Date().getDay();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(today);
  const [plan, setPlan] = useState<ScheduleBlock[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [hydratedDay, setHydratedDay] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");
  const [saveNarrative, setSaveNarrative] = useState(true);
  const [narrativeHydrated, setNarrativeHydrated] = useState(false);
  const [filter, setFilter] = useState<BlockKind | "all">("all");
  const [editing, setEditing] = useState<ScheduleBlock | null>(null);
  const [creating, setCreating] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const scheduleQuery = useQuery({
    queryKey: ["schedule", selectedDay],
    queryFn: () => fetchSchedule(selectedDay),
  });

  const summaryQuery = useQuery({
    queryKey: ["schedule-summary", selectedDay],
    queryFn: () => fetchSummary(selectedDay),
  });

  const preferencesQuery = useQuery({
    queryKey: ["schedule-preferences"],
    queryFn: fetchPreferences,
  });

  useEffect(() => {
    if (preferencesQuery.data && !narrativeHydrated) {
      setNarrative(preferencesQuery.data.scheduleNarrative ?? "");
      setNarrativeHydrated(true);
    }
  }, [preferencesQuery.data, narrativeHydrated]);

  useEffect(() => {
    if (scheduleQuery.isSuccess) {
      setPlan(scheduleQuery.data);
      setHydratedDay(selectedDay);
      setIsDirty(false);
      setFetchError(null);
    }
    if (scheduleQuery.isError) {
      setFetchError(scheduleQuery.error instanceof Error ? scheduleQuery.error.message : "Failed to load");
      setPlan([]);
    }
  }, [scheduleQuery.isSuccess, scheduleQuery.isError, scheduleQuery.data, selectedDay, scheduleQuery.error]);

  const persistPlan = useCallback(
    async (day: number, blocks: ScheduleBlock[]) => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await putSchedule(day, blocks);
        setSaveStatus("saved");
        queryClient.invalidateQueries({ queryKey: ["schedule-summary", day] });
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setSaveStatus("error");
        setSaveError(e instanceof Error ? e.message : "Save failed");
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!isDirty || hydratedDay !== selectedDay) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistPlan(selectedDay, plan);
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [plan, selectedDay, isDirty, hydratedDay, persistPlan]);

  const mutatePlan = (updater: (prev: ScheduleBlock[]) => ScheduleBlock[]) => {
    setPlan(updater);
    setIsDirty(true);
  };

  const switchDay = async (nextDay: number) => {
    if (isDirty && hydratedDay === selectedDay) {
      await persistPlan(selectedDay, plan);
    }
    setSelectedDay(nextDay);
    setIsDirty(false);
    setFilter("all");
    setAiError(null);
  };

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    plan.forEach((b) => {
      t[b.kind] = (t[b.kind] || 0) + durationOf(b);
    });
    return t;
  }, [plan]);

  const learningMinutes = (totals.review || 0) + (totals.learn || 0) + (totals.recall || 0);
  const filtered = filter === "all" ? plan : plan.filter((b) => b.kind === filter);
  const summary = summaryQuery.data;
  const loading = scheduleQuery.isLoading || summaryQuery.isLoading;

  const clearCompleted = () => {
    if (!confirm("Clear all completed checkmarks for this day?")) return;
    mutatePlan((p) => p.map((b) => ({ ...b, done: false })));
  };

  const handleAiGenerate = async (params: ScheduleGenerateParams) => {
    setAiRegenerating(true);
    setAiError(null);
    setAiSuccess(null);
    try {
      const res = await fetch("/api/ai/schedule/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: params.scope === "day" ? selectedDay : undefined,
          scope: params.scope,
          mode: params.mode,
          narrative: params.narrative,
          saveNarrative: params.saveNarrative,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg =
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error ?? "AI generation failed");
        throw new Error(errMsg);
      }

      const aiBlocks = parseAiScheduleBlocks(data.schedule);

      if (params.scope === "week") {
        let totalBlocks = 0;
        for (let d = 0; d <= 6; d++) {
          const mapped = aiBlocksToScheduleBlocks(aiBlocks, d);
          totalBlocks += mapped.length;
          await putSchedule(d, mapped);
          queryClient.invalidateQueries({ queryKey: ["schedule", d] });
          queryClient.invalidateQueries({ queryKey: ["schedule-summary", d] });
        }
        const mappedToday = aiBlocksToScheduleBlocks(aiBlocks, selectedDay);
        setPlan(mappedToday);
        setHydratedDay(selectedDay);
        setIsDirty(false);
        setAiSuccess(`Generated ${totalBlocks} blocks across the week — saved.`);
      } else {
        const mapped = aiBlocksToScheduleBlocks(aiBlocks, selectedDay);
        if (mapped.length === 0) throw new Error("No blocks generated for this day");
        setPlan(mapped);
        setIsDirty(true);
        await persistPlan(selectedDay, mapped);
        setAiSuccess(`Generated ${mapped.length} blocks — saved.`);
      }

      if (params.saveNarrative) {
        queryClient.invalidateQueries({ queryKey: ["schedule-preferences"] });
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI generation failed");
    } finally {
      setAiRegenerating(false);
    }
  };

  const toggleDone = (id: string) => {
    mutatePlan((p) => p.map((b) => (b.id === id ? { ...b, done: !b.done } : b)));
  };

  const removeBlock = (id: string) => mutatePlan((p) => p.filter((b) => b.id !== id));

  const moveBlock = (id: string, dir: -1 | 1) => {
    mutatePlan((p) => {
      const idx = p.findIndex((b) => b.id === id);
      if (idx < 0) return p;
      const next = idx + dir;
      if (next < 0 || next >= p.length) return p;
      const copy = [...p];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  };

  const saveBlock = (b: ScheduleBlock) => {
    mutatePlan((p) => {
      const exists = p.find((x) => x.id === b.id);
      if (exists) return p.map((x) => (x.id === b.id ? b : x));
      return [...p, b].sort((a, c) => minutesOf(a.start) - minutesOf(c.start));
    });
    setEditing(null);
    setCreating(false);
  };

  const wakeSleepLabel =
    summary?.wakeTime && summary?.sleepTime
      ? `${summary.wakeTime} → ${summary.sleepTime}`
      : "—";

  if (loading && hydratedDay !== selectedDay) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <ScheduleSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-[1500px] mx-auto px-5 lg:px-10 py-8 lg:py-10 space-y-8">
          {fetchError && (
            <div className="p-4 rounded-xl bg-again/10 border border-again/30 flex items-center justify-between gap-4">
              <p className="text-sm text-again">{fetchError}</p>
              <button
                type="button"
                onClick={() => scheduleQuery.refetch()}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {saveError && (
            <div className="p-4 rounded-xl bg-again/10 border border-again/30 flex items-center justify-between gap-4">
              <p className="text-sm text-again">{saveError}</p>
              <button
                type="button"
                onClick={() => void persistPlan(selectedDay, plan)}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                Retry save
              </button>
            </div>
          )}

          {aiError && (
            <div className="p-4 rounded-xl bg-again/10 border border-again/30 flex items-center justify-between gap-4">
              <p className="text-sm text-again">{aiError}</p>
            </div>
          )}

          {aiSuccess && (
            <div className="p-4 rounded-xl bg-good/10 border border-good/30">
              <p className="text-sm text-good">{aiSuccess}</p>
            </div>
          )}

          <ScheduleAiPanel
            narrative={narrative}
            onNarrativeChange={setNarrative}
            saveNarrative={saveNarrative}
            onSaveNarrativeChange={setSaveNarrative}
            loading={aiRegenerating}
            onGenerate={handleAiGenerate}
            welcomeMode={welcomeMode}
          />

          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-primary">
                <Sparkles className="size-3.5" />
                AI-assisted planning
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">Your Schedule</h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Balance reviews, new learning, and recall sprints around your study plan and what&apos;s due.
              </p>
              {saveStatus === "saving" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" /> Saving…
                </p>
              )}
              {saveStatus === "saved" && (
                <p className="text-xs text-good">Saved</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clearCompleted}
                disabled={aiRegenerating}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-surface-raised hover:bg-surface text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className="size-4" /> Clear completed
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleAiGenerate({
                    scope: "day",
                    mode: narrative.trim() ? "narrative" : "profile",
                    narrative: narrative.trim() || undefined,
                    saveNarrative,
                  })
                }
                disabled={aiRegenerating}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {aiRegenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                Regenerate today
              </button>
            </div>
          </header>

          <div className="flex items-center justify-between gap-4 bg-surface-dim rounded-2xl p-3">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="size-10 rounded-lg hover:bg-surface-raised flex items-center justify-center"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex-1 grid grid-cols-7 gap-1.5">
              {DAY_LABELS.map((label, i) => {
                const active = i === selectedDay;
                const date = weekDates[i];
                const isToday =
                  date.toDateString() === new Date().toDateString();
                const isStudyDay = summary?.studyPlan.studyDays.includes(i) ?? true;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void switchDay(i)}
                    className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-surface-raised text-muted-foreground"
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                    {isToday && !active && (
                      <span className="absolute top-1 right-2 size-1.5 rounded-full bg-primary" />
                    )}
                    {!isStudyDay && (
                      <span className="absolute bottom-1 size-1 rounded-full bg-muted-foreground/40" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="size-10 rounded-lg hover:bg-surface-raised flex items-center justify-center"
              aria-label="Next week"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="Learning time"
              value={fmtDuration(learningMinutes)}
              hint={
                summary
                  ? `${summary.studyPlan.hoursPerDay}h budget · ${plan.filter((b) => ["review", "learn", "recall"].includes(b.kind)).length} sessions`
                  : `${plan.filter((b) => ["review", "learn", "recall"].includes(b.kind)).length} sessions today`
              }
              accent="text-primary"
            />
            <StatCard
              icon={Zap}
              label="Cards due"
              value={summary ? String(summary.cardsDue) : "—"}
              hint={
                summary
                  ? `across ${summary.topicsWithDue} topic${summary.topicsWithDue !== 1 ? "s" : ""}`
                  : "loading"
              }
              accent="text-accent"
            />
            <StatCard
              icon={Target}
              label="Personal goals"
              value={`${plan.filter((b) => b.kind === "personal").length}`}
              hint="blocks reserved"
              accent="text-hard"
            />
            <StatCard
              icon={Sun}
              label="Wake → Sleep"
              value={wakeSleepLabel}
              hint={
                summary?.activeWindowMinutes
                  ? `${fmtDuration(summary.activeWindowMinutes)} active window`
                  : "from your blocks"
              }
              accent="text-easy"
            />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="All blocks" count={plan.length} />
            {(Object.keys(kindMeta) as BlockKind[]).map((k) => (
              <FilterPill
                key={k}
                active={filter === k}
                onClick={() => setFilter(k)}
                label={kindMeta[k].label}
                count={plan.filter((b) => b.kind === k).length}
                kind={k}
              />
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-border hover:border-primary hover:text-primary text-sm font-semibold transition-colors"
            >
              <Plus className="size-4" /> Add custom block
            </button>
          </div>

          <section className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-3">
              {scheduleQuery.isFetching && !scheduleQuery.isLoading ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
                  <Loader2 className="size-3 animate-spin" /> Refreshing…
                </p>
              ) : null}
              {filtered.length === 0 ? (
                <div className="p-10 rounded-2xl bg-surface-dim border border-dashed border-border/40 text-center">
                  <p className="text-muted-foreground mb-4">No schedule for this day yet.</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        void handleAiGenerate({
                          scope: "day",
                          mode: narrative.trim() ? "narrative" : "profile",
                          narrative: narrative.trim() || undefined,
                          saveNarrative,
                        })
                      }
                      disabled={aiRegenerating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Wand2 className="size-4" /> Generate with AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-border/50 rounded-xl text-sm font-medium hover:bg-surface-raised"
                    >
                      <Plus className="size-4" /> Add block manually
                    </button>
                  </div>
                </div>
              ) : (
                filtered.map((b) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    canMoveUp={plan.indexOf(b) > 0}
                    canMoveDown={plan.indexOf(b) < plan.length - 1}
                    onToggle={() => toggleDone(b.id)}
                    onEdit={() => setEditing(b)}
                    onDelete={() => removeBlock(b.id)}
                    onMoveUp={() => moveBlock(b.id, -1)}
                    onMoveDown={() => moveBlock(b.id, 1)}
                  />
                ))
              )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 self-start">
              <div className="rounded-2xl bg-surface-dim p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">Day balance</h3>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">24h</span>
                </div>
                <BalanceBar totals={totals} />
                <div className="mt-4 space-y-2.5">
                  {(Object.keys(kindMeta) as BlockKind[]).map((k) => {
                    const mins = totals[k] || 0;
                    if (!mins) return null;
                    const meta = kindMeta[k];
                    const Icon = meta.icon;
                    return (
                      <div key={k} className="flex items-center gap-3 text-sm">
                        <div className={`size-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
                          <Icon className={`size-3.5 ${meta.color}`} />
                        </div>
                        <span className="flex-1 font-medium">{meta.label}</span>
                        <span className="font-mono text-muted-foreground">{fmtDuration(mins)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-5 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 size-28 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-primary mb-2">
                    <Sparkles className="size-3.5" /> Study insight
                  </div>
                  <p className="text-sm leading-relaxed">{summary?.insight ?? "Loading insight…"}</p>
                  <Link href="/analytics" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
                    View analytics →
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-dim p-5">
                <h3 className="text-base font-semibold mb-3">Tomorrow preview</h3>
                <ul className="space-y-2.5 text-sm">
                  {(summary?.tomorrowPreview ?? []).map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span
                        className={`size-2 rounded-full ${
                          item.tone === "primary"
                            ? "bg-primary"
                            : item.tone === "accent"
                              ? "bg-accent"
                              : "bg-good"
                        }`}
                      />
                      <span className="flex-1">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </section>
        </div>
      </main>

      {(editing || creating) && (
        <BlockEditor
          initial={
            editing ?? {
              id: crypto.randomUUID(),
              start: "12:00",
              end: "13:00",
              title: "",
              kind: "personal",
            }
          }
          existingBlocks={plan.filter((b) => b.id !== editing?.id)}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={saveBlock}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-dim p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${accent}`} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl lg:text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  kind,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  kind?: BlockKind;
}) {
  const dot = kind ? kindMeta[kind].bar : "bg-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-foreground text-background" : "bg-surface-dim text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
      <span className={`text-[10px] font-mono ${active ? "opacity-70" : "opacity-50"}`}>{count}</span>
    </button>
  );
}

function BalanceBar({ totals }: { totals: Record<string, number> }) {
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface">
      {(Object.keys(kindMeta) as BlockKind[]).map((k) => {
        const v = totals[k] || 0;
        if (!v) return null;
        const pct = (v / total) * 100;
        return <div key={k} className={kindMeta[k].bar} style={{ width: `${pct}%` }} />;
      })}
    </div>
  );
}

function BlockRow({
  block,
  canMoveUp,
  canMoveDown,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: ScheduleBlock;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = kindMeta[block.kind];
  const Icon = meta.icon;
  return (
    <div
      className={`group relative flex gap-4 rounded-2xl bg-surface-dim hover:bg-surface-dim/70 p-4 lg:p-5 transition-colors ${
        block.done ? "opacity-60" : ""
      }`}
    >
      <div className="w-20 lg:w-24 shrink-0">
        <div className="text-lg lg:text-xl font-bold font-mono tracking-tight tabular-nums">{block.start}</div>
        <div className="text-[11px] font-mono text-muted-foreground tabular-nums">→ {block.end}</div>
        <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">{fmtDuration(durationOf(block))}</div>
      </div>

      <div className={`w-1 rounded-full ${meta.bar} self-stretch`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${meta.bg}`}>
            <Icon className={`size-3 ${meta.color}`} />
            <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          {block.ai && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-primary">
              <Sparkles className="size-2.5" /> AI
            </span>
          )}
          {block.kind === "review" && !block.done && (
            <Link
              href="/review"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              Start review <ArrowRight className="size-2.5" />
            </Link>
          )}
        </div>
        <h3 className="text-lg lg:text-xl font-semibold tracking-tight leading-snug">{block.title}</h3>
        {block.detail && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{block.detail}</p>}
      </div>

      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onToggle} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center" aria-label="Toggle done">
          {block.done ? <CheckCircle2 className="size-4 text-good" /> : <Circle className="size-4 text-muted-foreground" />}
        </button>
        <button type="button" onClick={onEdit} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center" aria-label="Edit">
          <Pencil className="size-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center text-destructive" aria-label="Delete">
          <Trash2 className="size-3.5" />
        </button>
        <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center disabled:opacity-30" aria-label="Move up">
          <ChevronUp className="size-4" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center disabled:opacity-30" aria-label="Move down">
          <ChevronDown className="size-4" />
        </button>
      </div>

      {block.done && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="size-4 text-good" />
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  initial,
  existingBlocks,
  onClose,
  onSave,
}: {
  initial: ScheduleBlock;
  existingBlocks: ScheduleBlock[];
  onClose: () => void;
  onSave: (b: ScheduleBlock) => void;
}) {
  const [b, setB] = useState<ScheduleBlock>(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const normalized: ScheduleBlock = {
      ...b,
      start: normalizeTime(b.start),
      end: normalizeTime(b.end),
      title: b.title.trim(),
    };
    const validation = validateScheduleBlocks(0, [...existingBlocks, normalized]);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setError(null);
    onSave(normalized);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6">
      <div className="w-full lg:max-w-lg bg-card rounded-t-3xl lg:rounded-3xl p-6 lg:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">{initial.title ? "Edit block" : "New block"}</h2>
          <button type="button" onClick={onClose} className="size-9 rounded-lg hover:bg-surface-raised flex items-center justify-center">
            ✕
          </button>
        </div>

        {error && <p className="text-sm text-again">{error}</p>}

        <div className="space-y-4">
          <Field label="Title">
            <input
              value={b.title}
              onChange={(e) => setB({ ...b, title: e.target.value })}
              placeholder="What's this block for?"
              className="w-full h-12 px-4 rounded-xl bg-surface-raised text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input
                type="time"
                value={b.start}
                onChange={(e) => setB({ ...b, start: e.target.value })}
                className="w-full h-12 px-4 rounded-xl bg-surface-raised font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label="End">
              <input
                type="time"
                value={b.end}
                onChange={(e) => setB({ ...b, end: e.target.value })}
                className="w-full h-12 px-4 rounded-xl bg-surface-raised font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </div>

          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(kindMeta) as BlockKind[]).map((k) => {
                const meta = kindMeta[k];
                const Icon = meta.icon;
                const active = b.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setB({ ...b, kind: k })}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? `${meta.bg} ${meta.color} ring-1 ${meta.ring}`
                        : "bg-surface-raised text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={b.detail || ""}
              onChange={(e) => setB({ ...b, detail: e.target.value })}
              rows={3}
              placeholder="Details for this block…"
              className="w-full px-4 py-3 rounded-xl bg-surface-raised text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl bg-surface-raised hover:bg-surface text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!b.title.trim()}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            Save block
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      {children}
    </label>
  );
}
