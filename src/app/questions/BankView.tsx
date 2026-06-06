"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Loader2,
} from "lucide-react";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { PublicHeader } from "@/components/layout/PublicHeader";
import type { Paper } from "@/lib/data/question-papers";
import type { PaperFacets } from "@/lib/papers/query-papers";
import { paperListParamsToSearchParams } from "@/lib/papers/query-papers";

const DEFAULT_FACETS: PaperFacets = {
  universities: [],
  departments: [],
  courses: [],
  years: [],
  examTypes: [],
  semesters: [],
  departmentsByUniversity: {},
};

function parseListParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function BankView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryKey = searchParams.toString();

  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [facets, setFacets] = useState<PaperFacets>(DEFAULT_FACETS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasLoadedOnce = useRef(false);
  const fetchGeneration = useRef(0);

  const filters = useMemo(() => {
    const sp = new URLSearchParams(queryKey);
    const currentPage = Math.max(1, Number(sp.get("page")) || 1);
    return {
      q: sp.get("q")?.trim() || undefined,
      university: parseListParam(sp.get("university")),
      department: parseListParam(sp.get("department")),
      course: parseListParam(sp.get("course")),
      semester: parseListParam(sp.get("semester")),
      year: parseListParam(sp.get("year")),
      examType: parseListParam(sp.get("examType")),
      verifiedOnly: sp.get("verifiedOnly") === "true",
      hasPhoto: sp.get("hasPhoto") === "true",
      hasDigital: sp.get("hasDigital") === "true",
      page: currentPage,
      limit: 24,
    };
  }, [queryKey]);

  const q = searchParams.get("q") ?? "";
  const [qInput, setQInput] = useState(q);
  const page = filters.page;
  const universities = filters.university;
  const departments = filters.department;
  const semesters = filters.semester;
  const years = filters.year;
  const examTypes = filters.examType;
  const verifiedOnly = filters.verifiedOnly;
  const withPhoto = filters.hasPhoto;
  const withDigital = filters.hasDigital;
  const courses = filters.course;

  useEffect(() => {
    fetch("/api/public/papers/facets")
      .then((r) => r.json())
      .then((d) => setFacets({ ...DEFAULT_FACETS, ...d }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setQInput(q);
  }, [q]);

  const updateParams = useCallback(
    (patch: Record<string, string | string[] | boolean | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
          sp.delete(key);
        } else if (typeof value === "boolean") {
          if (value) sp.set(key, "true");
          else sp.delete(key);
        } else if (Array.isArray(value)) {
          sp.set(key, value.join(","));
        } else {
          sp.set(key, value);
        }
      }
      sp.delete("page");
      router.replace(`/questions?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) updateParams({ q: qInput });
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, q, updateParams]);

  useEffect(() => {
    const generation = ++fetchGeneration.current;
    const controller = new AbortController();
    const isFirstLoad = !hasLoadedOnce.current;

    if (isFirstLoad) {
      setInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setFetchError(null);

    const params = paperListParamsToSearchParams(filters);

    fetch(`/api/public/papers?${params}`, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.error) {
          throw new Error(typeof d.error === "string" ? d.error : "Failed to load papers");
        }
        return d;
      })
      .then((d) => {
        if (generation !== fetchGeneration.current) return;
        setPapers(d.papers ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        if (generation !== fetchGeneration.current) return;
        setFetchError(e instanceof Error ? e.message : "Failed to load papers");
        if (isFirstLoad) {
          setPapers([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (generation !== fetchGeneration.current) return;
        hasLoadedOnce.current = true;
        setInitialLoading(false);
        setIsRefreshing(false);
      });

    return () => controller.abort();
    // filters is derived from queryKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const deptOptions = useMemo(() => {
    if (universities.length === 0) return facets.departments;
    const set = new Set<string>();
    universities.forEach((u) => facets.departmentsByUniversity[u]?.forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [universities, facets]);

  const activeFilterCount =
    universities.length +
    departments.length +
    semesters.length +
    years.length +
    examTypes.length +
    (verifiedOnly ? 1 : 0) +
    (withPhoto ? 1 : 0) +
    (withDigital ? 1 : 0);

  const clearAll = () => {
    router.replace("/questions", { scroll: false });
    setQInput("");
  };

  const totalPages = Math.max(1, Math.ceil(total / 24));

  const filterContent = (
    <div className="space-y-4">
      <FilterDropdown
        label="University"
        options={facets.universities.map((u) => ({ value: u, label: u }))}
        value={universities}
        onChange={(v) => updateParams({ university: v })}
        multi
        searchable
        placeholder="All universities"
      />
      <FilterDropdown
        label="Course"
        options={facets.courses.map((c) => ({ value: c, label: c }))}
        value={courses}
        onChange={(v) => updateParams({ course: v })}
        multi
        searchable
        placeholder="All courses"
      />
      <FilterDropdown
        label="Department"
        options={deptOptions.map((d) => ({ value: d, label: d }))}
        value={departments}
        onChange={(v) => updateParams({ department: v })}
        multi
        searchable
        placeholder="All departments"
      />
      <FilterDropdown
        label="Semester"
        options={facets.semesters.map((s) => ({ value: s, label: `Semester ${s}` }))}
        value={semesters}
        onChange={(v) => updateParams({ semester: v })}
        multi
        placeholder="Any semester"
      />
      <FilterDropdown
        label="Year"
        options={facets.years.map((y) => ({ value: String(y), label: String(y) }))}
        value={years}
        onChange={(v) => updateParams({ year: v })}
        multi
        placeholder="Any year"
      />
      <FilterDropdown
        label="Exam type"
        options={facets.examTypes.map((t) => ({ value: t, label: t }))}
        value={examTypes}
        onChange={(v) => updateParams({ examType: v })}
        multi
        placeholder="Any type"
      />
      <div className="space-y-2 pt-2 border-t border-border">
        <ToggleRow checked={verifiedOnly} onChange={(v) => updateParams({ verifiedOnly: v })} label="Verified only" icon={<CheckCircle2 className="size-3.5 text-[var(--exam-ok)]" />} />
        <ToggleRow checked={withPhoto} onChange={(v) => updateParams({ hasPhoto: v })} label="Has photo / scan" icon={<ImageIcon className="size-3.5 text-accent" />} />
        <ToggleRow checked={withDigital} onChange={(v) => updateParams({ hasDigital: v })} label="Has digital text" icon={<FileText className="size-3.5 text-primary" />} />
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
        <section className="relative overflow-hidden border-b border-border">
          <div className="aurora absolute -top-20 left-1/4 size-[420px] rounded-full bg-primary/20 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider">
              <Library className="size-3" /> Real past papers · digital + scan
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl">
              Every past paper. Both the original scan and a clean digital copy.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Filter by university, course, department, semester, year and exam type. Search updates results from the database.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="Search by course code, title or university…"
                  className="w-full h-12 pl-12 pr-4 rounded-md bg-surface border border-border text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring"
                />
              </div>
              <Link href="/questions/upload" className="inline-flex items-center justify-center gap-1.5 px-4 h-12 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
                <Upload className="size-4" /> Contribute a paper
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-6">
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

          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-md bg-surface border border-border text-sm"
          >
            <Filter className="size-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <div>
            {fetchError && (
              <p className="mb-4 text-sm text-again bg-again/10 border border-again/30 rounded-lg px-3 py-2">
                {fetchError}
              </p>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {isRefreshing && <Loader2 className="size-4 animate-spin" />}
                <span className="font-semibold text-foreground">{total}</span> paper{total === 1 ? "" : "s"}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    disabled={page <= 1 || isRefreshing}
                    onClick={() => {
                      const sp = new URLSearchParams(searchParams.toString());
                      sp.set("page", String(page - 1));
                      router.replace(`/questions?${sp.toString()}`, { scroll: false });
                    }}
                    className="px-2 py-1 rounded border border-border disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-muted-foreground">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages || isRefreshing}
                    onClick={() => {
                      const sp = new URLSearchParams(searchParams.toString());
                      sp.set("page", String(page + 1));
                      router.replace(`/questions?${sp.toString()}`, { scroll: false });
                    }}
                    className="px-2 py-1 rounded border border-border disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {initialLoading && papers.length === 0 ? (
              <div className="rounded-md border border-border bg-surface p-10 text-center text-muted-foreground">
                <Loader2 className="size-8 mx-auto animate-spin" />
                <p className="mt-3 text-sm">Loading papers…</p>
              </div>
            ) : papers.length === 0 ? (
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
                {papers.map((p) => (
                  <PaperCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

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
              Show {total} paper{total === 1 ? "" : "s"}
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
    <Link href={`/questions/${p.id}`} className="group rounded-md border border-border bg-surface p-4 hover:border-primary/50 transition-colors flex flex-col">
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
