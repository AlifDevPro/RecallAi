"use client";

import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";

export function InsightBanner() {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/analytics")
      .then((r) => r.json())
      .then((d) => setInsight(d.insight ?? null))
      .catch(() => {});
  }, []);

  if (!insight) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-surface border border-border/20 flex gap-3">
      <BrainCircuit className="size-5 text-primary shrink-0" />
      <p className="text-sm text-muted-foreground">{insight}</p>
    </div>
  );
}
