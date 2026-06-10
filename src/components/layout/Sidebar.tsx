"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BrainCircuit,
  Layers,
  BarChart3,
  MessageSquare,
  Target,
  Settings,
  Zap,
  Flame,
  Shield,
  Bell,
  CreditCard,
  Sparkles,
  CalendarDays,
  ChevronUp,
  LogOut,
  UserCircle,
  Trophy,
  ClipboardCheck,
  Library,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

const baseLearnItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, badge: "AI" },
  { to: "/review", label: "Review", icon: Zap },
  { to: "/topics", label: "Topics", icon: Layers },
  { to: "/quiz", label: "Quiz", icon: BrainCircuit },
  { to: "/mock", label: "Mock Tests", icon: ClipboardCheck, badge: "NEW" },
];

const insightItems = [
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/tutor", label: "AI Tutor", icon: MessageSquare },
];

const communityItems = [
  { to: "/questions", label: "Question Bank", icon: Library },
  { to: "/contributors", label: "Contributors", icon: Users },
];

const baseAccountItems = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  streakDays,
  reviewDue,
  displayName,
}: {
  streakDays?: number;
  reviewDue?: number;
  displayName?: string;
} = {}) {
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState<number | null>(null);

  const reviewStatsQuery = useQuery({
    queryKey: ["review-stats"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/me/review/stats");
        if (!r.ok) return { totalDue: 0 };
        const data = (await r.json().catch(() => ({}))) as { totalDue?: number };
        return { totalDue: Number(data.totalDue ?? 0) };
      } catch {
        return { totalDue: 0 };
      }
    },
    enabled: reviewDue === undefined,
    refetchInterval: 60_000,
  });

  const streakQuery = useQuery({
    queryKey: ["dashboard", "summary", "streak"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/me/dashboard/summary");
        if (!r.ok) return { streakDays: 0 };
        const data = (await r.json().catch(() => ({}))) as { streakDays?: number };
        return { streakDays: Number(data.streakDays ?? 0) };
      } catch {
        return { streakDays: 0 };
      }
    },
    enabled: streakDays === undefined,
    staleTime: 60_000,
  });

  useEffect(() => {
    const loadNotifications = () => {
      fetch("/api/me/notifications")
        .then((r) => r.json())
        .then((d) =>
          setNotifCount(
            (d.notifications ?? []).filter((n: { read_at: string | null }) => !n.read_at).length
          )
        )
        .catch(() => setNotifCount(null));
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(loadNotifications, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }

    const timer = setTimeout(loadNotifications, 1500);
    return () => clearTimeout(timer);
  }, []);

  const reviewCount = reviewDue ?? reviewStatsQuery.data?.totalDue ?? null;
  const resolvedStreak = streakDays ?? streakQuery.data?.streakDays ?? 0;

  const learnItems = baseLearnItems.map((item) =>
    item.to === "/review" && reviewCount != null && reviewCount > 0
      ? { ...item, badge: String(reviewCount) }
      : item
  );

  const accountItems = baseAccountItems.map((item) =>
    item.to === "/notifications" && notifCount != null && notifCount > 0
      ? { ...item, badge: String(notifCount) }
      : item
  );

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-surface-dim border-r border-border/30 flex-col z-50">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border/20">
        <div className="size-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center relative">
          <BrainCircuit className="size-4 text-primary-foreground relative z-10" />
          <div className="absolute inset-0 rounded-lg bg-primary blur-md opacity-40 z-0" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-base tracking-tight">Recall AI</span>
          <span className="text-[9px] font-mono text-muted-foreground mt-0.5">v1.0 · beta</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <NavSection label="Learn" items={learnItems} isActive={isActive} />
        <NavSection label="Insights" items={insightItems} isActive={isActive} />
        <NavSection label="Community" items={communityItems} isActive={isActive} />
        <NavSection label="Account" items={accountItems} isActive={isActive} />
      </nav>

      <div className="px-3 pb-3">
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-primary/20 via-primary/5 to-accent/10 border border-primary/20 p-4">
          <div className="absolute -top-6 -right-6 size-20 rounded-full bg-primary/20 blur-xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-primary uppercase tracking-wider mb-1">
              <Sparkles className="size-3" /> Upgrade
            </div>
            <div className="text-sm font-semibold leading-tight">Unlock Pro</div>
            <div className="text-[11px] text-muted-foreground mt-0.5 mb-3 leading-snug">
              Unlimited AI cards, voice input, advanced analytics.
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center justify-center w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/20">
        <div className="flex items-center justify-between mb-3 p-2 rounded-md bg-surface">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-hard" />
            <span className="text-xs font-semibold">
              {resolvedStreak} day streak
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="size-7!" />
          </div>
        </div>
        <ProfileMenu isActive={isActive} displayName={displayName} />
      </div>
    </aside>
  );
}

function ProfileMenu({
  isActive,
  displayName: displayNameProp,
}: {
  isActive: (to: string) => boolean;
  displayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { displayName: hookDisplayName, email, initials: hookInitials } = useUser();
  const displayName = displayNameProp ?? hookDisplayName;
  const initials = displayNameProp
    ? displayNameProp
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : hookInitials;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-3 p-1.5 pr-2 rounded-lg transition-colors ${
          open ? "bg-surface-raised" : "hover:bg-surface-raised/60"
        }`}
      >
        <div className="size-8 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
          {initials || "?"}
        </div>
        <div className="flex flex-col min-w-0 items-start flex-1">
          <span className="text-sm font-medium truncate">{displayName}</span>
          <span className="text-[10px] text-muted-foreground">Pro · admin</span>
        </div>
        <ChevronUp
          className={`size-3.5 text-muted-foreground transition-transform ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-card border border-border/40 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border/30">
            <div className="text-sm font-semibold leading-tight">{displayName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{email}</div>
          </div>
          <div className="p-1">
            <MenuLink to="/profile" icon={UserCircle} label="Profile" active={isActive("/profile")} onClick={() => setOpen(false)} />
            <MenuLink to="/billing" icon={CreditCard} label="Billing & plans" active={isActive("/billing")} onClick={() => setOpen(false)} />
            <MenuLink to="/notifications" icon={Bell} label="Notifications" active={isActive("/notifications")} onClick={() => setOpen(false)} badge="3" />
          </div>
          <div className="p-1 border-t border-border/30">
            <MenuLink to="/admin" icon={Shield} label="Admin panel" active={isActive("/admin")} onClick={() => setOpen(false)} tone="admin" />
          </div>
          <div className="p-1 border-t border-border/30">
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                try {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                } catch {
                  /* ignore */
                }
                router.push("/login");
                router.refresh();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-surface-raised/60"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  tone,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  tone?: "admin";
}) {
  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
        active
          ? tone === "admin"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
          : tone === "admin"
            ? "text-destructive/80 hover:text-destructive hover:bg-destructive/5"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-raised/60"
      }`}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-surface-raised text-muted-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavSection({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[];
  isActive: (to: string) => boolean;
}) {
  return (
    <div className="mb-5">
      <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-raised/60"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />
              )}
              <Icon className="size-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    active ? "bg-primary/20 text-primary" : "bg-surface-raised text-muted-foreground"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
