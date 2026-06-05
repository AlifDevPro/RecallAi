"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Building2,
  Library,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  FileText,
  Eye,
  Calendar,
  GraduationCap,
  X,
} from "lucide-react";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { PublicHeader } from "@/components/layout/PublicHeader";
import {
  PAPERS,
  UNIVERSITIES,
  DEPARTMENTS,
  ALL_DEPARTMENTS,
  EXAM_TYPES,
  type Paper,
} from "@/lib/data/question-papers";

const SEM_OPTS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));
const YEARS = Array.from({ length: 8 }, (_, i) => 2018 + i);

export function BankView() {
  const [papers, setPapers] = useState<Paper[]>(PAPERS);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/public/papers")
      .then((r) => r.json())
      .then((d) => {
        if (d.papers?.length) setPapers(d.papers);
      })
      .catch(() => {});
  }, []);
  const [universities, setUniversities] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhoto, setWithPhoto] = useState(false);
  const [withDigital, setWithDigital] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deptOptions = useMemo(() => {
    if (universities.length === 0) return ALL_DEPARTMENTS;
    const set = new Set<string>();
    universities.forEach((u) => DEPARTMENTS[u]?.forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [universities]);

  const results = useMemo(() => papers.filter((p) => {
    if (universities.length && !universities.includes(p.university)) return false;
    if (departments.length && !departments.includes(p.department)) return false;
    if (semesters.length && !semesters.includes(String(p.semester))) return false;
    if (years.length && !years.includes(String(p.year))) return false;
    if (examTypes.length && !examTypes.includes(p.examType)) return false;
    if (verifiedOnly && !p.verified) return false;
    if (withPhoto && !p.hasPhoto) return false;
    if (withDigital && !p.hasDigital) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const hay = `${p.course} ${p.courseTitle} ${p.university} ${p.department}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  }), [papers, universities, departments, semesters, years, examTypes, verifiedOnly, withPhoto, withDigital, q]);

  const activeFilterCount =
    universities.length + departments.length + semesters.length + years.length + examTypes.length +
    (verifiedOnly ? 1 : 0) + (withPhoto ? 1 : 0) + (withDigital ? 1 : 0);

  const clearAll = () => {
    setUniversities([]); setDepartments([]); setSemesters([]); setYears([]);
    setExamTypes([]); setVerifiedOnly(false); setWithPhoto(false); setWithDigital(false);
  };

  const filterContent = (
    <div className="space-y-4">
      <FilterDropdown
        label="University"
        options={UNIVERSITIES.map((u) => ({ value: u, label: u }))}
        value={universities}
        onChange={setUniversities}
        multi searchable placeholder="All universities"
      />
      <FilterDropdown
        label="Department"
        options={deptOptions.map((d) => ({ value: d, label: d }))}
        value={departments}
        onChange={setDepartments}
        multi searchable placeholder="All departments"
      />
      <FilterDropdown
        label="Semester"
        options={SEM_OPTS}
        value={semesters}
        onChange={setSemesters}
        multi placeholder="Any semester"
      />
      <FilterDropdown
        label="Year"
        options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
        value={years}
        onChange={setYears}
        multi placeholder="Any year"
      />
      <FilterDropdown
        label="Exam type"
        options={EXAM_TYPES.map((t) => ({ value: t, label: t }))}
        value={examTypes}
        onChange={setExamTypes}
        multi placeholder="Any type"
      />
      <div className="space-y-2 pt-2 border-t border-border">
        <ToggleRow checked={verifiedOnly} onChange={setVerifiedOnly} label="Verified only" icon={<CheckCircle2 className="size-3.5 text-[var(--exam-ok)]" />} />
        <ToggleRow checked={withPhoto} onChange={setWithPhoto} label="Has photo / scan" icon={<ImageIcon className="size-3.5 text-accent" />} />
        <ToggleRow checked={withDigital} onChange={setWithDigital} label="Has digital text" icon={<FileText className="size-3.5 text-primary" />} />
      </div>
      {activeFilterCount > 0 && (
        <button onClick={clearAll} className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 py-2 border border-border rounded-md">
          <X className="size-3.5" /> Clear {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="aurora absolute -top-20 left-1/4 size-[420px] rounded-full bg-primary/20 blur-3xl" />
          <div className="aurora absolute -bottom-32 right-0 size-[420px] rounded-full bg-accent/15 blur-3xl" style={{ animationDelay: "-8s" }} />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider">
              <Library className="size-3" /> Real past papers · digital + scan
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl">
              Every past paper. Both the original scan and a clean digital copy.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Filter by university, department, semester, year and exam type. Switch between the photo of the real paper and the AI-cleaned digital version on every entry.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by course code, title or university…"
                  className="w-full h-12 pl-12 pr-4 rounded-md bg-surface border border-border text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring"
                />
              </div>
              <Link href="/questions/upload" className="inline-flex items-center justify-center gap-1.5 px-4 h-12 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                <Upload className="size-4" /> Contribute a paper
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span>Try:</span>
              {["CSE 213", "IIT Bombay Final 2023", "DBMS midsem", "Algorithms"].map((s) => (
                <button key={s} onClick={() => setQ(s)} className="px-2 py-0.5 rounded bg-surface border border-border hover:border-primary/50">{s}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Filter rail */}
          <aside className="hidden lg:block">
            <div className="rounded-md border border-border bg-surface p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary text-primary-foreground">{activeFilterCount}</span>
                )}
              </div>
              {filterContent}
            </div>
          </aside>

          {/* Mobile drawer trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-md bg-surface border border-border text-sm"
          >
            <Filter className="size-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {/* Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{results.length}</span> paper{results.length === 1 ? "" : "s"}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-10 text-center">
                <Library className="size-8 mx-auto text-muted-foreground" />
                <div className="mt-3 font-semibold">No papers match these filters</div>
                <p className="text-sm text-muted-foreground mt-1">Clear some filters or be the first to upload one.</p>
                <Link href="/questions/upload" className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                  <Upload className="size-4" /> Upload a paper
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {results.map((p) => <PaperCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur" onClick={() => setDrawerOpen(false)}>
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-card border-t border-border p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Filters</h2>
              <button onClick={() => setDrawerOpen(false)} className="size-8 rounded-md hover:bg-surface-raised flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            {filterContent}
            <button onClick={() => setDrawerOpen(false)} className="mt-5 w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold">
              Show {results.length} paper{results.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ checked, onChange, label, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; icon: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
      <span
        onClick={() => onChange(!checked)}
        className={`size-4 rounded border flex items-center justify-center transition-colors ${
          checked ? "bg-primary border-primary text-primary-foreground" : "bg-surface border-border"
        }`}
      >
        {checked && <CheckCircle2 className="size-3" />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {icon}
      <span className="flex-1">{label}</span>
    </label>
  );
}

function PaperCard({ p }: { p: Paper }) {
  return (
    <Link
      href={`/questions/${p.id}`}
      className="group rounded-md border border-border bg-surface p-4 hover:border-primary/50 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Building2 className="size-3" /> {p.university}
          </div>
          <div className="mt-1 text-base font-semibold leading-tight">
            <span className="text-primary">{p.course}</span> · {p.courseTitle}
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
          p.examType === "Final" ? "bg-destructive/15 text-destructive" :
          p.examType === "Mid" ? "bg-[var(--exam-warn)]/15 text-[var(--exam-warn)]" :
          "bg-primary/15 text-primary"
        }`}>{p.examType}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <Pill icon={<Calendar className="size-2.5" />}>{p.year}</Pill>
        <Pill icon={<GraduationCap className="size-2.5" />}>Sem {p.semester}</Pill>
        <Pill>{p.department}</Pill>
        <Pill>{p.totalMarks} marks</Pill>
        <Pill>{p.duration}</Pill>
      </div>
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          {p.hasDigital && <span className="inline-flex items-center gap-1 text-primary"><FileText className="size-3" /> Digital</span>}
          {p.hasPhoto && <span className="inline-flex items-center gap-1 text-accent"><ImageIcon className="size-3" /> Photo</span>}
          {p.verified && <span className="inline-flex items-center gap-1 text-[var(--exam-ok)]"><CheckCircle2 className="size-3" /> Verified</span>}
        </span>
        <span className="inline-flex items-center gap-1"><Eye className="size-3" /> {p.views}</span>
      </div>
    </Link>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded bg-surface-raised text-muted-foreground border border-border inline-flex items-center gap-1">
      {icon}{children}
    </span>
  );
}
