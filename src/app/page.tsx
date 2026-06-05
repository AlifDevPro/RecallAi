import Link from "next/link";
import {
  BrainCircuit,
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart3,
  MessageSquare,
  BookOpen,
  Code2,
  Pill,
  Languages,
  Library,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ContributorBubbles } from "@/components/landing/ContributorBubbles";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <HeroBackdrop />
        <nav className="relative h-16 flex items-center justify-between px-6 lg:px-12 border-b border-border z-10">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <BrainCircuit className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Recall AI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/questions" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Question Bank
            </Link>
            <Link href="/contributors" className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contributors
            </Link>
            <Link href="/dashboard" className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ThemeToggle />
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </nav>

        <div className="relative max-w-5xl mx-auto px-6 py-24 lg:py-32 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-surface-raised border border-border text-sm text-muted-foreground mb-8">
            <Zap className="size-3.5 text-primary" />
            Spaced repetition · AI tutoring · Real past papers
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            You studied for hours.
            <br />
            <span className="text-muted-foreground">You forgot it all in a week.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Recall AI fixes the forgetting curve with adaptive spaced repetition, AI-built decks, and a public archive of real past exam papers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-md text-base font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              Start Learning Free
              <ArrowRight className="size-5" />
            </Link>
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-border bg-surface/60 backdrop-blur rounded-md text-base font-medium hover:bg-surface-raised transition-colors"
            >
              <Library className="size-5" /> Browse Question Bank
            </Link>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">How Recall AI works</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Three steps. Zero friction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Declare your goal", desc: "Tell us what you want to learn — anything. No predefined categories.", svg: <GoalSvg /> },
              { num: "02", title: "AI builds your deck", desc: "Paste notes, upload a PDF, share a video, or name a topic. AI generates flashcards.", svg: <DeckSvg /> },
              { num: "03", title: "Review at the right time", desc: "Adaptive SM-2 scheduling surfaces cards right before you forget them.", svg: <CalendarSvg /> },
            ].map((step) => (
              <div key={step.num} className="group p-6 rounded-md bg-surface border border-border hover:border-primary/40 transition-colors">
                <div className="aspect-[5/3] mb-4 rounded bg-surface-raised/60 border border-border flex items-center justify-center overflow-hidden">
                  {step.svg}
                </div>
                <div className="text-3xl font-bold text-primary/30 mb-2 font-mono">{step.num}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contributor bubbles — full width */}
      <section className="border-t border-b border-border py-16 lg:py-20 bg-surface/30">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/15 text-primary text-xs font-mono font-semibold uppercase tracking-wider mb-4">
            <Users className="size-3" /> Community-built
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            The bigger the photo, the bigger the contribution.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Real past papers, scanned and digitised by learners across institutions. Every verified upload grows their presence here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link href="/contributors" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">
              View Hall of Contributors <ArrowRight className="size-4" />
            </Link>
            <Link href="/questions/upload" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-border text-sm font-medium hover:bg-surface-raised">
              Contribute a paper
            </Link>
          </div>
        </div>

        <ContributorBubbles />
      </section>

      {/* Use cases */}
      <section className="border-t border-border py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">Built for every kind of learner</h2>
            <p className="text-lg text-muted-foreground">If you need to remember something, Recall AI works for you.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BookOpen, title: "Medical students", desc: "Pharmacology, anatomy, pathology — master what matters for your licensing exam." },
              { icon: Code2, title: "Software engineers", desc: "System design, algorithms, language internals — ace your interviews." },
              { icon: Languages, title: "Language learners", desc: "Vocabulary, grammar, idioms — build fluency with daily review." },
              { icon: Pill, title: "Nursing & pharmacy", desc: "Drug interactions, dosages, protocols — never second-guess care decisions." },
              { icon: BarChart3, title: "Data scientists", desc: "ML algorithms, statistical tests, SQL — keep your toolkit sharp." },
              { icon: MessageSquare, title: "Certification prep", desc: "PMP, CPA, CFA, bar exam — structured review beats cramming." },
            ].map((useCase) => (
              <div key={useCase.title} className="p-6 rounded-md bg-surface border border-border hover:border-primary/30 transition-colors">
                <useCase.icon className="size-5 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-6">Why Recall AI beats studying alone</h2>
              <div className="space-y-5">
                {[
                  "AI generates flashcards from any source — no manual card creation",
                  "Adaptive scheduling learns your memory patterns per card",
                  "Visual analytics show exactly what you know and what is fading",
                  "AI tutor explains concepts in context of your mistakes",
                  "Mock tests from real past papers — voice, image and text answers",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-good mt-0.5 shrink-0" />
                    <span className="text-foreground leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface rounded-md border border-border p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Retention Analytics</p>
                  <p className="text-xs text-muted-foreground">Real-time memory decay tracking</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Algorithms", value: 84, color: "bg-primary" },
                  { label: "Organic Chemistry", value: 96, color: "bg-good" },
                  { label: "Spanish Grammar", value: 62, color: "bg-hard" },
                  { label: "System Design", value: 45, color: "bg-again" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{bar.label}</span>
                      <span className="font-mono font-medium">{bar.value}%</span>
                    </div>
                    <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full transition-all`} style={{ width: `${bar.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall mastery</span>
                <span className="font-bold text-primary">72.4%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Stop forgetting what you learn.</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of learners using Recall AI to build permanent knowledge. Free forever. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-md text-lg font-semibold hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            Create Free Account
            <ArrowRight className="size-5" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">Takes under 2 minutes. Start with your first deck today.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/40 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded bg-primary flex items-center justify-center">
              <BrainCircuit className="size-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Recall AI</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">· &copy; 2026</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Crafted by{" "}
            <a
              href="#"
              className="font-semibold text-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Alif Ahmad
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// =================== Hero backdrop SVG ===================
function HeroBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--glow),transparent_55%)]" />
      <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="hg" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <pattern id="dotgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--muted-foreground)" opacity="0.18" />
          </pattern>
        </defs>
        <rect width="1200" height="700" fill="url(#dotgrid)" />
        <rect width="1200" height="700" fill="url(#hg)" />

        {/* Orbital rings */}
        <g className="orbit-spin" style={{ transformOrigin: "600px 350px" }}>
          <circle cx="600" cy="350" r="240" fill="none" stroke="var(--primary)" strokeOpacity="0.15" strokeDasharray="3 8" />
          <circle cx="600" cy="110" r="4" fill="var(--primary)" opacity="0.7" />
        </g>
        <g className="orbit-spin-reverse" style={{ transformOrigin: "600px 350px" }}>
          <circle cx="600" cy="350" r="340" fill="none" stroke="var(--accent)" strokeOpacity="0.12" strokeDasharray="2 10" />
          <circle cx="940" cy="350" r="3" fill="var(--accent)" opacity="0.7" />
        </g>

        {/* Forgetting curve */}
        <path
          className="curve-draw"
          d="M 100 200 Q 250 220 350 320 T 600 470 T 900 520 T 1100 530"
          fill="none"
          stroke="var(--destructive)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        {/* Recall lifts */}
        <path
          className="curve-draw"
          style={{ animationDelay: "1.5s" }}
          d="M 100 200 Q 200 180 280 260 L 280 240 Q 340 200 420 290 L 420 260 Q 480 220 560 320 L 560 290 Q 620 250 700 350 L 700 320 Q 760 280 840 380"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.7"
          strokeWidth="2"
        />

        {/* Memory nodes */}
        {[
          [180, 210], [320, 280], [460, 310], [620, 340], [780, 360], [920, 390], [1060, 410],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" className="node-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </svg>
    </div>
  );
}

// =================== Step illustrations ===================
function GoalSvg() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      <defs>
        <radialGradient id="goalG" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="60" r="50" fill="url(#goalG)" />
      <circle cx="100" cy="60" r="42" fill="none" stroke="var(--primary)" strokeOpacity="0.3" strokeDasharray="4 4" className="orbit-spin" style={{ transformOrigin: "100px 60px" }} />
      <circle cx="100" cy="60" r="28" fill="none" stroke="var(--primary)" strokeOpacity="0.5" />
      <circle cx="100" cy="60" r="14" fill="none" stroke="var(--primary)" strokeOpacity="0.7" />
      <circle cx="100" cy="60" r="5" fill="var(--primary)" className="node-pulse" />
    </svg>
  );
}
function DeckSvg() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={60 + i * 14}
          y={28 - i * 2}
          width="80"
          height="64"
          rx="4"
          fill="var(--card)"
          stroke="var(--primary)"
          strokeOpacity={0.3 + i * 0.15}
          transform={`rotate(${-6 + i * 4} ${100 + i * 14} 60)`}
        />
      ))}
      <rect x="100" y="34" width="40" height="3" rx="1" fill="var(--primary)" opacity="0.6" />
      <rect x="100" y="42" width="30" height="2" rx="1" fill="var(--muted-foreground)" opacity="0.5" />
      <rect x="100" y="48" width="34" height="2" rx="1" fill="var(--muted-foreground)" opacity="0.5" />
    </svg>
  );
}
function CalendarSvg() {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      <rect x="50" y="20" width="100" height="80" rx="6" fill="var(--card)" stroke="var(--border)" />
      <rect x="50" y="20" width="100" height="18" rx="6" fill="var(--primary)" opacity="0.15" />
      <line x1="50" y1="38" x2="150" y2="38" stroke="var(--border)" />
      {Array.from({ length: 20 }).map((_, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 60 + col * 18;
        const y = 50 + row * 14;
        const active = i === 7;
        return (
          <g key={i}>
            <rect x={x} y={y} width="12" height="10" rx="2" fill={active ? "var(--primary)" : "var(--surface-raised)"} opacity={active ? 1 : 0.7} />
            {active && <circle cx={x + 6} cy={y + 5} r="8" fill="none" stroke="var(--primary)" strokeOpacity="0.5" className="pulse-ring" />}
          </g>
        );
      })}
    </svg>
  );
}

