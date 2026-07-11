"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Send,
  Sparkles,
  Target,
  AlertCircle,
  BookOpen,
  Zap,
  Loader2,
  Lightbulb,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useUser } from "@/hooks/use-user";
import { loadLastQuizSession } from "@/lib/tutor/quiz-storage";

type TutorSource = { ref: string; label: string; sourceType: string; href?: string };

type TutorStructured = {
  answer: string;
  key_points?: string[] | null;
  explanation?: string | null;
  step_by_step?: string[] | null;
  example?: string | null;
  worked_example?: string | null;
  common_mistake?: string | null;
  your_mistake?: string | null;
  why_wrong?: string | null;
  why_correct?: string | null;
  recap?: string | null;
  quiz_question?: string | null;
  follow_up?: string | null;
  next_step?: string | null;
};

type Message = {
  role: "ai" | "user";
  content: string;
  structured?: TutorStructured;
  sources?: TutorSource[];
};

const quickActions = [
  { icon: AlertCircle, label: "Explain my last mistake" },
  { icon: BookOpen, label: "Give me a practice problem" },
  { icon: Target, label: "What should I focus on?" },
  { icon: Zap, label: "Teach me this topic" },
];

const welcomeMessage: Message = {
  role: "ai",
  content:
    "Hi! I'm your AI tutor. Ask me to explain concepts, walk through examples, quiz you, or help you plan what to study next.",
};

function SectionBlock({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "primary" | "mistake" | "correct";
}) {
  const tones = {
    default: "bg-surface-raised/60",
    primary: "border border-primary/15 bg-primary/5",
    mistake: "border border-hard/20 bg-hard/5",
    correct: "border border-good/20 bg-good/5",
  };
  const titleColors = {
    default: "text-muted-foreground",
    primary: "text-primary",
    mistake: "text-hard",
    correct: "text-good",
  };
  return (
    <div className={`rounded-lg px-3 py-2.5 ${tones[tone]}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${titleColors[tone]}`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed list-disc pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5 text-sm leading-relaxed list-decimal pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function TutorStructuredMessage({ data }: { data: TutorStructured }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed font-medium">{data.answer}</p>

      {data.key_points && data.key_points.length > 0 && (
        <SectionBlock title="Key points">
          <BulletList items={data.key_points} />
        </SectionBlock>
      )}

      {data.explanation && (
        <SectionBlock title="Why it matters">
          <p className="text-sm leading-relaxed">{data.explanation}</p>
        </SectionBlock>
      )}

      {data.step_by_step && data.step_by_step.length > 0 && (
        <SectionBlock title="Step by step">
          <NumberedList items={data.step_by_step} />
        </SectionBlock>
      )}

      {data.example && (
        <SectionBlock title="Example" tone="primary">
          <p className="text-sm leading-relaxed flex items-start gap-1">
            <Lightbulb className="size-3.5 text-primary shrink-0 mt-0.5" />
            <span>{data.example}</span>
          </p>
        </SectionBlock>
      )}

      {data.worked_example && (
        <SectionBlock title="Worked solution" tone="primary">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.worked_example}</p>
        </SectionBlock>
      )}

      {data.your_mistake && (
        <SectionBlock title="Your mistake" tone="mistake">
          <p className="text-sm leading-relaxed">{data.your_mistake}</p>
        </SectionBlock>
      )}

      {data.why_wrong && (
        <SectionBlock title="Why your answer missed" tone="mistake">
          <p className="text-sm leading-relaxed">{data.why_wrong}</p>
        </SectionBlock>
      )}

      {data.why_correct && (
        <SectionBlock title="Why the correct approach works" tone="correct">
          <p className="text-sm leading-relaxed">{data.why_correct}</p>
        </SectionBlock>
      )}

      {data.common_mistake && (
        <SectionBlock title="Common mistake" tone="mistake">
          <p className="text-sm leading-relaxed">{data.common_mistake}</p>
        </SectionBlock>
      )}

      {data.recap && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 leading-relaxed">
          {data.recap}
        </p>
      )}

      {data.quiz_question && (
        <SectionBlock title="Try this">
          <p className="text-sm font-medium leading-relaxed flex items-start gap-1">
            <HelpCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>{data.quiz_question}</span>
          </p>
        </SectionBlock>
      )}

      {data.follow_up && (
        <p className="text-sm text-muted-foreground leading-relaxed">{data.follow_up}</p>
      )}

      {data.next_step && (
        <p className="text-xs text-primary flex items-start gap-1 leading-relaxed">
          <ArrowRight className="size-3 shrink-0 mt-0.5" />
          {data.next_step}
        </p>
      )}
    </div>
  );
}

function SourcePills({ sources }: { sources: TutorSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map((s) =>
        s.href ? (
          <Link
            key={s.ref}
            href={s.href}
            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
          >
            {s.label}
          </Link>
        ) : (
          <span
            key={s.ref}
            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            {s.label}
          </span>
        )
      )}
    </div>
  );
}

export function TutorView() {
  const { initials } = useUser();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [topics, setTopics] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [topicSlug, setTopicSlug] = useState("");

  useEffect(() => {
    fetch("/api/me/topics")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.topics ?? []).map((t: { id: string; name: string; slug: string }) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
        }));
        setTopics(list);
        if (list.length > 0) setTopicSlug(list[0].slug);
      })
      .catch(() => setTopics([]));
  }, []);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; snippet: string }[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setSearchResults(
        (data.results ?? []).map((r: { title?: string; content?: string }) => ({
          title: r.title ?? "Result",
          snippet: (r.content ?? "").slice(0, 120),
        }))
      );
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedTopic = topics.find((t) => t.slug === topicSlug);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    setError(null);

    let assistantText = "";
    let sources: TutorSource[] = [];
    let structured: TutorStructured | undefined;

    setMessages((prev) => [...prev, { role: "ai", content: "" }]);

    try {
      const res = await fetch("/api/ai/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          threadId,
          topicName: selectedTopic?.name ?? null,
          topicSlug: topicSlug || null,
          recentQuiz: loadLastQuizSession(),
        }),
      });

      if (res.status === 429) {
        throw new Error("You're sending messages too quickly. Please wait a moment and try again.");
      }
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Chat failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let payload: {
            type: string;
            text?: string;
            threadId?: string;
            sources?: TutorSource[];
            structured?: TutorStructured;
            error?: string;
          };
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (payload.type === "error") {
            throw new Error(payload.error ?? "Chat failed");
          }
          if (payload.type === "meta") {
            if (payload.threadId) setThreadId(payload.threadId);
            sources = payload.sources ?? [];
            structured = payload.structured;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "ai",
                content: assistantText,
                sources,
                structured,
              };
              return next;
            });
          }
          if (payload.type === "token" && payload.text) {
            assistantText += payload.text;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "ai",
                content: assistantText,
                sources,
                structured,
              };
              return next;
            });
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "ai",
          content: `Sorry, I could not respond: ${msg}`,
        };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (label: string) => {
    const topic = selectedTopic?.name ?? "this topic";
    const prompts: Record<string, string> = {
      "Explain my last mistake":
        "Explain my most recent quiz or practice mistake in detail. Walk through what I got wrong, why my answer was incorrect, and how to think about it correctly next time. Use my actual wrong answers if you have them.",
      "Give me a practice problem":
        "Give me a practice problem on my weak areas with a full worked solution, key steps, and one follow-up question.",
      "What should I focus on?":
        "Based on my weak topics, due cards, and recent mistakes, what should I focus on today? Give me a prioritized study plan with time estimates.",
      "Teach me this topic": `Teach me ${topic} thoroughly: overview, key points, step-by-step explanation, a worked example, common mistakes, and a practice question.`,
    };
    setInput(prompts[label] ?? label);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />

      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12 h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BrainCircuit className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AI Tutor</h1>
                <p className="text-xs text-muted-foreground">Explains your mistakes, examples, quizzes — grounded in your decks</p>
              </div>
            </div>
            <select
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
              disabled={topics.length === 0}
              className="h-9 px-3 bg-surface rounded-lg border border-border/20 text-sm focus:outline-none focus:border-primary/40 disabled:opacity-50"
            >
              {topics.length === 0 ? (
                <option value="">No topics</option>
              ) : (
                topics.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Semantic search your content…"
              className="flex-1 h-9 px-3 bg-surface rounded-lg border border-border/20 text-sm focus:outline-none focus:border-primary/40"
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={searchLoading}
              className="h-9 px-3 rounded-lg bg-surface-raised border border-border/20 text-xs font-medium hover:border-primary/40 disabled:opacity-50"
            >
              {searchLoading ? "…" : "Search"}
            </button>
          </div>
          {searchError && (
            <p className="mb-3 text-xs text-again">{searchError}</p>
          )}
          {searchResults.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-surface border border-border/20 text-xs space-y-2 max-h-32 overflow-y-auto">
              {searchResults.map((r, i) => (
                <div key={i}>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-muted-foreground">{r.snippet}</div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-again mb-2">{error}</p>}

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    msg.role === "ai" ? "bg-primary/10" : "bg-surface-raised"
                  }`}
                >
                  {msg.role === "ai" ? (
                    <Sparkles className="size-4 text-primary" />
                  ) : (
                    <span className="text-xs font-bold">{initials || "U"}</span>
                  )}
                </div>
                <div className="max-w-[80%]">
                  <div
                    className={`p-4 rounded-2xl ${
                      msg.role === "ai"
                        ? "bg-surface border border-border/20"
                        : "bg-primary/10 border border-primary/10 text-sm leading-relaxed"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      msg.structured ? (
                        <TutorStructuredMessage data={msg.structured} />
                      ) : msg.content ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : loading && i === messages.length - 1 ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : null
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.sources && <SourcePills sources={msg.sources} />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => handleQuickAction(action.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/20 text-xs font-medium hover:border-primary/20 transition-colors"
              >
                <action.icon className="size-3.5 text-muted-foreground" />
                {action.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSend()}
              placeholder="Ask anything about your studies..."
              className="flex-1 h-11 pl-4 pr-4 bg-surface rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="size-11 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
