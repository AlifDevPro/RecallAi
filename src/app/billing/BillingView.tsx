"use client";

import { Check, Sparkles, Zap, Crown, Building2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

const plans = [
  {
    name: "Free",
    price: { m: 0, y: 0 },
    icon: Zap,
    desc: "For casual learners exploring spaced repetition.",
    features: ["Up to 3 topics", "100 AI-generated cards/mo", "Basic analytics", "Community support"],
    cta: "Current plan",
    current: true,
  },
  {
    name: "Pro",
    price: { m: 9, y: 84 },
    icon: Crown,
    desc: "For serious learners who want full power.",
    features: [
      "Unlimited topics & cards",
      "Unlimited AI tutor chat",
      "Voice + handwriting input",
      "Advanced retention analytics",
      "Priority AI gateway",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: { m: 24, y: 240 },
    icon: Building2,
    desc: "For study groups, classrooms, and teams.",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared decks & collaboration",
      "Team analytics dashboard",
      "Admin controls",
    ],
    cta: "Start team trial",
  },
];

export function BillingView() {
  const [cycle, setCycle] = useState<"m" | "y">("m");
  const [billing, setBilling] = useState({
    plan: "free",
    usedPct: 0,
    quota: 1000,
    used: 0,
    invoices: [] as { id: string; date: string; amount: string; status: string }[],
  });

  useEffect(() => {
    fetch("/api/me/billing")
      .then((r) => r.json())
      .then((d) =>
        setBilling({
          plan: d.plan ?? "free",
          usedPct: d.usedPct ?? 0,
          quota: d.quota ?? 1000,
          used: d.used ?? 0,
          invoices: d.invoices ?? [],
        })
      )
      .catch(() => {});
  }, []);

  const currentPlanName = billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1);
  const planKey = billing.plan.toLowerCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <MobileNav />
      <div className="lg:ml-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-6 py-8 lg:py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the plan that fits your learning ambitions.
            </p>
          </div>

          {/* Current plan summary */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-transparent to-accent/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current plan</div>
                <div className="font-bold text-lg">{currentPlanName} · {billing.usedPct}% of monthly AI quota used</div>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${billing.usedPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                <span>{billing.used} / {billing.quota} AI calls</span>
                <span>{billing.usedPct}% used</span>
              </div>
            </div>
          </div>

          {/* Cycle toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1 rounded-xl bg-surface border border-border/30">
              {(["m", "y"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {c === "m" ? "Monthly" : "Yearly"}
                  {c === "y" && (
                    <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-good/20 text-good">
                      -20%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {plans.map((p) => {
              const isCurrent = p.name.toLowerCase() === planKey;
              return (
              <div
                key={p.name}
                className={`relative p-6 rounded-2xl border transition-all ${
                  p.highlighted
                    ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/40"
                    : "bg-surface border-border/30"
                }`}
              >
                {p.highlighted && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center ${
                      p.highlighted ? "bg-primary/20 text-primary" : "bg-surface-raised text-muted-foreground"
                    }`}
                  >
                    <p.icon className="size-5" />
                  </div>
                  <div className="font-bold text-lg">{p.name}</div>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-bold font-mono">${p.price[cycle]}</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    /{cycle === "m" ? "mo" : "yr"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5 min-h-[32px]">{p.desc}</p>
                <button
                  disabled
                  title={!isCurrent ? "Payment integration not configured" : undefined}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors mb-5 bg-surface-raised text-muted-foreground cursor-not-allowed"
                >
                  {isCurrent ? "Current plan" : "Contact sales"}
                </button>
                <ul className="space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-muted-foreground">
                      <Check className="size-4 text-good mt-0.5 shrink-0" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
            })}
          </div>

          {/* Invoices */}
          <div className="rounded-2xl bg-surface border border-border/30 overflow-hidden">
            <div className="p-5 border-b border-border/20">
              <h3 className="font-semibold">Invoice history</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/20">
                  <th className="text-left font-medium px-5 py-2.5">Invoice</th>
                  <th className="text-left font-medium px-5 py-2.5">Date</th>
                  <th className="text-left font-medium px-5 py-2.5">Amount</th>
                  <th className="text-left font-medium px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {billing.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No invoices yet. Invoices appear here after a paid plan is activated.
                    </td>
                  </tr>
                ) : (
                  billing.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/10 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs">{inv.id}</td>
                      <td className="px-5 py-3 text-muted-foreground">{inv.date}</td>
                      <td className="px-5 py-3 font-mono font-semibold">{inv.amount}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-good/15 text-good capitalize">
                          <span className="size-1.5 rounded-full bg-current" />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button type="button" disabled className="size-8 rounded-md text-muted-foreground opacity-40" title="Download not available">
                          <Download className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
