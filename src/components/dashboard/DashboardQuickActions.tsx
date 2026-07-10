import Link from "next/link";
import {
  BookOpen,
  BrainCircuit,
  Calendar,
  ClipboardList,
  LineChart,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type DashboardQuickActionsProps = {
  weakestTopicSlug: string | null;
  weakestTopicName: string | null;
};

type ActionItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  primary?: boolean;
};

export function DashboardQuickActions({ weakestTopicSlug, weakestTopicName }: DashboardQuickActionsProps) {
  const quizHref = weakestTopicSlug
    ? `/quiz?topic=${encodeURIComponent(weakestTopicSlug)}&count=5`
    : "/quiz";
  const mockHref = weakestTopicName
    ? `/mock/new?topic=${encodeURIComponent(weakestTopicName)}`
    : "/mock/new";

  const actions: ActionItem[] = [
    { label: "Start review", href: "/review", icon: Play, primary: true },
    { label: "Quiz", href: quizHref, icon: BrainCircuit },
    { label: "Mock test", href: mockHref, icon: ClipboardList },
    { label: "AI tutor", href: "/tutor", icon: Sparkles },
    { label: "New topic", href: "/topics/new", icon: Plus },
    { label: "Schedule", href: "/schedule", icon: Calendar },
    { label: "Question bank", href: "/questions", icon: BookOpen },
    { label: "Analytics", href: "/analytics", icon: LineChart },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-6 border-b border-border/30">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-colors ${
            action.primary
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "hover:bg-surface-raised text-foreground"
          }`}
        >
          <action.icon className={`size-5 ${action.primary ? "" : "text-muted-foreground"}`} />
          <span className="text-xs font-medium leading-tight">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
