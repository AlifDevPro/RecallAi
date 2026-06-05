import Link from "next/link";
import { BrainCircuit, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  badge?: string;
}

const points = [
  { icon: Sparkles, label: "AI-generated cards & plans" },
  { icon: Zap, label: "Adaptive spaced repetition" },
  { icon: ShieldCheck, label: "Encrypted & private by default" },
];

export function AuthLayout({ title, subtitle, children, footer, badge }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen bg-background text-foreground flex relative overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top left, color-mix(in oklab, var(--primary) 10%, transparent), transparent 55%), radial-gradient(ellipse at bottom right, color-mix(in oklab, var(--accent) 8%, transparent), transparent 55%)",
      }}
    >
      {/* Left: hero panel (desktop) */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] max-w-xl p-12 border-r border-border bg-surface/40">
        <Link href="/" className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BrainCircuit className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">Recall AI</div>
            <div className="text-[11px] font-mono text-muted-foreground">Never forget what you learn</div>
          </div>
        </Link>

        <div className="flex flex-col items-center text-center">
          <MemoryGraph />
          <h2 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-foreground">
            Study smarter.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Remember forever.
            </span>
          </h2>
          <ul className="mt-6 space-y-2.5 self-stretch">
            {points.map((p) => (
              <li key={p.label} className="flex items-center gap-3 text-sm text-foreground/90">
                <span className="relative size-3 shrink-0 rounded-full border-2 border-primary/60 flex items-center justify-center">
                  <span className="size-1 rounded-full bg-primary" />
                </span>
                <span className="flex items-center gap-2">
                  <p.icon className="size-3.5 text-muted-foreground" />
                  {p.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Recall AI · SOC 2 Type II in progress
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BrainCircuit className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">Recall AI</span>
          </Link>

          {badge && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider mb-3">
              {badge}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-6 pt-5 border-t border-border/60 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryGraph() {
  // Deterministic nodes laid out as a neural-network / memory graph.
  const nodes: { x: number; y: number; accent?: boolean; pulse?: boolean }[] = [
    { x: 60, y: 80 },
    { x: 60, y: 160, accent: true },
    { x: 60, y: 240 },
    { x: 180, y: 50, pulse: true },
    { x: 180, y: 130 },
    { x: 180, y: 210, accent: true },
    { x: 180, y: 290 },
    { x: 300, y: 100 },
    { x: 300, y: 180, pulse: true },
    { x: 300, y: 260 },
  ];
  const edges: [number, number][] = [
    [0, 3], [0, 4], [1, 3], [1, 4], [1, 5], [2, 5], [2, 6],
    [3, 7], [3, 8], [4, 7], [4, 8], [4, 9], [5, 8], [5, 9], [6, 9],
  ];
  return (
    <svg viewBox="0 0 360 340" className="w-full max-w-[320px] h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="url(#edge)"
          strokeWidth="1.25"
        />
      ))}

      {nodes.map((n, i) => {
        const fill = n.accent ? "var(--accent)" : "var(--primary)";
        const r = n.accent ? 7 : 5;
        return (
          <g key={i}>
            {n.pulse && (
              <circle cx={n.x} cy={n.y} r="18" fill="url(#halo)">
                <animate attributeName="r" values="14;22;14" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={r + 3} fill={fill} opacity="0.15" />
            <circle cx={n.x} cy={n.y} r={r} fill={fill} />
          </g>
        );
      })}
    </svg>
  );
}
