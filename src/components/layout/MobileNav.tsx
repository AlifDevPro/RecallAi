"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  Menu,
  X,
  LayoutDashboard,
  Zap,
  Layers,
  BarChart3,
  MessageSquare,
  Target,
  Settings,
  Flame,
  Bell,
  CreditCard,
  Shield,
  CalendarDays,
  Trophy,
  UserCircle,
  ClipboardCheck,
  Library,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const sections = [
  {
    label: "Learn",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/schedule", label: "Schedule", icon: CalendarDays },
      { to: "/review", label: "Review", icon: Zap },
      { to: "/topics", label: "Topics", icon: Layers },
      { to: "/quiz", label: "Quiz", icon: BrainCircuit },
      { to: "/mock", label: "Mock Tests", icon: ClipboardCheck },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { to: "/goals", label: "Goals", icon: Target },
      { to: "/tutor", label: "AI Tutor", icon: MessageSquare },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/questions", label: "Question Bank", icon: Library },
      { to: "/contributors", label: "Contributors", icon: Users },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Profile",
    items: [
      { to: "/profile", label: "Your profile", icon: UserCircle },
      { to: "/billing", label: "Billing & plans", icon: CreditCard },
      { to: "/admin", label: "Admin panel", icon: Shield },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-dim/95 backdrop-blur-xl border-b border-border/30 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BrainCircuit className="size-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">Recall AI</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/notifications"
            className="size-9 flex items-center justify-center rounded-md hover:bg-surface-raised relative"
          >
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="size-9 flex items-center justify-center rounded-md hover:bg-surface-raised transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 top-14 bg-background/95 backdrop-blur-xl z-40 overflow-y-auto">
          <div className="p-4 space-y-6">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="px-3 mb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </div>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.to ||
                      pathname.startsWith(item.to + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        href={item.to}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
            <div className="pt-4 border-t border-border/20 flex items-center gap-3">
              <Flame className="size-4 text-hard" />
              <span className="text-sm font-medium">14 day streak</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
