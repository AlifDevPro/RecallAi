"use client";

import Link from "next/link";
import { useContributors } from "@/hooks/use-contributors";
import { ContributorAvatar } from "@/components/contributors/ContributorAvatar";
import type { Contributor } from "@/lib/data/contributors";

function seededRand(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function layoutBubbles(contributors: Contributor[]) {
  const max = Math.max(...contributors.map((c) => c.contributions), 1);
  const W = 100;
  const H = 100;
  const rand = seededRand(42);
  const placed: { xPct: number; yPct: number; r: number; c: Contributor }[] = [];

  for (const c of contributors) {
    const ratio = Math.log(c.contributions + 1) / Math.log(max + 1);
    const r = 24 + ratio * 60;
    const padX = (r / 1400) * 100;
    const padY = (r / 420) * 100;
    let xPct = 0;
    let yPct = 0;
    let ok = false;
    for (let tries = 0; tries < 120; tries++) {
      xPct = padX + rand() * (W - padX * 2);
      yPct = padY + rand() * (H - padY * 2);
      ok = placed.every((p) => {
        const dx = ((p.xPct - xPct) / 100) * 1400;
        const dy = ((p.yPct - yPct) / 100) * 420;
        return Math.hypot(dx, dy) > p.r + r + 8;
      });
      if (ok) break;
    }
    placed.push({ xPct, yPct, r, c });
  }

  return placed;
}

function BubblesSkeleton() {
  const dots = [
    { x: 18, y: 22, r: 52 },
    { x: 42, y: 12, r: 68 },
    { x: 68, y: 28, r: 44 },
    { x: 28, y: 58, r: 56 },
    { x: 55, y: 52, r: 62 },
    { x: 78, y: 62, r: 40 },
  ];
  return (
    <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[420px] mt-10 overflow-hidden animate-pulse">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-surface-raised"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.r * 2,
            height: d.r * 2,
            marginLeft: -d.r,
            marginTop: -d.r,
          }}
        />
      ))}
    </div>
  );
}

export function ContributorBubbles() {
  const { contributors, loading } = useContributors("all");

  if (loading) {
    return <BubblesSkeleton />;
  }

  if (contributors.length === 0) {
    return (
      <div className="w-full h-[200px] mt-10 flex items-center justify-center text-sm text-muted-foreground">
        Contributors will appear here as papers are verified.
      </div>
    );
  }

  const placed = layoutBubbles(contributors);

  return (
    <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[420px] mt-10 overflow-hidden">
      {placed.map((b, i) => (
        <Link
          key={b.c.id}
          href={`/contributors/${b.c.id}`}
          className="absolute bubble-float group"
          style={{
            left: `${b.xPct}%`,
            top: `${b.yPct}%`,
            width: b.r * 2,
            height: b.r * 2,
            marginLeft: -b.r,
            marginTop: -b.r,
            animationDelay: `${(i * 0.4) % 5}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
          title={`${b.c.name} · ${b.c.contributions} papers`}
        >
          <ContributorAvatar
            src={b.c.avatarUrl}
            name={b.c.name}
            size={b.r * 2}
            imgClassName="transition-transform group-hover:scale-105"
          />
          {b.c.verified && (
            <div className="absolute bottom-0 right-0 size-4 rounded-full bg-[var(--exam-ok)] flex items-center justify-center z-10">
              <svg viewBox="0 0 12 12" className="size-2 text-background">
                <path
                  d="M2 6l3 3 5-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
