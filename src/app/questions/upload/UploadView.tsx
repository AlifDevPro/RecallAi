"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Building2,
  Trophy,
  X,
} from "lucide-react";
import { AIButton } from "@/components/ui/AIButton";
import { PublicHeader } from "@/components/layout/PublicHeader";

type Extracted = {
  raw: string;
  cleaned: string;
  inst: string;
  year: number;
  term: string;
  topic: string;
  marks: number;
  type: string;
  conf: { inst: number; year: number; term: number; topic: number; marks: number };
};

const STEPS = ["Upload", "Extract", "Metadata", "Submit"] as const;

export function UploadView() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [extracted, setExtracted] = useState<Extracted[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    institution: "",
    course: "",
    semester: "",
    year: "",
    term: "",
    topic: "",
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [institutionOptions, setInstitutionOptions] = useState<string[]>([]);

  const handleFiles = (fl: FileList | null) => {
    if (!fl) return;
    setFiles((prev) => [...prev, ...Array.from(fl)]);
  };

  const runExtract = async () => {
    setExtracting(true);
    setError(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      const res = await fetch("/api/ai/questions/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      setExtracted(data.extracted ?? []);
      setFilePaths(data.filePaths ?? []);
      if (data.extracted?.[0]) {
        setMetadata((m) => ({
          ...m,
          institution: data.extracted[0].inst ?? m.institution,
          year: String(data.extracted[0].year ?? m.year),
          term: data.extracted[0].term ?? m.term,
          topic: data.extracted[0].topic ?? m.topic,
        }));
      }
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const submitBatch = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/questions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extracted,
          filePaths,
          metadata: {
            institution: metadata.institution,
            course: metadata.course,
            semester: metadata.semester,
            year: metadata.year ? Number(metadata.year) : undefined,
            term: metadata.term,
            topic: metadata.topic,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setSubmissionId(data.submissionId ?? null);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${i === step ? "bg-primary text-primary-foreground border-primary" : i < step ? "bg-primary/10 text-primary border-primary/30" : "bg-surface text-muted-foreground border-border/40"}`}>
              <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-mono ${i <= step ? "bg-background/30" : "bg-surface-raised"}`}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-4 text-sm text-again bg-again/10 border border-again/30 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="rounded-2xl border border-border/40 bg-surface p-5 sm:p-8 step-morph" key={step}>
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold tracking-tight">Upload past-paper material</h2>
              <p className="text-sm text-muted-foreground mt-1">Scans, photos, PDFs, or typed text. We&apos;ll extract individual questions.</p>
              <button onClick={() => inputRef.current?.click()} className="mt-5 w-full flex flex-col items-center justify-center gap-2 py-12 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 bg-surface-raised/30">
                <Upload className="size-8 text-muted-foreground" />
                <span className="font-semibold">Drop files or click to upload</span>
                <span className="text-xs text-muted-foreground">JPG, PNG, PDF, TXT · up to 25 MB each</span>
                <span className="text-xs text-muted-foreground">Digital PDFs extract faster; scanned PDFs and PDFs with diagrams may take longer (up to 10 pages, 25 figures).</span>
              </button>
              <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

              {files.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-raised/40 border border-border/30">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center"><X className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">No account needed — you&apos;ll be credited as a guest contributor unless signed in.</p>
                <AIButton onClick={runExtract} loading={extracting} disabled={files.length === 0}>Extract with AI</AIButton>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="size-5 text-primary" /> Extraction preview</h2>
              <p className="text-sm text-muted-foreground mt-1">Edit any field. Low-confidence fields are highlighted.</p>
              <div className="mt-5 space-y-3">
                {extracted.map((e, idx) => <ExtractCard key={idx} value={e} onChange={(v) => setExtracted(extracted.map((x, i) => i === idx ? v : x))} onRemove={() => setExtracted(extracted.filter((_, i) => i !== idx))} />)}
              </div>
              <div className="mt-5 text-xs text-muted-foreground">
                {extracted.length} question{extracted.length === 1 ? "" : "s"} ready · accuracy check the institution & year before continuing.
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold tracking-tight">Confirm shared metadata</h2>
              <p className="text-sm text-muted-foreground mt-1">Applies to the whole batch unless overridden per-question.</p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <MetaFormField
                  label="Institution"
                  value={metadata.institution || extracted[0]?.inst || ""}
                  onChange={(v) => setMetadata((m) => ({ ...m, institution: v }))}
                  onFocus={() => {
                    fetch("/api/public/institutions")
                      .then((r) => r.json())
                      .then((d) => setInstitutionOptions(d.institutions ?? []))
                      .catch(() => {});
                  }}
                  suggestions={institutionOptions}
                  icon={Building2}
                />
                <MetaFormField label="Course" placeholder="e.g. CS213 Data Structures" value={metadata.course} onChange={(v) => setMetadata((m) => ({ ...m, course: v }))} />
                <MetaFormField label="Semester" placeholder="e.g. Sem 4" value={metadata.semester} onChange={(v) => setMetadata((m) => ({ ...m, semester: v }))} />
                <MetaFormField label="Year" value={metadata.year || String(extracted[0]?.year ?? "")} onChange={(v) => setMetadata((m) => ({ ...m, year: v }))} />
                <MetaFormField label="Term" value={metadata.term || extracted[0]?.term || ""} onChange={(v) => setMetadata((m) => ({ ...m, term: v }))} />
                <MetaFormField label="Topic" value={metadata.topic || extracted[0]?.topic || ""} onChange={(v) => setMetadata((m) => ({ ...m, topic: v }))} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-4">
                <Trophy className="size-7 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Thanks for contributing!</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {extracted.length} questions queued for moderation. You&apos;ll earn +{extracted.length * 5} contribution points once approved.
              </p>
              <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
                Your paper will appear in the Question Bank after an admin approves it at{" "}
                <Link href="/admin" className="text-primary hover:underline font-medium">/admin</Link>.
              </p>
              {submissionId && (
                <p className="text-[11px] font-mono text-muted-foreground mt-2">
                  Submission ID: {submissionId}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link href="/questions" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface-raised">Browse bank</Link>
                <Link href="/admin" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface-raised">Moderation queue</Link>
                <Link href="/contributors" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold">See leaderboard</Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < STEPS.length - 1 && (
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border border-border/40 hover:bg-surface disabled:opacity-40">
              <ChevronLeft className="size-4" /> Back
            </button>
            {step === 0 ? (
              <span />
            ) : step === STEPS.length - 2 ? (
              <button onClick={() => void submitBatch()} disabled={submitting} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70">
                {submitting ? "Submitting…" : "Submit batch"} <ChevronRight className="size-4" />
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                Next <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ExtractCard({ value, onChange, onRemove }: { value: Extracted; onChange: (v: Extracted) => void; onRemove: () => void }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface-raised/40 p-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-md border border-border/40 p-2.5 bg-background/40">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Raw OCR</div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80">{value.raw}</pre>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5"><Sparkles className="size-3" /> AI cleaned (editable)</div>
          <textarea value={value.cleaned} onChange={(e) => onChange({ ...value, cleaned: e.target.value })} rows={4} className="w-full text-sm p-2 rounded-md bg-background border border-border/40 focus:outline-none focus:border-primary/40" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <MetaField label="Institution" value={value.inst} conf={value.conf.inst} onChange={(v) => onChange({ ...value, inst: v })} />
        <MetaField label="Year" value={String(value.year)} conf={value.conf.year} onChange={(v) => onChange({ ...value, year: +v || 0 })} />
        <MetaField label="Term" value={value.term} conf={value.conf.term} onChange={(v) => onChange({ ...value, term: v })} />
        <MetaField label="Topic" value={value.topic} conf={value.conf.topic} onChange={(v) => onChange({ ...value, topic: v })} />
        <MetaField label="Marks" value={String(value.marks)} conf={value.conf.marks} onChange={(v) => onChange({ ...value, marks: +v || 0 })} />
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={onRemove} className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline"><Trash2 className="size-3.5" /> Remove</button>
      </div>
    </div>
  );
}

function MetaField({ label, value, conf, onChange }: { label: string; value: string; conf: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className={conf > 0.9 ? "text-[var(--exam-ok)]" : "text-[var(--exam-warn)]"}>{Math.round(conf * 100)}%</span>
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 w-full h-8 px-2 rounded-md bg-background border text-sm focus:outline-none ${conf > 0.9 ? "border-border/40 focus:border-primary/40" : "border-[var(--exam-warn)]/50"}`} />
    </label>
  );
}

function MetaFormField({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  suggestions,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  suggestions?: string[];
  onFocus?: () => void;
}) {
  const listId = `suggestions-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="size-3" />} {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        list={suggestions?.length ? listId : undefined}
        className="w-full h-10 px-3 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:border-primary/40"
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </label>
  );
}
