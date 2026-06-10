"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/hooks/use-user";
import {
  BrainCircuit,
  Target,
  Clock,
  CalendarDays,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
  Briefcase,
  Code2,
  Languages,
  Stethoscope,
  FlaskConical,
  BookOpen,
  Loader2,
} from "lucide-react";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const GOAL_TEMPLATES = [
  { icon: Stethoscope, label: "Medical exam", hint: "USMLE, NEET, MCAT" },
  { icon: Code2, label: "Tech interview", hint: "System design, DSA" },
  { icon: Languages, label: "Language fluency", hint: "Spanish, French, Japanese" },
  { icon: FlaskConical, label: "Science mastery", hint: "Chemistry, biology, physics" },
  { icon: Briefcase, label: "Professional cert", hint: "PMP, CPA, AWS" },
  { icon: BookOpen, label: "Academic course", hint: "University, K-12" },
  { icon: GraduationCap, label: "Personal growth", hint: "Anything you choose" },
];

const TIME_OPTIONS = [
  { hours: 0.5, label: "Light", desc: "Quick daily touch-ups" },
  { hours: 1, label: "Balanced", desc: "Best for most learners" },
  { hours: 1.5, label: "Focused", desc: "Steady exam prep" },
  { hours: 2, label: "Deep work", desc: "Intensive mastery" },
];

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEVELS = [
  { label: "Beginner", desc: "Brand new to this topic" },
  { label: "Intermediate", desc: "Know the basics" },
  { label: "Advanced", desc: "Polishing mastery" },
];

const STEP_META = [
  { icon: BrainCircuit, accent: "from-accent to-primary", label: "Identity" },
  { icon: Target, accent: "from-primary to-good", label: "Goal" },
  { icon: GraduationCap, accent: "from-good to-accent", label: "Level" },
  { icon: Clock, accent: "from-accent to-primary", label: "Time" },
  { icon: CalendarDays, accent: "from-primary to-easy", label: "Days" },
  { icon: Sparkles, accent: "from-easy to-primary", label: "Plan" },
];

function levelToApi(level: string): "beginner" | "intermediate" | "advanced" {
  const l = level.toLowerCase();
  if (l === "beginner" || l === "intermediate" || l === "advanced") return l;
  return "intermediate";
}

export function OnboardingView() {
  const router = useRouter();
  const { user, displayName, email: userEmail } = useUser();
  const [step, setStep] = useState<Step>(0);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Profile
  const [goalTemplate, setGoalTemplate] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [level, setLevel] = useState("Intermediate");
  const [hours, setHours] = useState(1);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (displayName && !name) setName(displayName);
    if (userEmail && !email) setEmail(userEmail);
    if (user?.user_metadata?.full_name && !name) {
      setName(user.user_metadata.full_name as string);
    }
  }, [displayName, userEmail, user, name, email]);

  const totalSteps = 6;
  const progress = ((step + 1) / totalSteps) * 100;

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return goal.trim().length > 2;
    if (step === 2) return !!level;
    if (step === 3) return hours > 0;
    if (step === 4) return days.length > 0;
    return true;
  }, [step, name, goal, level, hours, days]);


  const totalCards = Math.round((hours * 60 / 5) * days.length * 4);
  const weeksToGoal = deadline
    ? Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)))
    : 8;

  async function submitOnboarding(skip = false) {
    setFinishError(null);
    setGenerating(true);
    const body = {
      name: name || displayName,
      goal: skip ? "Get started" : goal,
      goalTemplate: goalTemplate ?? "",
      level: skip ? "beginner" : levelToApi(level),
      hoursPerDay: skip ? 0.5 : hours,
      days: skip ? [1, 3, 5] : days,
      deadline: skip ? null : deadline || null,
      skip,
    };

    try {
      const res = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save your plan");
      }
      setTimeout(() => {
        router.push("/schedule?welcome=1");
        router.refresh();
      }, 2600);
    } catch (e) {
      setGenerating(false);
      setFinishError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function handleFinish() {
    void submitOnboarding(false);
  }

  function handleSkip() {
    void submitOnboarding(true);
  }

  function toggleDay(i: number) {
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));
  }

  if (generating) {
    return <GeneratingScreen name={name} goal={goal} hours={hours} days={days.length} />;
  }

  const Meta = STEP_META[step];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Morphing ambient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -top-32 -left-32 size-[520px] bg-gradient-to-br ${Meta.accent} opacity-[0.18] blur-3xl morph-blob`}
        />
        <div
          className={`absolute -bottom-40 -right-32 size-[460px] bg-gradient-to-tr ${Meta.accent} opacity-[0.12] blur-3xl morph-blob`}
          style={{ animationDelay: "-6s", animationDuration: "18s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_85%)]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-8 lg:py-12">
        {/* Brand */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="relative size-9 rounded-xl bg-primary flex items-center justify-center">
              <BrainCircuit className="size-4.5 text-primary-foreground" />
              <span className="absolute inset-0 rounded-xl border border-primary/60 pulse-ring" />
            </div>
            <span className="font-bold text-lg tracking-tight">Recall AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Already have an account? <span className="text-primary font-semibold">Sign in</span>
            </Link>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip setup
            </button>
          </div>

        </div>

        {/* Step pill rail (morphs between steps) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Meta.icon className="size-3.5 text-primary" />
              {Meta.label} · Step {step + 1} of {totalSteps}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="flex gap-1.5">
            {STEP_META.map((m, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full overflow-hidden transition-all duration-500 ${
                    done ? "bg-primary/70" : active ? "bg-surface-raised" : "bg-surface"
                  }`}
                >
                  {active && (
                    <div className={`h-full w-full bg-gradient-to-r ${m.accent} relative overflow-hidden`}>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-x" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content — keyed so it remounts with morph animation */}
        <div className="min-h-[460px]" key={step}>
          <div className="step-morph">

            {step === 0 && (
              <StepShell
                eyebrow="Welcome"
                icon={BrainCircuit}
                title="Let's build a plan that fits your brain."
                desc="Two minutes now saves you hours of forgotten material later."
              >
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  What should we call you?
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Alex"
                  className="w-full h-14 px-5 rounded-xl bg-surface border border-border/40 text-lg focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-3">
                  Signed in as <span className="text-foreground font-medium">{email || "—"}</span>
                </p>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell
                eyebrow="Your goal"
                icon={Target}
                title="What do you want to remember?"
                desc="Pick a template or describe your own. Be specific — vague goals create vague plans."
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                  {GOAL_TEMPLATES.map((t) => {
                    const active = goalTemplate === t.label;
                    return (
                      <button
                        key={t.label}
                        onClick={() => {
                          setGoalTemplate(t.label);
                          if (!goal) setGoal(t.label + " — " + t.hint);
                        }}
                        className={`group flex flex-col items-start gap-2 p-3 rounded-xl border transition-all text-left ${
                          active
                            ? "bg-primary/10 border-primary/50"
                            : "bg-surface border-border/30 hover:border-border/60"
                        }`}
                      >
                        <t.icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <div className="text-xs font-semibold">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.hint}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Describe your goal</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Pass the USMLE Step 1 by August with confidence in pharmacology."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border/40 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
                <label className="block text-sm font-medium mt-5 mb-2 text-muted-foreground">
                  Target date <span className="text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full sm:w-64 h-11 px-4 rounded-xl bg-surface border border-border/40 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                eyebrow="Starting point"
                icon={GraduationCap}
                title="Where are you starting from?"
                desc="We use this to set initial difficulty — you can change it anytime."
              >
                <div className="space-y-2">
                  {LEVELS.map((l) => {
                    const active = level === l.label;
                    return (
                      <button
                        key={l.label}
                        onClick={() => setLevel(l.label)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                          active
                            ? "bg-primary/10 border-primary/50"
                            : "bg-surface border-border/30 hover:border-border/60"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm">{l.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
                        </div>
                        <div
                          className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            active ? "border-primary bg-primary" : "border-border"
                          }`}
                        >
                          {active && <Check className="size-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell
                eyebrow="Time availability"
                icon={Clock}
                title="How many hours per day for study?"
                desc="Pick a realistic number. Consistency beats intensity every time."
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {TIME_OPTIONS.map((t) => {
                    const active = hours === t.hours;
                    return (
                      <button
                        key={t.hours}
                        onClick={() => setHours(t.hours)}
                        className={`p-4 rounded-xl border transition-all text-left ${
                          active
                            ? "bg-primary/10 border-primary/50"
                            : "bg-surface border-border/30 hover:border-border/60"
                        }`}
                      >
                        <div className={`text-2xl font-bold font-mono ${active ? "text-primary" : ""}`}>
                          {t.hours}
                          <span className="text-xs font-normal text-muted-foreground ml-1">h</span>
                        </div>
                        <div className="text-xs font-medium mt-2">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <label className="block text-sm font-medium mb-3 text-muted-foreground">
                  Custom: <span className="font-mono text-foreground">{hours} h</span>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                  <span>0.5h</span>
                  <span>2h</span>
                  <span>4h</span>
                  <span>6h</span>
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell
                eyebrow="Schedule"
                icon={CalendarDays}
                title="Which days will you study?"
                desc="Tap the days you'll commit to. We'll only schedule reviews then."
              >
                <div className="flex gap-2 justify-center mb-6">
                  {DAYS.map((d, i) => {
                    const active = days.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={`size-14 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface border-border/30 text-muted-foreground hover:border-border/60"
                        }`}
                      >
                        <span>{d}</span>
                        <span className="text-[9px] font-mono mt-0.5 opacity-70">{DAY_LABELS[i].slice(0, 3)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-center">
                  <PresetButton onClick={() => setDays([1, 2, 3, 4, 5])}>Weekdays</PresetButton>
                  <PresetButton onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>Every day</PresetButton>
                  <PresetButton onClick={() => setDays([0, 6])}>Weekends</PresetButton>
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell
                eyebrow="Review"
                icon={Sparkles}
                title="Your personalized plan"
                desc="Here's what we'll build. You can change everything later."
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <PlanStat label="Account" value={email || "—"} />
                  <PlanStat label="Name" value={name || "—"} />
                  <PlanStat label="Daily study time" value={`${hours} h`} mono />
                  <PlanStat label="Days per week" value={`${days.length}/7`} mono />
                  <PlanStat label="Starting level" value={level} />
                  <PlanStat label="Projected cards" value={`~${totalCards}`} mono accent />
                </div>
                <div className="mt-4 p-4 rounded-xl bg-surface border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Goal</div>
                  <div className="text-sm font-medium">{goal || "—"}</div>
                  {deadline && (
                    <div className="text-xs text-muted-foreground mt-2 font-mono">
                      Target: {new Date(deadline).toLocaleDateString()} · ~{weeksToGoal} weeks
                    </div>
                  )}
                </div>
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                    <Sparkles className="size-3.5" />
                    AI will generate
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {[
                      "An initial flashcard deck calibrated to your level",
                      "A review schedule using SM-2 spaced repetition",
                      "Daily quiz prompts to surface weak areas",
                      "A weekly progress digest with retention analytics",
                    ].map((b) => (
                      <li key={b} className="flex items-start gap-2 text-muted-foreground">
                        <Check className="size-3.5 text-good mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </StepShell>
            )}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
            disabled={step === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1) as Step)}
              disabled={!canNext}
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.98] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-x opacity-0 group-hover:opacity-100" />
              <span className="relative inline-flex items-center gap-2">
                Continue
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>

          ) : (
            <div className="flex flex-col items-end gap-2">
              {finishError && (
                <p className="text-sm text-again max-w-xs text-right">{finishError}</p>
              )}
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-95 transition-all active:scale-[0.98]"
              >
                <Sparkles className="size-4" /> Generate my plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  desc,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
        {Icon && <Icon className="size-3.5" />}
        {eyebrow}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xl">{desc}</p>
      <div>{children}</div>
    </div>
  );
}

function PresetButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs rounded-lg bg-surface border border-border/30 hover:border-border/60 transition-colors"
    >
      {children}
    </button>
  );
}

function PlanStat({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border/30">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-bold truncate ${mono ? "font-mono" : ""} ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function GeneratingScreen({
  name,
  goal,
  hours,
  days,
}: {
  name: string;
  goal: string;
  hours: number;
  days: number;
}) {
  const tasks = [
    "Securing your account",
    "Analyzing your goal",
    "Calibrating to your starting level",
    "Building your initial card deck",
    "Setting your review schedule",
    "Preparing your dashboard",
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const i = setInterval(() => {
      setDone((d) => (d < tasks.length ? d + 1 : d));
    }, 420);
    return () => clearInterval(i);
  }, [tasks.length]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[520px] bg-gradient-to-br from-primary to-accent opacity-[0.18] blur-3xl morph-blob" />
      </div>
      <div className="relative max-w-md w-full text-center">
        <div className="relative mx-auto size-20 mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="size-7 text-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Building your plan{name ? `, ${name}` : ""}…
        </h2>
        <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{goal}</p>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {tasks.map((t, i) => {
            const isDone = i < done;
            const isActive = i === done;
            return (
              <div key={t} className="flex items-center gap-3 text-sm">
                <div
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? "bg-good/20 text-good"
                      : isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-raised text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <Check className="size-3" />
                  ) : isActive ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                </div>
                <span className={isDone || isActive ? "text-foreground" : "text-muted-foreground"}>{t}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-[11px] font-mono text-muted-foreground">
          {hours} h/day · {days} days/week
        </div>
      </div>
    </div>
  );
}
