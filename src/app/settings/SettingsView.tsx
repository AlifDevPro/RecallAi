"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  FolderTree,
  Download,
  User,
  Mail,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function SettingsView() {
  const [notifTime, setNotifTime] = useState("09:00");
  const [maxCards, setMaxCards] = useState("30");
  const [sessionLength, setSessionLength] = useState("15");
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [notifStyle, setNotifStyle] = useState("detailed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me/settings")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings ?? {};
        if (s.notifTime) setNotifTime(s.notifTime);
        if (s.maxCards) setMaxCards(String(s.maxCards));
        if (s.sessionLength) setSessionLength(String(s.sessionLength));
        if (typeof s.weeklyEmail === "boolean") setWeeklyEmail(s.weeklyEmail);
        if (s.notifStyle) setNotifStyle(s.notifStyle);
      })
      .catch(() => {});
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { notifTime, maxCards, sessionLength, weeklyEmail, notifStyle },
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <button onClick={saveSettings} disabled={saving} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>

          <div className="space-y-8">
            {/* Notifications */}
            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="text-xs text-muted-foreground">When and how we remind you</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Daily reminder time</label>
                  <input
                    type="time"
                    value={notifTime}
                    onChange={(e) => setNotifTime(e.target.value)}
                    className="h-10 px-3 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Notification style</label>
                  <div className="flex items-center gap-2 bg-surface-raised rounded-xl p-1 border border-border/20">
                    {(["brief", "detailed"] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setNotifStyle(style)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                          notifStyle === style ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Weekly analytics email</label>
                  <button
                    onClick={() => setWeeklyEmail(!weeklyEmail)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      weeklyEmail ? "bg-primary" : "bg-surface-raised border border-border"
                    }`}
                  >
                    <div
                      className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
                        weeklyEmail ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Study Preferences */}
            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Study Preferences</h2>
                  <p className="text-xs text-muted-foreground">How you want to learn</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Default session length</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={sessionLength}
                      onChange={(e) => setSessionLength(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm font-mono w-12">{sessionLength}m</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="text-sm font-medium">Max new cards per day</label>
                  <input
                    type="number"
                    value={maxCards}
                    onChange={(e) => setMaxCards(e.target.value)}
                    min="5"
                    max="100"
                    className="h-10 w-24 px-3 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                  />
                </div>
              </div>
            </section>

            {/* Topic Organization */}
            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderTree className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Topic Organization</h2>
                  <p className="text-xs text-muted-foreground">Manage your learning topics</p>
                </div>
              </div>

              <div className="space-y-2">
                {["Algorithms", "Database Systems", "Python", "System Design"].map((topic, i) => (
                  <div key={topic} className="flex items-center justify-between p-3 rounded-xl bg-surface-raised/50">
                    <span className="text-sm font-medium">{topic}</span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {i > 0 ? "Move up" : ""}
                      </button>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {i < 3 ? "Move down" : ""}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Account */}
            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Account</h2>
                  <p className="text-xs text-muted-foreground">Your profile and data</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Display name</label>
                  <input
                    type="text"
                    defaultValue="Alex Chen"
                    className="w-full h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground" />
                    <input
                      type="email"
                      defaultValue="alex@example.com"
                      className="flex-1 h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select className="w-full h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40">
                    <option>UTC-8 (Pacific Time)</option>
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC+0 (GMT)</option>
                    <option>UTC+1 (CET)</option>
                    <option>UTC+8 (Singapore)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Data Export */}
            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Download className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Data Export</h2>
                  <p className="text-xs text-muted-foreground">Own your learning data</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised rounded-xl text-sm font-medium hover:bg-surface transition-colors">
                  <Download className="size-4" />
                  Export cards (JSON)
                </button>
                <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised rounded-xl text-sm font-medium hover:bg-surface transition-colors">
                  <Download className="size-4" />
                  Export review history
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-surface rounded-2xl border border-again/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-again/10 flex items-center justify-center">
                  <AlertTriangle className="size-5 text-again" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-again">Danger Zone</h2>
                  <p className="text-xs text-muted-foreground">Irreversible actions</p>
                </div>
              </div>

              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-again/10 text-again rounded-xl text-sm font-medium hover:bg-again/20 transition-colors">
                <Trash2 className="size-4" />
                Delete account and all data
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
