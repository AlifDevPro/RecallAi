"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Calendar,
  GraduationCap,
  Clock,
  Award,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Sparkles,
} from "lucide-react";
import { AIButton } from "@/components/ui/AIButton";
import { PublicHeader } from "@/components/layout/PublicHeader";
import type { Paper } from "@/lib/data/question-papers";

function ScanImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-surface-raised text-muted-foreground ${className ?? ""}`}
        style={style}
      >
        <ImageIcon className="size-8 opacity-50" />
        <span className="text-xs">Scan preview unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

export function PaperDetailView() {
  const params = useParams<{ questionId: string }>();
  const questionId = params.questionId;
  const router = useRouter();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [related, setRelated] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/public/papers/${questionId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/public/papers/${questionId}/related`).then((r) => (r.ok ? r.json() : { papers: [] })),
    ])
      .then(([detail, rel]) => {
        if (detail?.paper) setPaper(detail.paper);
        else setPaper(null);
        setRelated(rel?.papers ?? []);
      })
      .catch(() => {
        setPaper(null);
        setRelated([]);
      })
      .finally(() => setLoading(false));
  }, [questionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-2xl mx-auto p-10 text-center text-muted-foreground">Loading paper…</div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="max-w-2xl mx-auto p-10 text-center">
          <ImageIcon className="size-10 mx-auto text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Paper not found</h1>
          <Link href="/questions" className="mt-4 inline-block text-sm text-primary hover:underline">
            ← Back to question bank
          </Link>
        </div>
      </div>
    );
  }

  const downloadOriginal = () => {
    const url = paper.scans[0]?.pageUrl;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <Link href="/questions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" /> Back to bank
        </Link>

        <header className="rounded-md border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3" /> {paper.university} · {paper.department}
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="text-primary">{paper.course}</span> · {paper.courseTitle}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="size-3" /> {paper.year}</span>
                <span className="inline-flex items-center gap-1"><GraduationCap className="size-3" /> Semester {paper.semester}</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {paper.duration}</span>
                <span className="inline-flex items-center gap-1"><Award className="size-3" /> {paper.totalMarks} marks</span>
                <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                  paper.examType === "Final" ? "bg-destructive/15 text-destructive" :
                  paper.examType === "Mid" ? "bg-[var(--exam-warn)]/15 text-[var(--exam-warn)]" :
                  "bg-primary/15 text-primary"
                }`}>{paper.examType}</span>
                {paper.verified && (
                  <span className="inline-flex items-center gap-1 text-[var(--exam-ok)]">
                    <CheckCircle2 className="size-3" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <AIButton
              icon={<Sparkles className="size-4" />}
              onClick={() => router.push(`/mock/new?paperId=${paper.id}&topic=${encodeURIComponent(paper.courseTitle)}`)}
            >
              Generate mock from this paper
            </AIButton>
            <button
              type="button"
              onClick={downloadOriginal}
              disabled={!paper.hasPhoto || paper.scans.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm border border-border hover:bg-surface-raised disabled:opacity-40"
            >
              <Download className="size-4" /> Download original
            </button>
          </div>
        </header>

        <section className="mt-6 grid lg:grid-cols-[1fr_280px] gap-6">
          <div>
            <PhotoView paper={paper} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-md border border-border bg-surface p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Uploaded by</div>
              <Link href={`/contributors/${paper.uploaderId}`} className="flex items-center gap-3 hover:opacity-80">
                <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {paper.uploaderName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{paper.uploaderName}</div>
                  <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <Eye className="size-3" /> {paper.views} views
                  </div>
                </div>
              </Link>
            </div>

            <div className="rounded-md border border-border bg-surface p-4">
              <div className="text-sm font-semibold mb-3">Related papers</div>
              {related.length === 0 ? (
                <div className="text-xs text-muted-foreground">No other papers for this course yet.</div>
              ) : (
                <div className="space-y-2">
                  {related.map((r) => (
                    <Link key={r.id} href={`/questions/${r.id}`} className="block p-2.5 rounded border border-border hover:border-primary/50 hover:bg-surface-raised">
                      <div className="text-xs font-semibold">{r.year} · {r.examType}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{r.university}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function PhotoView({ paper }: { paper: Paper }) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (!paper.hasPhoto || paper.scans.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <ImageIcon className="size-8 mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No scan uploaded yet</p>
        <p className="text-xs text-muted-foreground mt-1">This paper does not have a scanned image on file.</p>
      </div>
    );
  }

  const cur = paper.scans[page];

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border bg-surface-raised/40">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="size-8 rounded hover:bg-surface-raised flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs font-mono text-muted-foreground px-2">
            Page {page + 1} / {paper.scans.length}
          </span>
          <button
            onClick={() => setPage(Math.min(paper.scans.length - 1, page + 1))}
            disabled={page === paper.scans.length - 1}
            className="size-8 rounded hover:bg-surface-raised flex items-center justify-center disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            cur.ocrConfidence > 0.9 ? "bg-[var(--exam-ok)]/15 text-[var(--exam-ok)]" :
            cur.ocrConfidence > 0.8 ? "bg-[var(--exam-warn)]/15 text-[var(--exam-warn)]" :
            "bg-destructive/15 text-destructive"
          }`}>
            OCR {Math.round(cur.ocrConfidence * 100)}%
          </span>
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} className="size-8 rounded hover:bg-surface-raised flex items-center justify-center">
              <ZoomOut className="size-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.2))} className="size-8 rounded hover:bg-surface-raised flex items-center justify-center">
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-0">
        <div className="border-r border-border bg-surface-dim p-2 space-y-2 max-h-[700px] overflow-y-auto">
          {paper.scans.map((s, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`block w-full overflow-hidden rounded border-2 ${i === page ? "border-primary" : "border-border hover:border-muted-foreground"}`}
            >
              <ScanImage src={s.pageUrl} alt={`Page ${i + 1} thumbnail`} className="w-full h-auto block opacity-90 min-h-[60px]" />
            </button>
          ))}
        </div>
        <div className="overflow-auto p-4 bg-surface-dim max-h-[700px] flex items-start justify-center">
          <ScanImage
            src={cur.pageUrl}
            alt={`Page ${page + 1}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 200ms" }}
            className="max-w-full h-auto rounded shadow-lg border border-border"
          />
        </div>
      </div>
    </div>
  );
}
