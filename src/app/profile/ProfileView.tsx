"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Mail, Calendar, Edit3, Flame, Trophy, Target, Brain, Share2, ShieldCheck, Clock,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type ProfileData = {
  profile: {
    displayName: string;
    email: string;
    bio: string;
    avatarUrl: string | null;
    plan: string;
    joinedAt: string;
    initials: string;
  };
  stats: {
    streak: number;
    cardsMastered: number;
    avgMastery: number;
    totalReviews: number;
    goalsHit: number;
  };
  activity: { day: string; v: number }[];
};

export function ProfileView() {
  const [data, setData] = useState<ProfileData | null>(null);

  useEffect(() => {
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const p = data?.profile;
  const stats = data?.stats;
  const activity = data?.activity ?? [];
  const max = Math.max(...activity.map((a) => a.v), 1);

  const statTiles = stats
    ? [
        { label: "Day streak", value: String(stats.streak), icon: Flame, color: "text-hard", bg: "bg-hard/15" },
        { label: "Cards mastered", value: String(stats.cardsMastered), icon: Brain, color: "text-primary", bg: "bg-primary/15" },
        { label: "Goals hit", value: String(stats.goalsHit), icon: Target, color: "text-good", bg: "bg-good/15" },
        { label: "Avg mastery", value: `${stats.avgMastery}%`, icon: Trophy, color: "text-accent", bg: "bg-accent/15" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar streakDays={stats?.streak} />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 overflow-hidden">
          <div className="absolute -top-10 -right-10 size-48 rounded-full bg-primary/30 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-5 sm:px-6 -mt-16 sm:-mt-20 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="relative shrink-0">
              {p?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt={p.displayName} className="size-28 sm:size-32 rounded-2xl object-cover ring-4 ring-background" />
              ) : (
                <div className="size-28 sm:size-32 rounded-2xl bg-gradient-to-br from-primary to-accent ring-4 ring-background flex items-center justify-center text-3xl sm:text-4xl font-bold text-primary-foreground">
                  {p?.initials ?? "?"}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{p?.displayName ?? "Loading…"}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-mono font-semibold uppercase">
                  <ShieldCheck className="size-3" /> {p?.plan ?? "free"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{p?.bio || "No bio yet."}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" /> {p?.email}</span>
                {p?.joinedAt && (
                  <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" /> Joined {new Date(p.joinedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/profile/edit" className="h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-2">
                <Edit3 className="size-4" /> Edit profile
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {statTiles.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="p-4 rounded-2xl bg-surface border border-border/30">
                  <div className={`size-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`size-4 ${s.color}`} />
                  </div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>

          <section className="mt-8 p-5 rounded-2xl bg-surface border border-border/30">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="size-4" /> Weekly activity</h2>
            <div className="flex items-end gap-2 h-24">
              {activity.map((a) => (
                <div key={a.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/60 rounded-t-sm" style={{ height: `${(a.v / max) * 100}%`, minHeight: a.v ? 4 : 0 }} />
                  <span className="text-[10px] text-muted-foreground">{a.day}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
