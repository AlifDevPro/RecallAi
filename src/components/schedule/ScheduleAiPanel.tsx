"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, CalendarDays, UserCircle } from "lucide-react";

export type ScheduleGenerateParams = {
  scope: "day" | "week";
  mode: "narrative" | "profile";
  narrative?: string;
  saveNarrative?: boolean;
};

type ScheduleAiPanelProps = {
  narrative: string;
  onNarrativeChange: (value: string) => void;
  saveNarrative: boolean;
  onSaveNarrativeChange: (value: boolean) => void;
  loading: boolean;
  onGenerate: (params: ScheduleGenerateParams) => Promise<void>;
  welcomeMode?: boolean;
};

export function ScheduleAiPanel({
  narrative,
  onNarrativeChange,
  saveNarrative,
  onSaveNarrativeChange,
  loading,
  onGenerate,
  welcomeMode,
}: ScheduleAiPanelProps) {
  const [expanded, setExpanded] = useState(welcomeMode ?? false);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-surface p-5 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-primary mb-1">
            <Sparkles className="size-3.5" />
            AI day planner
          </div>
          <h2 className="text-lg font-semibold">
            {welcomeMode ? "Let's build your first week" : "Describe your routine"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tell the AI your targets, busy hours, exams, and when you want to review. It plans your
            full day — study, work, breaks, and rest — around your retention queue.
          </p>
        </div>
        {!welcomeMode && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {(expanded || welcomeMode) && (
        <>
          <textarea
            value={narrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            rows={4}
            placeholder="Example: I work 9–5 Mon–Fri, gym at 7am, want 1.5h review before bed. DBMS exam in 3 weeks — prioritize weak topics. No study after 9pm on weekdays."
            className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={saveNarrative}
              onChange={(e) => onSaveNarrativeChange(e.target.checked)}
              className="rounded border-border"
            />
            Save this description for next time
          </label>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void onGenerate({
                  scope: "day",
                  mode: "narrative",
                  narrative: narrative.trim() || undefined,
                  saveNarrative,
                })
              }
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Plan this day
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void onGenerate({
                  scope: "week",
                  mode: "narrative",
                  narrative: narrative.trim() || undefined,
                  saveNarrative,
                })
              }
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-raised border border-border/40 text-sm font-semibold hover:bg-surface disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
              Plan full week
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void onGenerate({
                  scope: "day",
                  mode: "profile",
                })
              }
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-raised border border-border/40 text-sm font-medium hover:bg-surface disabled:opacity-50"
            >
              <UserCircle className="size-4" />
              Auto-plan today (profile)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void onGenerate({
                  scope: "week",
                  mode: "profile",
                })
              }
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-surface-raised border border-border/40 text-sm font-medium hover:bg-surface disabled:opacity-50"
            >
              <UserCircle className="size-4" />
              Auto-plan week (profile)
            </button>
          </div>
        </>
      )}
    </section>
  );
}
