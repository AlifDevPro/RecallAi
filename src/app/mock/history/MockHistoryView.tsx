"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Filter, Search, TrendingUp, Clock, ArrowRight, BarChart3, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MockHistorySkeleton } from "@/components/mock/MockSkeletons";

type AttemptRow = {
  id: string;
  title: string;
  mode: "Global" | "Institutional";
  inst: string;
  score: number;
  time: string;
  date: string;
  status: string;
};

export function MockHistoryView() {
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "Global" | "Institutional">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttempts = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (mode !== "all") params.set("mode", mode.toLowerCase());
    fetch(`/api/mock/attempts?${params}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to load history");
        }
        return r.json();
      })
      .then((d) => {
        const mapped = (d.attempts ?? []).map(
          (a: {
            id: string;
            title: string;
            score: number;
            max_score: number;
            started_at: string;
            submitted_at: string | null;
            duration_min: number;
            status: string;
            config?: { mode?: string; institutions?: string[] };
          }) => {
            const cfg = a.config ?? {};
            const attemptMode = cfg.mode === "institutional" ? "Institutional" : "Global";
            const duration = a.duration_min ?? 0;
            return {
              id: a.id,
              title: a.title,
              mode: attemptMode as "Global" | "Institutional",
              inst: cfg.institutions?.[0] ?? (attemptMode === "Global" ? "Global pool" : "Institutional"),
              score: a.max_score ? Math.round((Number(a.score) / Number(a.max_score)) * 100) : 0,
              time: duration >= 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`,
              date: new Date(a.submitted_at ?? a.started_at).toLocaleDateString(),
              status: a.status,
            };
          }
        );
        setAttempts(mapped);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load");
        setAttempts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttempts();
  }, [mode]);

  const filtered = attempts.filter((a) =>
    q === "" || a.title.toLowerCase().includes(q.toLowerCase())
  );
  const avg = Math.round(filtered.reduce((s, a) => s + a.score, 0) / Math.max(1, filtered.length));
  const totalMin = filtered.reduce((s, a) => {
    const m = a.time.match(/(\d+)h\s*(\d+)m|(\d+)m/);
    if (!m) return s;
    if (m[1]) return s + parseInt(m[1]) * 60 + parseInt(m[2] ?? "0");
    return s + parseInt(m[3] ?? "0");
  }, 0);
  const totalTime = totalMin >= 60
    ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
    : `${totalMin}m`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0">
          <MockHistorySkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 space-y-6">
          <header>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mock history</h1>
            <p className="text-sm text-muted-foreground mt-1">Every attempt, with full evaluations available.</p>
          </header>

          {error && (
            <div className="p-3 rounded-xl bg-again/10 border border-again/30 text-sm text-again flex justify-between gap-2">
              <span className="flex items-center gap-2"><AlertCircle className="size-4" /> {error}</span>
              <button type="button" onClick={loadAttempts} className="text-primary hover:underline shrink-0">
                Retry
              </button>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <KPI label="Attempts" value={String(filtered.length)} icon={BarChart3} />
            <KPI label="Avg score" value={`${avg}%`} icon={TrendingUp} />
            <KPI label="Total time" value={totalTime || "—"} icon={Clock} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search attempts…" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface border border-border/40 text-sm focus:outline-none focus:border-primary/40" />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border/40">
              {(["all", "Global", "Institutional"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 h-8 rounded-md text-xs font-medium ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{m === "all" ? "All" : m}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((a) => {
              const href =
                a.status === "in_progress"
                  ? `/mock/exam/${a.id}`
                  : `/mock/result/${a.id}`;
              return (
                <Link key={a.id} href={href} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border/30 bg-surface hover:border-border/50 transition-colors group">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.mode} · {a.inst} · {a.date}
                      {a.status === "in_progress" && (
                        <span className="ml-2 text-primary font-medium">Resume</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">
                        {a.status === "graded" ? `${a.score}%` : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{a.time}</div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No attempts yet.{" "}
                <Link href="/mock/new" className="text-primary hover:underline">Start a mock</Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
