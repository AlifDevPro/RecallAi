"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type Goal = {
  id: string;
  title: string;
  progress: number;
  target: string;
  deadline?: string | null;
};

export function GoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch("/api/me/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => setGoals([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-4xl mx-auto px-6 py-8 lg:py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Long-term objectives from your study plan and topics.
              </p>
            </div>
            <Link
              href="/topics/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> New goal
            </Link>
          </div>
          <div className="space-y-4">
            {goals.map((g) => (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-surface border border-border/20 flex items-center gap-4"
              >
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.target}</p>
                  <div className="mt-2 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
                <span className="text-sm font-mono text-primary">{g.progress}%</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            ))}
            {goals.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground mb-4">
                  Goals are derived from your study plan. Add a topic to start tracking progress.
                </p>
                <Link href="/topics/new" className="text-sm text-primary hover:underline">
                  Add a topic
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
