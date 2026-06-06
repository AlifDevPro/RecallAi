"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Users,
  Activity,
  Cpu,
  DollarSign,
  AlertTriangle,
  Search,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Server,
  Database,
  Zap,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Flag,
  Layers,
  TrendingUp,
  MailCheck,
  MailWarning,
  KeyRound,
  UserCog,
  LogIn,
  Send,
  ShieldCheck,
  Lock,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const TABS = ["Overview", "Users", "Content", "AI Usage", "Billing", "System", "Moderation"] as const;
type Tab = (typeof TABS)[number];

type Role = "owner" | "admin" | "moderator" | "member";
type UserRow = {
  name: string;
  email: string;
  plan: "Free" | "Pro" | "Team";
  role: Role;
  joined: string;
  streak: number;
  status: "active" | "trial" | "churned" | "suspended";
  verified: boolean;
  mfa: boolean;
  lastSeen: string;
};

const users: UserRow[] = [
  { name: "Alex Chen", email: "alex@acme.dev", plan: "Pro", role: "owner", joined: "Mar 12", streak: 42, status: "active", verified: true, mfa: true, lastSeen: "2m ago" },
  { name: "Maya Rodriguez", email: "maya@med.school", plan: "Pro", role: "admin", joined: "Mar 09", streak: 28, status: "active", verified: true, mfa: true, lastSeen: "12m ago" },
  { name: "Jin Park", email: "jin@gmail.com", plan: "Free", role: "member", joined: "Mar 08", streak: 14, status: "active", verified: true, mfa: false, lastSeen: "1h ago" },
  { name: "Sara El-Amin", email: "sara@biotech.co", plan: "Team", role: "moderator", joined: "Mar 02", streak: 7, status: "trial", verified: false, mfa: false, lastSeen: "3h ago" },
  { name: "Diego Hart", email: "diego@hart.io", plan: "Free", role: "member", joined: "Feb 28", streak: 0, status: "churned", verified: false, mfa: false, lastSeen: "9d ago" },
  { name: "Priya Nair", email: "priya@nair.dev", plan: "Pro", role: "member", joined: "Feb 24", streak: 61, status: "active", verified: true, mfa: true, lastSeen: "23m ago" },
  { name: "Kenji Watanabe", email: "kenji@osaka.jp", plan: "Pro", role: "moderator", joined: "Feb 20", streak: 19, status: "active", verified: true, mfa: false, lastSeen: "5h ago" },
  { name: "Nora Ibrahim", email: "nora@ibrahim.me", plan: "Free", role: "member", joined: "Feb 18", streak: 3, status: "suspended", verified: false, mfa: false, lastSeen: "2d ago" },
];

const aiCalls = [
  { model: "gemini-3-flash", category: "Card generation", calls: 14823, tokens: "9.2M", cost: 142.7 },
  { model: "gemini-3-flash", category: "Tutor chat", calls: 8420, tokens: "5.1M", cost: 78.4 },
  { model: "gemini-3-pro", category: "Quiz scoring", calls: 3104, tokens: "1.8M", cost: 92.1 },
  { model: "gpt-5-mini", category: "Embeddings", calls: 22090, tokens: "12.4M", cost: 64.0 },
];

const moderation = [
  { id: "F-2841", type: "Inappropriate card", user: "diego@hart.io", reported: "2h ago", severity: "high" },
  { id: "F-2840", type: "Spam topic", user: "anon-9281", reported: "5h ago", severity: "medium" },
  { id: "F-2839", type: "AI hallucination", user: "priya@nair.dev", reported: "1d ago", severity: "low" },
];

export function AdminView() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    dailyActive: [] as number[],
  });

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => {
        setOverview({
          totalUsers: d.totalUsers ?? 0,
          totalSubmissions: d.totalSubmissions ?? 0,
          dailyActive: d.dailyActive ?? [],
        });
      })
      .catch(() => {});
  }, []);

  const activeToday = overview.dailyActive[overview.dailyActive.length - 1] ?? 0;
  const visibleTabs = TABS.filter((t) =>
    ["Overview", "Users", "AI Usage", "Moderation"].includes(t)
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-6 py-8 lg:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/30 text-xs font-medium text-destructive mb-3">
                <Shield className="size-3.5" />
                Admin · Restricted access
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Platform admin</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Operate Recall AI — users, content moderation, AI spend, and system health.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="size-2 rounded-full bg-good animate-pulse" />
              <span className="font-mono text-muted-foreground">All systems operational</span>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <KPI label="Total users" value={String(overview.totalUsers)} delta="live" trend="up" icon={Users} />
            <KPI label="Active today" value={String(activeToday)} delta="30d chart" trend="up" icon={Activity} />
            <KPI label="Submissions" value={String(overview.totalSubmissions)} delta="pending review" trend="up" icon={Layers} />
            <KPI label="AI usage" value="View tab" delta="details" trend="up" icon={Cpu} />
          </div>

          {/* Tabs */}
          <div className="border-b border-border/30 mb-8 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {visibleTabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-3 text-sm font-medium relative transition-colors ${
                    tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {tab === t && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Panels */}
          {tab === "Overview" && <OverviewPanel />}
          {tab === "Users" && <UsersPanel />}
          {tab === "AI Usage" && <AIPanel />}
          {tab === "Moderation" && <ModerationPanel />}
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  warn,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  icon: React.ComponentType<{ className?: string }>;
  warn?: boolean;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border/30">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`size-4 ${warn ? "text-hard" : "text-muted-foreground"}`} />
        <div
          className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 ${
            trend === "up" ? "text-good" : "text-again"
          }`}
        >
          {trend === "up" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {delta}
        </div>
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function OverviewPanel() {
  const [dailyActive, setDailyActive] = useState<number[]>([]);
  const [planDist, setPlanDist] = useState({ free: 64, pro: 28, team: 8 });
  const [topTopics, setTopTopics] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.dailyActive) setDailyActive(d.dailyActive);
        if (d.planDistribution) setPlanDist(d.planDistribution);
        if (d.topTopics) setTopTopics(d.topTopics);
      })
      .catch(() => {});
  }, []);

  const chartData = dailyActive.length ? dailyActive : Array.from({ length: 30 }, (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 0.7) * 40)));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-border/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">Daily active learners</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
          </div>
          <div className="flex gap-1 text-xs">
            {["24h", "7d", "30d", "All"].map((r) => (
              <button
                key={r}
                className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
                  r === "30d"
                    ? "bg-surface-raised text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 flex items-end gap-1">
          {chartData.map((v, i) => {
            const max = Math.max(...chartData, 1);
            const h = Math.round((v / max) * 100);
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-primary/60 to-primary/20 rounded-t-sm hover:from-primary hover:to-primary/40 transition-colors"
                style={{ height: `${Math.max(4, h)}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
          <span>30d ago</span>
          <span>15d</span>
          <span>Today</span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="p-5 rounded-2xl bg-surface border border-border/30">
          <h3 className="text-sm font-semibold mb-4">Plan distribution</h3>
          <div className="space-y-3">
            {[
              { name: "Free", pct: planDist.free, color: "bg-muted-foreground" },
              { name: "Pro", pct: planDist.pro, color: "bg-primary" },
              { name: "Team", pct: planDist.team, color: "bg-accent" },
            ].map((p) => (
              <div key={p.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>{p.name}</span>
                  <span className="font-mono text-muted-foreground">{p.pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div className={`h-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-surface border border-border/30">
          <h3 className="text-sm font-semibold mb-3">Top topics</h3>
          <ul className="space-y-2 text-sm">
            {(topTopics.length ? topTopics : [{ name: "—", count: 0 }]).map((t) => (
              <li key={t.name} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.name}</span>
                <span className="font-mono">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const ROLE_META: Record<Role, { label: string; c: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner: { label: "Owner", c: "bg-accent/15 text-accent border-accent/30", icon: ShieldCheck },
  admin: { label: "Admin", c: "bg-primary/15 text-primary border-primary/30", icon: Shield },
  moderator: { label: "Moderator", c: "bg-hard/15 text-hard border-hard/30", icon: UserCog },
  member: { label: "Member", c: "bg-surface-raised text-muted-foreground border-border/30", icon: Users },
};

function UsersPanel() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [verifFilter, setVerifFilter] = useState<"all" | "verified" | "unverified">("all");
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUserRows(
          (d.users ?? []).map((u: { name: string; email: string; plan: string; role: string; joined: string; verified: boolean }) => ({
            name: u.name,
            email: u.email,
            plan: u.plan as UserRow["plan"],
            role: (u.role === "admin" ? "admin" : "member") as Role,
            joined: u.joined,
            streak: 0,
            status: "active" as const,
            verified: u.verified,
            mfa: false,
            lastSeen: "—",
          }))
        );
      })
      .catch(() => setUserRows([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return userRows.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (verifFilter === "verified" && !u.verified) return false;
      if (verifFilter === "unverified" && u.verified) return false;
      if (query && !`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, roleFilter, verifFilter, userRows]);

  const unverifiedCount = userRows.filter((u) => !u.verified).length;

  return (
    <div className="space-y-5">
      {/* RBAC + verification summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RoleStat role="owner" count={userRows.filter((u) => u.role === "owner").length} />
        <RoleStat role="admin" count={userRows.filter((u) => u.role === "admin").length} />
        <RoleStat role="moderator" count={userRows.filter((u) => u.role === "moderator").length} />
        <div className="p-4 rounded-xl bg-surface border border-border/30 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-hard/15 text-hard flex items-center justify-center">
            <MailWarning className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight">{unverifiedCount}</div>
            <div className="text-[11px] text-muted-foreground">Pending email verification</div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl bg-surface border border-border/30 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 border-b border-border/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-raised text-sm border border-border/30 focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegFilter
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as typeof roleFilter)}
              options={[
                { value: "all", label: "All roles" },
                { value: "owner", label: "Owner" },
                { value: "admin", label: "Admin" },
                { value: "moderator", label: "Mod" },
                { value: "member", label: "Member" },
              ]}
            />
            <SegFilter
              value={verifFilter}
              onChange={(v) => setVerifFilter(v as typeof verifFilter)}
              options={[
                { value: "all", label: "Any" },
                { value: "verified", label: "Verified" },
                { value: "unverified", label: "Unverified" },
              ]}
            />
            <div className="ml-auto flex gap-2 text-xs">
              <button className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border/30 hover:border-border/60">
                Export CSV
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium inline-flex items-center gap-1.5">
                <Send className="size-3.5" /> Invite admin
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border/20">
                <th className="text-left font-medium px-4 py-2.5">User</th>
                <th className="text-left font-medium px-4 py-2.5">Role</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Email</th>
                <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Plan</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Security</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-left font-medium px-4 py-2.5 hidden xl:table-cell">Last seen</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const RoleIcon = ROLE_META[u.role].icon;
                return (
                  <tr
                    key={u.email}
                    className="border-b border-border/10 hover:bg-surface-raised/40 cursor-pointer"
                    onClick={() => setSelected(u)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-border/30 flex items-center justify-center text-[10px] font-bold">
                          {u.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium leading-tight truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground lg:hidden truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${ROLE_META[u.role].c}`}>
                        <RoleIcon className="size-3" />
                        {ROLE_META[u.role].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                        {u.verified ? (
                          <MailCheck className="size-3.5 text-good shrink-0" aria-label="Verified" />
                        ) : (
                          <MailWarning className="size-3.5 text-hard shrink-0" aria-label="Unverified" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          u.plan === "Pro"
                            ? "bg-primary/15 text-primary"
                            : u.plan === "Team"
                              ? "bg-accent/15 text-accent"
                              : "bg-surface-raised text-muted-foreground"
                        }`}
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                            u.mfa ? "bg-good/15 text-good" : "bg-surface-raised text-muted-foreground"
                          }`}
                          title={u.mfa ? "MFA enabled" : "MFA off"}
                        >
                          <Lock className="size-3" /> 2FA
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell font-mono text-xs text-muted-foreground">
                      {u.lastSeen}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelected(u)}
                        className="size-8 rounded-md hover:bg-surface-raised flex items-center justify-center text-muted-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!usersLoading && userRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.length === 0 && userRows.length > 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No users match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function RoleStat({ role, count }: { role: Role; count: number }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <div className="p-4 rounded-xl bg-surface border border-border/30 flex items-center gap-3">
      <div className={`size-10 rounded-lg border flex items-center justify-center ${meta.c}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-lg font-bold leading-tight">{count}</div>
        <div className="text-[11px] text-muted-foreground">{meta.label}s</div>
      </div>
    </div>
  );
}

function SegFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-surface-raised border border-border/30 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md transition-colors ${
            value === o.value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function UserDrawer({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [role, setRole] = useState<Role>(user.role);
  const RoleIcon = ROLE_META[role].icon;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-surface border-l border-border/40 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="text-sm font-semibold">User details</div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-surface-raised flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold text-primary-foreground">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-base leading-tight">{user.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {user.email}
                {user.verified ? (
                  <MailCheck className="size-3.5 text-good" />
                ) : (
                  <MailWarning className="size-3.5 text-hard" />
                )}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                Joined {user.joined} · Last seen {user.lastSeen}
              </div>
            </div>
          </div>

          {/* Email verification */}
          <section className="p-4 rounded-xl border border-border/30 bg-surface-raised/40">
            <div className="flex items-start gap-3">
              <div className={`size-9 rounded-lg flex items-center justify-center ${
                user.verified ? "bg-good/15 text-good" : "bg-hard/15 text-hard"
              }`}>
                {user.verified ? <MailCheck className="size-4" /> : <MailWarning className="size-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">
                  {user.verified ? "Email verified" : "Email not verified"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {user.verified
                    ? "Owner has confirmed their inbox. No action needed."
                    : "Send a fresh verification link or manually mark verified after manual review."}
                </div>
                {!user.verified && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
                      <Send className="size-3.5" /> Resend verification
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/40 text-xs font-medium hover:bg-surface-raised">
                      <CheckCircle2 className="size-3.5 text-good" /> Mark as verified
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Role / RBAC */}
          <section>
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Role & permissions
            </h4>
            <div className="p-4 rounded-xl border border-border/30 bg-surface-raised/40">
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${ROLE_META[role].c}`}>
                  <RoleIcon className="size-3" />
                  {ROLE_META[role].label}
                </span>
                <span className="text-[11px] text-muted-foreground">Currently assigned</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(ROLE_META) as Role[]).map((r) => {
                  const m = ROLE_META[r];
                  const Icon = m.icon;
                  return (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        role === r
                          ? `${m.c} border-current`
                          : "bg-surface border-border/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Owners can transfer ownership. Admins manage users, content and billing.
                Moderators can review reports only. Members have no admin surface.
              </p>
            </div>
          </section>

          {/* Security */}
          <section>
            <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Security
            </h4>
            <div className="rounded-xl border border-border/30 divide-y divide-border/20 overflow-hidden">
              <SecRow icon={Lock} label="Two-factor auth" value={user.mfa ? "Enabled (TOTP)" : "Disabled"} ok={user.mfa} />
              <SecRow icon={KeyRound} label="Active sessions" value="3 devices" />
              <SecRow icon={ShieldCheck} label="Suspicious logins" value="None in 30d" ok />
            </div>
          </section>

          {/* Actions */}
          <section className="grid grid-cols-2 gap-2">
            <DrawerAction icon={KeyRound} label="Send password reset" />
            <DrawerAction icon={LogIn} label="Impersonate user" />
            <DrawerAction icon={Lock} label="Force sign-out" />
            <DrawerAction icon={Ban} label="Suspend account" danger />
          </section>
        </div>
      </div>
    </div>
  );
}

function SecRow({
  icon: Icon, label, value, ok,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-surface">
      <Icon className={`size-4 ${ok ? "text-good" : "text-muted-foreground"}`} />
      <div className="flex-1 text-xs">{label}</div>
      <div className={`text-xs font-mono ${ok ? "text-good" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function DrawerAction({
  icon: Icon, label, danger,
}: { icon: React.ComponentType<{ className?: string }>; label: string; danger?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
        danger
          ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20"
          : "bg-surface-raised border-border/30 text-foreground hover:border-border/60"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    active: { c: "bg-good/15 text-good", label: "Active" },
    trial: { c: "bg-accent/15 text-accent", label: "Trial" },
    churned: { c: "bg-muted text-muted-foreground", label: "Churned" },
    suspended: { c: "bg-destructive/15 text-destructive", label: "Suspended" },
  };
  const m = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${m.c}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

function ContentPanel() {
  const topics = [
    { name: "Pharmacology Essentials", owner: "system", cards: 1204, learners: 4280, quality: 94 },
    { name: "System Design Patterns", owner: "alex@acme.dev", cards: 312, learners: 3104, quality: 88 },
    { name: "Spanish A2 Vocabulary", owner: "system", cards: 820, learners: 2812, quality: 91 },
    { name: "USMLE Step 1 Mix", owner: "maya@med.school", cards: 2104, learners: 1820, quality: 96 },
  ];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {topics.map((t) => (
        <div key={t.name} className="p-5 rounded-2xl bg-surface border border-border/30">
          <div className="flex items-start justify-between mb-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="size-4 text-primary" />
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">{t.owner}</div>
          </div>
          <h4 className="font-semibold text-sm mb-3 leading-tight">{t.name}</h4>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            <Mini label="Cards" value={t.cards.toLocaleString()} />
            <Mini label="Learners" value={t.learners.toLocaleString()} />
            <Mini label="Quality" value={`${t.quality}%`} accent />
          </div>
          <div className="flex gap-2 text-xs">
            <button className="flex-1 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-border/20">
              View
            </button>
            <button className="flex-1 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-raised/80 border border-border/20">
              Audit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-sm font-bold font-mono ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

type AiUsageRow = {
  model: string;
  provider: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
};

function AIPanel() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-usage")
      .then((r) => r.json())
      .then((d) => {
        const summary = (d.summary ?? []) as {
          model: string;
          provider: string;
          calls: number;
          tokensIn: number;
          tokensOut: number;
        }[];
        setRows(
          summary.map((s) => ({
            model: s.model,
            provider: s.provider,
            calls: s.calls,
            tokensIn: s.tokensIn,
            tokensOut: s.tokensOut,
          }))
        );
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const display =
    rows.length > 0
      ? rows.map((r) => ({
          model: r.model,
          category: r.provider,
          calls: r.calls,
          tokens: `${((r.tokensIn + r.tokensOut) / 1000).toFixed(1)}k`,
          cost: (r.calls * 0.01).toFixed(2),
        }))
      : aiCalls.map((c) => ({
          model: c.model,
          category: c.category,
          calls: c.calls,
          tokens: c.tokens,
          cost: String(c.cost),
        }));

  const total = display.reduce((s, c) => s + Number(c.cost), 0);
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="p-5 rounded-2xl bg-surface border border-border/30">
          <div className="text-xs text-muted-foreground mb-1">Cost MTD</div>
          <div className="text-2xl font-bold font-mono">${total.toFixed(2)}</div>
          <div className="text-[10px] text-good font-mono mt-1">68% of budget</div>
          <div className="mt-3 h-1.5 bg-surface-raised rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: "68%" }} />
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-surface border border-border/30">
          <div className="text-xs text-muted-foreground mb-1">Avg latency</div>
          <div className="text-2xl font-bold font-mono">412 ms</div>
          <div className="text-[10px] text-good font-mono mt-1">-9% vs last week</div>
        </div>
        <div className="p-5 rounded-2xl bg-surface border border-border/30">
          <div className="text-xs text-muted-foreground mb-1">Error rate</div>
          <div className="text-2xl font-bold font-mono">0.42%</div>
          <div className="text-[10px] text-hard font-mono mt-1">+0.1% spike at 14:20 UTC</div>
        </div>
      </div>
      <div className="rounded-2xl bg-surface border border-border/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border/20">
              <th className="text-left font-medium px-4 py-2.5">Model</th>
              <th className="text-left font-medium px-4 py-2.5">Category</th>
              <th className="text-right font-medium px-4 py-2.5">Calls</th>
              <th className="text-right font-medium px-4 py-2.5">Tokens</th>
              <th className="text-right font-medium px-4 py-2.5">Cost</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Loading usage…
                </td>
              </tr>
            ) : (
              display.map((c) => (
                <tr key={c.model + c.category} className="border-b border-border/10 hover:bg-surface-raised/40">
                  <td className="px-4 py-3 font-mono text-xs">{c.model}</td>
                  <td className="px-4 py-3">{c.category}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.calls.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{c.tokens}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">${Number(c.cost).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillingPanel() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-border/30">
        <h3 className="font-semibold mb-1">Revenue</h3>
        <p className="text-xs text-muted-foreground mb-6">Last 12 months · MRR breakdown</p>
        <div className="h-48 flex items-end gap-3">
          {Array.from({ length: 12 }, (_, i) => {
            const free = 20 + Math.sin(i) * 5;
            const pro = 30 + i * 3;
            const team = 8 + i * 1.5;
            return (
              <div key={i} className="flex-1 flex flex-col-reverse gap-0.5">
                <div className="rounded-b-sm bg-muted-foreground/40" style={{ height: `${free}%` }} />
                <div className="bg-primary" style={{ height: `${pro}%` }} />
                <div className="rounded-t-sm bg-accent" style={{ height: `${team}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
          {"JFMAMJJASOND".split("").map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
      <div className="p-6 rounded-2xl bg-surface border border-border/30">
        <h3 className="font-semibold mb-4">Recent invoices</h3>
        <ul className="space-y-3 text-sm">
          {[
            ["INV-1042", "$1,840", "paid"],
            ["INV-1041", "$1,720", "paid"],
            ["INV-1040", "$1,510", "paid"],
            ["INV-1039", "$1,460", "refunded"],
          ].map(([id, amt, status]) => (
            <li key={id} className="flex items-center justify-between">
              <div>
                <div className="font-mono text-xs">{id}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{status}</div>
              </div>
              <div className="font-mono font-semibold">{amt}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SystemPanel() {
  const services = [
    { name: "API gateway", status: "ok", uptime: "99.998%", latency: "42ms", icon: Server },
    { name: "Postgres primary", status: "ok", uptime: "99.99%", latency: "8ms", icon: Database },
    { name: "AI gateway", status: "warn", uptime: "99.92%", latency: "412ms", icon: Cpu },
    { name: "Edge functions", status: "ok", uptime: "99.97%", latency: "61ms", icon: Zap },
  ];
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {services.map((s) => (
          <div key={s.name} className="p-5 rounded-2xl bg-surface border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <s.icon className="size-4 text-muted-foreground" />
              {s.status === "ok" ? (
                <CheckCircle2 className="size-4 text-good" />
              ) : (
                <AlertTriangle className="size-4 text-hard" />
              )}
            </div>
            <div className="font-semibold text-sm mb-3">{s.name}</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <div className="text-muted-foreground">Uptime</div>
                <div className="font-bold text-foreground text-xs">{s.uptime}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Latency</div>
                <div className="font-bold text-foreground text-xs">{s.latency}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 rounded-2xl bg-surface border border-border/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" /> Live activity stream
        </h3>
        <ul className="space-y-2 text-xs font-mono">
          {[
            { t: "14:42:01", c: "POST /api/cards/generate", s: "200", ms: 612 },
            { t: "14:41:58", c: "GET  /api/dashboard", s: "200", ms: 41 },
            { t: "14:41:54", c: "POST /api/tutor/chat", s: "200", ms: 901 },
            { t: "14:41:50", c: "POST /api/auth/login", s: "200", ms: 88 },
            { t: "14:41:42", c: "POST /api/cards/review", s: "429", ms: 12, err: true },
            { t: "14:41:31", c: "POST /api/topics", s: "201", ms: 153 },
          ].map((l, i) => (
            <li key={i} className="flex items-center gap-3 py-1.5 border-b border-border/10 last:border-0">
              <span className="text-muted-foreground">{l.t}</span>
              <span className="flex-1 truncate">{l.c}</span>
              <span className={l.err ? "text-destructive font-semibold" : "text-good"}>{l.s}</span>
              <span className="text-muted-foreground w-12 text-right">{l.ms}ms</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type SubmissionRow = {
  id: string;
  status: string;
  institution: string;
  course: string;
  topic: string;
  created_at: string;
  questionCount?: number;
};

function ModerationPanel() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewDetail, setReviewDetail] = useState<{
    submission: Record<string, unknown>;
    questions: Record<string, unknown>[];
  } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [moderationMessage, setModerationMessage] = useState<{
    type: "success" | "error";
    text: string;
    paperId?: string;
  } | null>(null);

  const loadSubmissions = () => {
    fetch("/api/admin/submissions")
      .then((r) => r.json())
      .then((d) => setSubmissions(d.submissions ?? []))
      .catch(() => setSubmissions([]));
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const updateSubmissionStatus = async (id: string, status: string) => {
    setActionId(id);
    setModerationMessage(null);
    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as { error?: string; paperId?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Update failed");
      }
      if (status === "approved" && data.paperId) {
        setModerationMessage({
          type: "success",
          text: "Published to the Question Bank.",
          paperId: data.paperId,
        });
      } else if (status === "rejected") {
        setModerationMessage({ type: "success", text: "Submission rejected." });
      }
      loadSubmissions();
    } catch (e) {
      setModerationMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Update failed",
      });
    } finally {
      setActionId(null);
    }
  };

  const openReview = (id: string) => {
    setReviewId(id);
    fetch(`/api/admin/submissions/${id}`)
      .then((r) => r.json())
      .then((d) => setReviewDetail(d))
      .catch(() => setReviewDetail(null));
  };

  type ModItem = {
    id: string;
    severity: string;
    type: string;
    reported: string;
    user: string;
    rawId: string;
    status: string;
    questionCount: number;
  };

  const items: ModItem[] = submissions.map((s) => ({
    id: s.id.slice(0, 8),
    severity: s.status === "pending" ? "medium" : s.status === "rejected" ? "high" : "low",
    type: `Question upload — ${s.topic || s.course} (${s.questionCount} questions)`,
    reported: new Date(s.created_at).toLocaleDateString(),
    user: s.institution || "unknown",
    rawId: s.id,
    status: s.status,
    questionCount: s.questionCount ?? 0,
  }));

  return (
    <div className="space-y-4">
      {moderationMessage && (
        <div
          className={`p-3 rounded-xl border text-sm ${
            moderationMessage.type === "success"
              ? "bg-good/10 border-good/30 text-good"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <p>{moderationMessage.text}</p>
          {moderationMessage.paperId && (
            <Link
              href={`/questions/${moderationMessage.paperId}`}
              className="inline-block mt-2 font-semibold underline underline-offset-2"
            >
              View paper in Question Bank →
            </Link>
          )}
        </div>
      )}
      {items.length === 0 && (
        <div className="p-8 rounded-2xl border border-dashed border-border/40 text-center text-sm text-muted-foreground">
          No question submissions in the queue.
        </div>
      )}
      {items.map((m) => (
        <div
          key={m.id}
          className="p-5 rounded-2xl bg-surface border border-border/30 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div
            className={`size-10 rounded-lg flex items-center justify-center ${
              m.severity === "high"
                ? "bg-destructive/15 text-destructive"
                : m.severity === "medium"
                  ? "bg-hard/15 text-hard"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <Flag className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{m.id}</span>
              <span
                className={`px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  m.severity === "high"
                    ? "bg-destructive/15 text-destructive"
                    : m.severity === "medium"
                      ? "bg-hard/15 text-hard"
                      : "bg-surface-raised text-muted-foreground"
                }`}
              >
                {m.severity}
              </span>
            </div>
            <div className="font-semibold mt-1">{m.type}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Reported {m.reported} · by {m.user}
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => openReview(m.rawId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border/20 hover:border-border/60"
            >
              <Eye className="size-3.5" /> Review
            </button>
            {m.status === "pending" && (
              <>
                <button
                  type="button"
                  disabled={actionId === m.rawId}
                  onClick={() => void updateSubmissionStatus(m.rawId, "approved")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-good/10 text-good border border-good/20 hover:bg-good/20 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  {actionId === m.rawId ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={actionId === m.rawId}
                  onClick={() => void updateSubmissionStatus(m.rawId, "rejected")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 disabled:opacity-50"
                >
                  <Ban className="size-3.5" />
                  {actionId === m.rawId ? "Rejecting…" : "Reject"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      {reviewId && reviewDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={() => { setReviewId(null); setReviewDetail(null); }}>
          <div className="max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-2xl bg-surface border border-border p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Submission review</h3>
              <button type="button" onClick={() => { setReviewId(null); setReviewDetail(null); }} className="size-8 rounded-md hover:bg-surface-raised flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 mb-4">
              <div>{String(reviewDetail.submission.institution)} · {String(reviewDetail.submission.course)}</div>
              <div>{String(reviewDetail.submission.term)} {String(reviewDetail.submission.year ?? "")}</div>
              <div>Status: {String(reviewDetail.submission.status)}</div>
            </div>
            <ul className="space-y-2 text-sm">
              {reviewDetail.questions.map((q, i) => (
                <li key={i} className="p-2 rounded border border-border/40 bg-surface-raised/40">
                  {String(q.cleaned_text ?? q.raw_text ?? "").slice(0, 200)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <button className="w-full p-4 rounded-2xl border border-dashed border-border/40 text-sm text-muted-foreground hover:border-border hover:text-foreground transition-colors flex items-center justify-center gap-2">
        <XCircle className="size-4" /> Show resolved reports (87)
      </button>
    </div>
  );
}
