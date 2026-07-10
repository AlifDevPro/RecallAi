import { Flame, Target, Zap, CalendarCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type KpiItem = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
};

type DashboardKpiStripProps = {
  dueToday: number;
  streakDays: number;
  avgMastery: number;
  reviews7d: number;
  isLoading?: boolean;
};

function KpiTile({ label, value, hint, icon: Icon, accent }: KpiItem) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight mt-0.5">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export function DashboardKpiStrip({
  dueToday,
  streakDays,
  avgMastery,
  reviews7d,
  isLoading,
}: DashboardKpiStripProps) {
  const items: KpiItem[] = [
    {
      label: "Due today",
      value: isLoading ? "…" : String(dueToday),
      hint: "Cards to review",
      icon: CalendarCheck,
      accent: "bg-good/10 text-good",
    },
    {
      label: "Streak",
      value: isLoading ? "…" : `${streakDays}d`,
      hint: "Consecutive days",
      icon: Flame,
      accent: "bg-hard/10 text-hard",
    },
    {
      label: "Avg mastery",
      value: isLoading ? "…" : `${avgMastery}%`,
      hint: "Across topics",
      icon: Target,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Reviews",
      value: isLoading ? "…" : String(reviews7d),
      hint: "Last 7 days",
      icon: Zap,
      accent: "bg-accent/10 text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 divide-y lg:divide-y-0 divide-border/30 border-b border-border/30">
      {items.map((item) => (
        <KpiTile key={item.label} {...item} />
      ))}
    </div>
  );
}
