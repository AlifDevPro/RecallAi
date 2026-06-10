"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type TopicRow = { slug: string; name: string };

export function SettingsView() {
  const router = useRouter();
  const [notifTime, setNotifTime] = useState("09:00");
  const [maxCards, setMaxCards] = useState("30");
  const [sessionLength, setSessionLength] = useState("15");
  const [weeklyEmail, setWeeklyEmail] = useState(true);
  const [notifStyle, setNotifStyle] = useState("detailed");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [topicOrder, setTopicOrder] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/settings").then((r) => r.json()),
      fetch("/api/me/profile").then((r) => r.json()),
      fetch("/api/me/topics").then((r) => r.json()),
    ])
      .then(([settingsRes, profileRes, topicsRes]) => {
        const s = settingsRes.settings ?? {};
        if (s.notifTime) setNotifTime(s.notifTime);
        if (s.maxCards) setMaxCards(String(s.maxCards));
        if (s.sessionLength) setSessionLength(String(s.sessionLength));
        if (typeof s.weeklyEmail === "boolean") setWeeklyEmail(s.weeklyEmail);
        if (s.notifStyle) setNotifStyle(s.notifStyle);
        if (Array.isArray(s.topicOrder)) setTopicOrder(s.topicOrder);

        if (profileRes.profile) {
          setDisplayName(profileRes.profile.displayName ?? "");
          setEmail(profileRes.profile.email ?? "");
          setTimezone(profileRes.profile.timezone ?? "America/Los_Angeles");
        }

        const list = (topicsRes.topics ?? []).map((t: { slug: string; name: string }) => ({
          slug: t.slug,
          name: t.name,
        }));
        setTopics(list);
      })
      .catch(() => {});
  }, []);

  const orderedTopics = useMemo(() => {
    if (!topicOrder.length) return topics;
    const bySlug = new Map(topics.map((t) => [t.slug, t]));
    const ordered = topicOrder.map((slug) => bySlug.get(slug)).filter(Boolean) as TopicRow[];
    for (const t of topics) {
      if (!topicOrder.includes(t.slug)) ordered.push(t);
    }
    return ordered;
  }, [topics, topicOrder]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const [settingsRes, profileRes] = await Promise.all([
        fetch("/api/me/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            settings: { notifTime, maxCards, sessionLength, weeklyEmail, notifStyle, topicOrder },
          }),
        }),
        fetch("/api/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, timezone }),
        }),
      ]);
      if (!settingsRes.ok || !profileRes.ok) throw new Error("Save failed");
      setMessage({ type: "ok", text: "Settings saved." });
    } catch {
      setMessage({ type: "err", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const moveTopic = (slug: string, dir: -1 | 1) => {
    const slugs = orderedTopics.map((t) => t.slug);
    const idx = slugs.indexOf(slug);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= slugs.length) return;
    const copy = [...slugs];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setTopicOrder(copy);
  };

  const downloadExport = async (kind: "cards" | "reviews") => {
    setExporting(kind);
    setMessage(null);
    try {
      const res = await fetch(`/api/me/export/${kind}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recall-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: "err", text: "Export failed." });
    } finally {
      setExporting(null);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account and all data? This cannot be undone.")) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me/account", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push("/login");
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Delete failed." });
    } finally {
      setDeleting(false);
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

          {message && (
            <p className={`mb-4 text-sm rounded-lg px-3 py-2 border ${
              message.type === "ok"
                ? "text-good bg-good/10 border-good/30"
                : "text-again bg-again/10 border-again/30"
            }`}>
              {message.text}
            </p>
          )}

          <div className="space-y-8">
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

            <section className="bg-surface rounded-2xl border border-border/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderTree className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Topic Organization</h2>
                  <p className="text-xs text-muted-foreground">Reorder topics (saved with settings)</p>
                </div>
              </div>

              <div className="space-y-2">
                {orderedTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topics yet. Add one from the Topics page.</p>
                ) : (
                  orderedTopics.map((topic, i) => (
                    <div key={topic.slug} className="flex items-center justify-between p-3 rounded-xl bg-surface-raised/50">
                      <span className="text-sm font-medium">{topic.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveTopic(topic.slug, -1)}
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          disabled={i === orderedTopics.length - 1}
                          onClick={() => moveTopic(topic.slug, 1)}
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          Move down
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

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
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="flex-1 h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm text-muted-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                  >
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="Europe/London">GMT</option>
                    <option value="Europe/Paris">CET</option>
                    <option value="Asia/Singapore">Singapore</option>
                  </select>
                </div>
              </div>
            </section>

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
                <button
                  type="button"
                  disabled={exporting === "cards"}
                  onClick={() => void downloadExport("cards")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised rounded-xl text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
                >
                  <Download className="size-4" />
                  {exporting === "cards" ? "Exporting…" : "Export cards (JSON)"}
                </button>
                <button
                  type="button"
                  disabled={exporting === "reviews"}
                  onClick={() => void downloadExport("reviews")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-raised rounded-xl text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
                >
                  <Download className="size-4" />
                  {exporting === "reviews" ? "Exporting…" : "Export review history"}
                </button>
              </div>
            </section>

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

              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteAccount()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-again/10 text-again rounded-xl text-sm font-medium hover:bg-again/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                {deleting ? "Deleting…" : "Delete account and all data"}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
