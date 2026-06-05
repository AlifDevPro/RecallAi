"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Crown, Building2, Calendar, ThumbsUp } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import type { Contributor } from "@/lib/data/contributors";

export function ContributorProfileView({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/contributors/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setProfile(d.contributor))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Contributor not found.</p>
          <Link href="/contributors" className="text-primary hover:underline">Back to contributors</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href="/contributors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to contributors
        </Link>

        <header className="rounded-2xl border border-border/40 bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatarUrl} alt={profile.name} className="size-[140px] rounded-full object-cover" />
            <div className="absolute -top-2 -right-2 size-9 rounded-full bg-[oklch(0.78_0.18_85)] flex items-center justify-center text-background shadow">
              <Crown className="size-4" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
              {profile.name} {profile.verified && <CheckCircle2 className="size-5 text-[var(--exam-ok)]" />}
            </div>
            <div className="mt-1 flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
              <Building2 className="size-3.5" /> {profile.inst}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start">
              <Stat label="Contributions" value={profile.contributions} />
              <Stat label="Accuracy" value={`${profile.accuracy}%`} />
              <Stat label="Tier" value={profile.tier} />
            </div>
          </div>
        </header>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/40 px-4 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
