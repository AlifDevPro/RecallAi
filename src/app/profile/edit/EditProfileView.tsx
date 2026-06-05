"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Save, User, Mail, MapPin, Globe, Github, Linkedin, Sparkles } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Dropdown } from "@/components/ui/Dropdown";
import { AIButton } from "@/components/ui/AIButton";

export function EditProfileView() {
  const [level, setLevel] = useState("advanced");
  const [tz, setTz] = useState("America/Los_Angeles");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [bioLoading, setBioLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    fetch("/api/me/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setDisplayName(d.profile.displayName ?? "");
          setEmail(d.profile.email ?? "");
          setBio(d.profile.bio ?? "");
          setInitials(d.profile.initials ?? "?");
        }
      })
      .catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      if (!res.ok) throw new Error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const suggestBio = async () => {
    setBioLoading(true);
    try {
      const res = await fetch("/api/me/dashboard");
      const data = await res.json();
      if (data.insight) setBio(data.insight);
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 lg:py-10">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="size-4" /> Back to profile
          </Link>
          <div className="flex items-start justify-between gap-4 mb-7">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Edit profile</h1>
              <p className="text-sm text-muted-foreground mt-1">Update your identity, learning preferences and links.</p>
            </div>
            <button onClick={saveProfile} disabled={saving} className="hidden sm:inline-flex h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold items-center gap-2 disabled:opacity-50">
              <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {/* Avatar */}
          <section className="p-5 rounded-2xl bg-surface border border-border/40 mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Avatar</h2>
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">{initials}</div>
                <button className="absolute -bottom-1 -right-1 size-8 rounded-lg bg-foreground text-background flex items-center justify-center shadow-lg">
                  <Camera className="size-4" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex gap-2 flex-wrap">
                  <button className="h-9 px-3.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 text-sm font-medium text-foreground">Upload photo</button>
                  <AIButton size="sm">Generate avatar</AIButton>
                  <button className="h-9 px-3.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground">Remove</button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">PNG or JPG up to 2MB. Square images look best.</p>
              </div>
            </div>
          </section>

          {/* Identity */}
          <section className="p-5 rounded-2xl bg-surface border border-border/40 mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Identity</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Display name" icon={<User className="size-4" />} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input label="Email" icon={<Mail className="size-4" />} value={email} type="email" className="sm:col-span-2" readOnly />
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-foreground">Bio</label>
                  <AIButton size="sm" loading={bioLoading} onClick={suggestBio}>
                    Suggest bio
                  </AIButton>
                </div>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Medical student · prepping USMLE Step 1…"
                  className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
                />
                <div className="text-[11px] text-muted-foreground text-right mt-1">{bio.length} / 280</div>
              </div>
            </div>
          </section>

          {/* Learning */}
          <section className="p-5 rounded-2xl bg-surface border border-border/40 mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Learning preferences</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Dropdown
                label="Skill level"
                value={level}
                onChange={setLevel}
                options={[
                  { value: "beginner", label: "Beginner", description: "Just getting started" },
                  { value: "intermediate", label: "Intermediate", description: "Some experience" },
                  { value: "advanced", label: "Advanced", description: "Comfortable with the topic" },
                  { value: "expert", label: "Expert", description: "Teach others" },
                ]}
              />
              <Dropdown
                label="Timezone"
                value={tz}
                onChange={setTz}
                options={[
                  { value: "America/Los_Angeles", label: "Los Angeles", description: "GMT-8" },
                  { value: "America/New_York", label: "New York", description: "GMT-5" },
                  { value: "Europe/London", label: "London", description: "GMT+0" },
                  { value: "Asia/Tokyo", label: "Tokyo", description: "GMT+9" },
                ]}
              />
              <Input label="Location" icon={<MapPin className="size-4" />} defaultValue="San Francisco, CA" />
              <Input label="Primary goal" icon={<Sparkles className="size-4" />} defaultValue="USMLE Step 1 — 240+" />
            </div>
          </section>

          {/* Links */}
          <section className="p-5 rounded-2xl bg-surface border border-border/40 mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Social links</h2>
            <div className="space-y-3">
              <Input label="Website" icon={<Globe className="size-4" />} placeholder="https://yoursite.com" />
              <Input label="GitHub" icon={<Github className="size-4" />} placeholder="username" />
              <Input label="LinkedIn" icon={<Linkedin className="size-4" />} placeholder="username" />
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <Link href="/profile" className="h-10 px-4 rounded-xl border border-border bg-surface hover:bg-surface-raised text-sm font-medium text-foreground inline-flex items-center">Cancel</Link>
            <button onClick={saveProfile} disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
              <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label, icon, className, ...props
}: { label: string; icon?: React.ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
      <div className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-border bg-surface focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <input
          {...props}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
