"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONTRIBUTORS, type Contributor } from "@/lib/data/contributors";

function seededRand(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function ContributorBubbles() {
  const [contributors, setContributors] = useState<Contributor[]>(CONTRIBUTORS);

  useEffect(() => {
    fetch("/api/public/contributors")
      .then((r) => r.json())
      .then((d) => {
        if (d.contributors?.length) setContributors(d.contributors);
      })
      .catch(() => {});
  }, []);

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.c.avatarUrl}
            alt={b.c.name}
            loading="lazy"
            className="size-full rounded-full object-cover transition-transform group-hover:scale-105"
          />
          {b.c.verified && (
            <div className="absolute bottom-0 right-0 size-4 rounded-full bg-[var(--exam-ok)] flex items-center justify-center">
              <svg viewBox="0 0 12 12" className="size-2 text-background"><path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
