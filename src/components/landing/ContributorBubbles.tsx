"use client";

import Link from "next/link";
import { useContributors } from "@/hooks/use-contributors";
import { ContributorAvatar } from "@/components/contributors/ContributorAvatar";
import { CONTRIBUTORS, type Contributor } from "@/lib/data/contributors";

const MIN_VISIBLE_BUBBLES = 8;

function seededRand(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function bubbleSizes(contributors: Contributor[]) {
  const max = Math.max(...contributors.map((c) => c.contributions), 1);

  return contributors.map((c) => {
    const ratio = Math.log(c.contributions + 1) / Math.log(max + 1);
    return { c, size: Math.round(58 + ratio * 78) };
  });
}

function fillPreviewContributors(contributors: Contributor[]) {
  if (contributors.length >= MIN_VISIBLE_BUBBLES) {
    return contributors;
  }

  const existingIds = new Set(contributors.map((c) => c.id));
  const fallbackContributors = CONTRIBUTORS.filter((c) => !existingIds.has(c.id));
  return [...contributors, ...fallbackContributors].slice(0, MIN_VISIBLE_BUBBLES);
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
		<div className="relative w-full h-80 sm:h-95 lg:h-105 mt-10 overflow-hidden animate-pulse">
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

  const visibleContributors = fillPreviewContributors(contributors);

  if (visibleContributors.length === 0) {
    return (
      <div className="w-full h-50 mt-10 flex items-center justify-center text-sm text-muted-foreground">
        Contributors will appear here as papers are verified.
      </div>
    );
  }

  const rand = seededRand(42);
  const bubbles = bubbleSizes(visibleContributors);

  return (
		<div className="w-full mt-10 px-6">
			<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-5 py-4 sm:gap-7">
				{bubbles.map((b, i) => (
					<Link
						key={b.c.id}
						href={`/contributors/${b.c.id}`}
						className="bubble-float group relative block shrink-0"
						style={{
							animationDelay: `${(i * 0.4) % 5}s`,
							animationDuration: `${6 + (i % 4)}s`,
							marginTop: `${Math.round((rand() - 0.5) * 28)}px`,
						}}
						title={`${b.c.name} - ${b.c.contributions} papers`}
					>
						<ContributorAvatar src={b.c.avatarUrl} name={b.c.name} size={b.size} className="ring-2 ring-background shadow-lg shadow-black/10" imgClassName="transition-transform group-hover:scale-105" />
						{b.c.verified && (
							<div className="absolute bottom-0 right-0 size-4 rounded-full bg-(--exam-ok) flex items-center justify-center z-10">
								<svg viewBox="0 0 12 12" className="size-2 text-background">
									<path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						)}
					</Link>
				))}
			</div>
		</div>
  );
}
