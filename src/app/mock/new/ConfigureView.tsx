"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Globe2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Mic,
  Image as ImageIcon,
  Type,
  Clock,
  ShieldAlert,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AIButton } from "@/components/ui/AIButton";
import { MockGeneratingSkeleton } from "@/components/mock/MockSkeletons";
import { sectionTotal } from "@/lib/mock/validate-config";

const INSTITUTIONS = ["IIT Bombay", "IIT Delhi", "IIT Madras", "NIT Trichy", "BITS Pilani", "DU NCWEB", "Anna University"];
const TOPICS = ["Algorithms", "DBMS", "Operating Systems", "Computer Networks", "Compilers", "Machine Learning", "System Design"];
const BLOOM = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

type Modality = "text" | "voice" | "image";
const MULT: Record<Modality, number> = { text: 1, voice: 0.75, image: 1.4 };

const STEPS = ["Mode", "Scope", "Format", "Modality", "Rules", "Review"] as const;

export function ConfigureView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paperId = searchParams.get("paperId");
  const paperTopic = searchParams.get("topic");
  const initialMode = searchParams.get("mode");
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [topicOptions, setTopicOptions] = useState<string[]>(TOPICS);

  const [institutionOptions, setInstitutionOptions] = useState<string[]>(INSTITUTIONS);

  useEffect(() => {
    fetch("/api/public/institutions")
      .then((r) => r.json())
      .then((d) => {
        const names = (d.institutions ?? []).map((i: { name: string } | string) =>
          typeof i === "string" ? i : i.name
        );
        if (names.length) setInstitutionOptions(names);
      })
      .catch(() => {});
    fetch("/api/me/topics")
      .then((r) => r.json())
      .then((d) => {
        const names = (d.topics ?? []).map((t: { name: string }) => t.name);
        if (names.length) setTopicOptions(names);
      })
      .catch(() => {});
    if (paperTopic) setTopics([paperTopic]);
  }, [paperTopic]);

  useEffect(() => {
    if (initialMode === "institutional") setMode("institutional");
    if (initialMode === "global") setMode("global");
  }, [initialMode]);

  // ---- form state ----
  const [mode, setMode] = useState<"global" | "institutional">(
    initialMode === "institutional" ? "institutional" : "global"
  );
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [instQuery, setInstQuery] = useState("");
  const [topics, setTopics] = useState<string[]>(["Algorithms"]);
  const [bloom, setBloom] = useState<string[]>(["Apply", "Analyze"]);
  const [yearFrom, setYearFrom] = useState(2019);
  const [yearTo, setYearTo] = useState(2024);
  const [count, setCount] = useState(20);
  const [sections, setSections] = useState({ mcq: 8, short: 8, long: 4, numerical: 0 });
  const [modality, setModality] = useState<Modality>("text");
  const [mixed, setMixed] = useState(false);
  const [strict, setStrict] = useState(true);
  const [shuffle, setShuffle] = useState(true);
  const [negative, setNegative] = useState(false);
  const [calc, setCalc] = useState(true);
  const [webcam, setWebcam] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);

  const baselineMin = useMemo(
    () => sections.mcq * 1.5 + sections.short * 4 + sections.long * 12 + sections.numerical * 3,
    [sections],
  );
  const totalMin = Math.round(baselineMin * MULT[modality]);

  const filteredInst = institutionOptions.filter((i) => i.toLowerCase().includes(instQuery.toLowerCase()) && !institutions.includes(i));

  const sectionSum = sectionTotal(sections);

  const handleCountChange = (newCount: number) => {
    setCount(newCount);
    const prev = sectionTotal(sections) || 1;
    const ratio = newCount / prev;
    setSections({
      mcq: Math.max(0, Math.round(sections.mcq * ratio)),
      short: Math.max(0, Math.round(sections.short * ratio)),
      long: Math.max(0, Math.round(sections.long * ratio)),
      numerical: Math.max(0, Math.round(sections.numerical * ratio)),
    });
  };

  const handleStart = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/ai/mock/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          institutions,
          topics: topics.length ? topics : ["General"],
          bloom,
          yearFrom,
          yearTo,
          sections,
          modality,
          mixed,
          rules: { strict, shuffle, negative, calculator: calc, fullscreen, webcam },
          duration: totalMin,
          paperId: paperId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mock generation failed");
      if (!data.attemptId) throw new Error("No attempt was created");
      router.push(`/mock/exam/${data.attemptId}`);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Mock generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <MockGeneratingSkeleton />
          <p className="text-center text-sm text-muted-foreground -mt-8">Generating your mock exam…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  i === step
                    ? "bg-primary text-primary-foreground border-primary"
                    : i < step
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-surface text-muted-foreground border-border/40"
                }`}
              >
                <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-mono ${i <= step ? "bg-background/30" : "bg-surface-raised"}`}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border/40 bg-surface p-5 sm:p-8 step-morph" key={step}>
            {step === 0 && (
              <div>
                <StepHeader title="Pick exam mode" sub="Choose how the question pool is built." />
                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  <BigChoice active={mode === "global"} onClick={() => setMode("global")} icon={Globe2} title="Global" desc="Curated pool covering every aspect of the topic." />
                  <BigChoice active={mode === "institutional"} onClick={() => setMode("institutional")} icon={Building2} title="Institutional" desc="Modelled on past papers via RAG." />
                </div>
                {mode === "institutional" && (
                  <div className="mt-6">
                    <Label>Institutions (one or more)</Label>
                    <div className="mt-2 rounded-xl border border-border/40 bg-surface-raised/40 p-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {institutions.map((i) => (
                          <Chip key={i} onRemove={() => setInstitutions(institutions.filter((x) => x !== i))}>{i}</Chip>
                        ))}
                        {institutions.length === 0 && <span className="text-xs text-muted-foreground">None selected — searches the global past-paper pool</span>}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                          value={instQuery}
                          onChange={(e) => setInstQuery(e.target.value)}
                          placeholder="Search institutions…"
                          className="w-full h-9 pl-9 pr-3 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:border-primary/40"
                        />
                      </div>
                      {instQuery && (
                        <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                          {filteredInst.map((i) => (
                            <button
                              key={i}
                              onClick={() => { setInstitutions([...institutions, i]); setInstQuery(""); }}
                              className="w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-surface-raised"
                            >{i}</button>
                          ))}
                          {filteredInst.length === 0 && <div className="px-3 py-1.5 text-xs text-muted-foreground">No matches</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <StepHeader title="Topic & scope" sub="Narrow down what the AI should pull from." />
                <Label className="mt-5">Topics</Label>
                <ChipGrid items={topicOptions} selected={topics} onToggle={(t) => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])} />
                <Label className="mt-5">Bloom levels</Label>
                <ChipGrid items={BLOOM} selected={bloom} onToggle={(t) => setBloom(bloom.includes(t) ? bloom.filter((x) => x !== t) : [...bloom, t])} />
                {mode === "institutional" && (
                  <>
                    <Label className="mt-5">Year range</Label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <NumberField label="From" value={yearFrom} onChange={setYearFrom} min={2010} max={2025} />
                      <NumberField label="To" value={yearTo} onChange={setYearTo} min={2010} max={2025} />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <StepHeader title="Format" sub="Question count and section mix." />
                <Label className="mt-5">Total questions: <span className="text-foreground font-semibold tabular-nums">{sectionSum}</span></Label>
                <input type="range" min={5} max={50} value={count} onChange={(e) => handleCountChange(+e.target.value)} className="w-full mt-2 accent-[var(--primary)]" />
                <p className="text-[11px] text-muted-foreground mt-1">Section total: {sectionSum} — adjust sections below or use the slider.</p>
                <Label className="mt-5">Section composition</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <NumberField label="MCQ" value={sections.mcq} onChange={(v) => setSections({ ...sections, mcq: v })} min={0} max={50} />
                  <NumberField label="Short answer" value={sections.short} onChange={(v) => setSections({ ...sections, short: v })} min={0} max={50} />
                  <NumberField label="Long answer" value={sections.long} onChange={(v) => setSections({ ...sections, long: v })} min={0} max={20} />
                  <NumberField label="Numerical" value={sections.numerical} onChange={(v) => setSections({ ...sections, numerical: v })} min={0} max={20} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <StepHeader title="Answer modality" sub="This drives the time budget." />
                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  <ModalityCard active={modality === "text"} onClick={() => setModality("text")} icon={Type} title="Digital text" mult="×1.0" desc="Baseline time. Rich textarea." />
                  <ModalityCard active={modality === "voice"} onClick={() => setModality("voice")} icon={Mic} title="Voice" mult="×0.75" desc="Record + auto-transcript." />
                  <ModalityCard active={modality === "image"} onClick={() => setModality("image")} icon={ImageIcon} title="Handwritten image" mult="×1.4" desc="Capture & OCR." />
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm cursor-pointer">
                  <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} className="mt-0.5 accent-[var(--primary)]" />
                  <span><span className="font-medium">Allow per-question switch</span><br /><span className="text-xs text-muted-foreground">Pick the modality you prefer for each question; total time recomputes live during the exam.</span></span>
                </label>

                {/* Live time budget meter */}
                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold"><Clock className="size-4 text-primary" /> Estimated time budget</span>
                    <span className="font-mono text-xl tabular-nums text-primary">{Math.floor(totalMin / 60)}h {totalMin % 60}m</span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    baseline {Math.round(baselineMin)}m · multiplier {MULT[modality]} ({modality})
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-raised overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.min(100, (totalMin / 180) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepHeader title="Exam rules" sub="Strict mode mirrors a real exam hall." />
                <div className="mt-5 space-y-1">
                  <ToggleRow label="Strict mode" desc="No pause, no copy/paste, single submit" value={strict} onChange={setStrict} icon={ShieldAlert} />
                  <ToggleRow label="Shuffle questions" desc="Random per attempt" value={shuffle} onChange={setShuffle} icon={Layers} />
                  <ToggleRow label="Negative marking" desc="−25% per wrong MCQ" value={negative} onChange={setNegative} icon={ShieldAlert} />
                  <ToggleRow label="Calculator allowed" desc="On-screen scientific calculator" value={calc} onChange={setCalc} icon={Sparkles} />
                  <ToggleRow label="Fullscreen lock" desc="Warns on tab switch / fullscreen exit" value={fullscreen} onChange={setFullscreen} icon={ShieldAlert} />
                  <ToggleRow label="Webcam proctoring" desc="(Optional) On-device, frames discarded after attempt" value={webcam} onChange={setWebcam} icon={ShieldAlert} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <StepHeader title="Review & start" sub="Check the summary, then generate." />
                <div className="mt-5 rounded-xl border border-border/40 divide-y divide-border/30">
                  <SummaryRow label="Mode" value={mode === "global" ? "Global pool" : `Institutional · ${institutions.join(", ") || "any"}`} />
                  <SummaryRow label="Topics" value={topics.join(", ") || "—"} />
                  <SummaryRow label="Bloom" value={bloom.join(", ") || "—"} />
                  {mode === "institutional" && <SummaryRow label="Year range" value={`${yearFrom}–${yearTo}`} />}
                  <SummaryRow label="Sections" value={`MCQ ${sections.mcq} · Short ${sections.short} · Long ${sections.long} · Numerical ${sections.numerical}`} />
                  <SummaryRow label="Modality" value={`${modality}${mixed ? " (switchable)" : ""}`} />
                  <SummaryRow label="Time budget" value={`${Math.floor(totalMin / 60)}h ${totalMin % 60}m`} />
                  <SummaryRow label="Rules" value={[strict && "Strict", shuffle && "Shuffle", negative && "Negative", calc && "Calculator", fullscreen && "Fullscreen", webcam && "Webcam"].filter(Boolean).join(" · ") || "None"} />
                </div>
                {generateError && (
                  <div className="mt-4 p-3 rounded-xl bg-again/10 border border-again/30 text-sm text-again">
                    {generateError}
                  </div>
                )}
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <p className="text-xs text-muted-foreground">By starting you accept the strict-mode rules. Refresh-safe — your progress autosaves.</p>
                  <AIButton size="lg" loading={generating} onClick={handleStart}>Generate mock with AI</AIButton>
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border border-border/40 hover:bg-surface disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next <ChevronRight className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---- atoms ----
function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="text-xl font-bold tracking-tight">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground ${className}`}>{children}</div>;
}
function BigChoice({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`text-left p-5 rounded-xl border transition-all ${active ? "border-primary bg-primary/10" : "border-border/40 bg-surface-raised/40 hover:border-primary/40"}`}>
      <Icon className={`size-7 mb-3 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div className="text-base font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
function ModalityCard({ active, onClick, icon: Icon, title, mult, desc }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string; mult: string; desc: string }) {
  return (
    <button onClick={onClick} className={`text-left p-4 rounded-xl border transition-all ${active ? "border-primary bg-primary/10" : "border-border/40 bg-surface-raised/40 hover:border-primary/40"}`}>
      <div className="flex items-center justify-between">
        <Icon className={`size-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised">{mult}</span>
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}
function ChipGrid({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (s: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((i) => {
        const active = selected.includes(i);
        return (
          <button key={i} onClick={() => onToggle(i)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "border-primary bg-primary/15 text-primary" : "border-border/40 bg-surface text-muted-foreground hover:text-foreground"}`}>
            {i}
          </button>
        );
      })}
    </div>
  );
}
function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
      {children}
      <button onClick={onRemove} className="hover:text-foreground">×</button>
    </span>
  );
}
function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-raised/40 border border-border/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="w-16 h-7 rounded bg-background border border-border/40 text-sm text-right px-2 tabular-nums focus:outline-none focus:border-primary/40" />
    </label>
  );
}
function ToggleRow({ label, desc, value, onChange, icon: Icon }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-raised/40 cursor-pointer">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-surface-raised"}`}>
        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-foreground transition-transform ${value ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-3">
      <div className="w-32 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex-1 text-sm">{value}</div>
    </div>
  );
}
