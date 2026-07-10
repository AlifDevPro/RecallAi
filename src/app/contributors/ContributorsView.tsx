"use client";

import Link from "next/link";
import { Crown, CheckCircle2, TrendingUp, Search, Filter } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { ContributorAvatar } from "@/components/contributors/ContributorAvatar";
import { useContributors } from "@/hooks/use-contributors";
import { TIER_GRADIENT, type Contributor } from "@/lib/data/contributors";
import { useState } from "react";

function avatarSize(contributions: number, max: number) {
  const ratio = Math.log(contributions + 1) / Math.log(max + 1);
  return Math.round(56 + ratio * 84);
}

function PodiumSkeleton() {
  return (
    <div className="flex items-end justify-center gap-6 sm:gap-12 animate-pulse">
      {[110, 140, 92].map((size, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="rounded-full bg-surface-raised" style={{ width: size, height: size }} />
          <div className="mt-3 h-4 w-20 bg-surface-raised rounded" />
          <div className="mt-1 h-3 w-16 bg-surface-raised rounded" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="size-20 rounded-full bg-surface-raised" />
          <div className="mt-3 h-4 w-16 bg-surface-raised rounded" />
          <div className="mt-1 h-3 w-20 bg-surface-raised rounded" />
        </div>
      ))}
    </div>
  );
}

export function ContributorsView() {
  const [range, setRange] = useState<"week" | "month" | "all">("all");
  const [q, setQ] = useState("");
  const { contributors, loading, error } = useContributors(range);

  const list = contributors.filter(
    (c) =>
      q === "" ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.inst.toLowerCase().includes(q.toLowerCase())
  );
  const max = Math.max(...list.map((c) => c.contributions), 1);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border/30">
          <div className="aurora absolute -top-32 left-1/3 size-[420px] rounded-full bg-primary/15 blur-3xl" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider">
              <Crown className="size-3" /> Hall of Contributors
            </div>
            <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">Bigger circles, bigger impact.</h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Avatar size grows with verified contributions. The top contributor gets an animated halo.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {loading ? <PodiumSkeleton /> : (
            <div className="flex items-end justify-center gap-6 sm:gap-12 flex-wrap">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((c, i) => (
                <PodiumSlot key={c.id} c={c} rank={i === 0 ? 2 : i === 1 ? 1 : 3} max={max} />
              ))}
            </div>
          )}
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-1 p-1 rounded-md bg-surface border border-border/40">
              {(["week", "month", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 h-8 rounded text-xs font-medium capitalize ${
                    range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name or institution"
                  className="w-full sm:w-72 h-9 pl-9 pr-3 rounded-md bg-surface border border-border/40 text-sm focus:outline-none focus:border-primary/40"
                />
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-surface border border-border/40 text-xs">
                <Filter className="size-3.5" /> Institution
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-6 text-sm text-again text-center">{error}</p>
          )}

          {loading ? (
            <GridSkeleton />
          ) : list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No contributors found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8">
              {rest.map((c) => (
                <ContributorCard key={c.id} c={c} max={max} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PodiumSlot({ c, rank, max }: { c: Contributor; rank: number; max: number }) {
  const size = Math.max(rank === 1 ? 140 : rank === 2 ? 110 : 92, avatarSize(c.contributions, max));
  const animated = rank === 1;
  return (
    <Link href={`/contributors/${c.id}`} className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        {animated && (
          <div
            className={`absolute -inset-2 rounded-full bg-gradient-to-br ${TIER_GRADIENT[c.tier]} blur-xl opacity-60 animate-pulse`}
            aria-hidden
          />
        )}
        <ContributorAvatar
          src={c.avatarUrl}
          name={c.name}
          size={size}
          imgClassName="relative transition-transform group-hover:scale-[1.03]"
        />
        <div
          className={`absolute -top-2 -left-2 size-9 rounded-full bg-background flex items-center justify-center text-sm font-bold shadow-md z-10 ${
            rank === 1
              ? "text-[oklch(0.78_0.18_85)]"
              : rank === 2
              ? "text-muted-foreground"
              : "text-[oklch(0.65_0.14_30)]"
          }`}
        >
          #{rank}
        </div>
        {c.verified && (
          <div className="absolute bottom-1 right-1 size-6 rounded-full bg-[var(--exam-ok)] flex items-center justify-center shadow z-10">
            <CheckCircle2 className="size-3.5 text-background" />
          </div>
        )}
      </div>
      <div className="mt-3 text-center">
        <div className="text-sm font-semibold">{c.name}</div>
        <div className="text-[11px] text-muted-foreground">{c.inst}</div>
        <div className="text-[11px] font-mono mt-0.5">
          <span className="text-foreground font-semibold">{c.contributions}</span> papers · {c.accuracy}%
        </div>
      </div>
    </Link>
  );
}

function ContributorCard({ c, max }: { c: Contributor; max: number }) {
  const size = avatarSize(c.contributions, max);
  return (
    <Link
      href={`/contributors/${c.id}`}
      className="group flex flex-col items-center text-center transition-transform hover:-translate-y-0.5"
    >
      <div className="relative">
        <ContributorAvatar
          src={c.avatarUrl}
          name={c.name}
          size={size}
          imgClassName="transition-transform group-hover:scale-[1.04]"
        />
        {c.verified && (
          <div className="absolute bottom-0.5 right-0.5 size-5 rounded-full bg-[var(--exam-ok)] flex items-center justify-center shadow z-10">
            <CheckCircle2 className="size-3 text-background" />
          </div>
        )}
      </div>
      <div className="mt-3 text-sm font-semibold group-hover:text-primary transition-colors">{c.name}</div>
      <div className="text-[11px] text-muted-foreground">{c.inst}</div>
      <div
        className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold text-background bg-gradient-to-r ${TIER_GRADIENT[c.tier]}`}
      >
        <TrendingUp className="size-2.5" /> {c.contributions} · {c.tier}
      </div>
    </Link>
  );
}
