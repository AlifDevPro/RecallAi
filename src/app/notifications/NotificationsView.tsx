"use client";

import {
  Bell,
  Zap,
  Trophy,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  CheckCheck,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type N = {
  id: string;
  type: "review" | "achievement" | "tutor" | "alert" | "ai" | string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const ICONS: Record<string, { icon: typeof Bell; tone: string }> = {
  review: { icon: Zap, tone: "bg-primary/15 text-primary" },
  achievement: { icon: Trophy, tone: "bg-hard/15 text-hard" },
  tutor: { icon: MessageSquare, tone: "bg-accent/15 text-accent" },
  alert: { icon: AlertTriangle, tone: "bg-destructive/15 text-destructive" },
  ai: { icon: Sparkles, tone: "bg-good/15 text-good" },
  info: { icon: Bell, tone: "bg-primary/15 text-primary" },
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsView() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<N[]>([]);

  const load = () => {
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((d) => {
        setItems(
          (d.notifications ?? []).map(
            (n: { id: string; type: string; title: string; body: string; read_at: string | null; created_at: string }) => ({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body,
              time: formatTime(n.created_at),
              unread: !n.read_at,
            })
          )
        );
      })
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/me/notifications/${id}/read`, { method: "PATCH" });
    load();
  };

  const markAllRead = async () => {
    await fetch("/api/me/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read-all" }),
    });
    load();
  };

  const filtered = filter === "all" ? items : items.filter((n) => n.unread);
  const unread = items.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                Notifications
                {unread > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary">
                    {unread} new
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Reviews, AI updates, and learning alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border/30 text-xs font-medium hover:border-border/60">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
          </div>

          <div className="flex gap-1 mb-5 border-b border-border/30">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm capitalize relative ${
                  filter === f ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                {f}
                {filter === f && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications yet.</p>
            ) : (
              filtered.map((n) => {
                const meta = ICONS[n.type] ?? ICONS.info;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => n.unread && markRead(n.id)}
                    className={`flex items-start gap-4 p-4 rounded-xl bg-surface border transition-colors cursor-pointer ${
                      n.unread ? "border-primary/20" : "border-border/20"
                    }`}
                  >
                    <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${meta.tone}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{n.title}</h3>
                        {n.unread && <span className="size-1.5 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                      <div className="text-[10px] font-mono text-muted-foreground mt-2">{n.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
