"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateTopicMutations } from "@/lib/query/invalidate-learning";
import {
  ArrowLeft,
  BrainCircuit,
  PenLine,
  Upload,
  Check,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

type CardDraft = { id: string; question: string; answer: string };

export function AddTopicView() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"input" | "generating" | "review" | "manual" | "done">("input");
  const [method, setMethod] = useState<"ai" | "upload" | "manual">("ai");
  const [topicName, setTopicName] = useState("");
  const [context, setContext] = useState("");
  const [uploadText, setUploadText] = useState("");
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [genError, setGenError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topicName.trim()) return;
    setGenError(null);

    if (method === "manual") {
      setCards([{ id: "1", question: "", answer: "" }]);
      setSelectedCards(new Set(["1"]));
      setStep("manual");
      return;
    }

    setStep("generating");
    try {
      let sourceText = context;

      if (method === "upload") {
        const files = fileInputRef.current?.files;
        if (files?.length) {
          const form = new FormData();
          for (const f of Array.from(files)) form.append("files", f);
          const extractRes = await fetch("/api/ai/questions/extract", { method: "POST", body: form });
          const extractData = await extractRes.json();
          if (!extractRes.ok) throw new Error(extractData.error ?? "Extraction failed");
          sourceText = extractData.extracted ?? "";
        } else if (uploadText.trim()) {
          sourceText = uploadText.trim();
        } else {
          throw new Error("Upload a file or paste source material");
        }
      }

      const res = await fetch("/api/ai/cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicName, description: sourceText || topicName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const mapped = (data.cards ?? []).map((c: { front: string; back: string }, i: number) => ({
        id: String(i + 1),
        question: c.front,
        answer: c.back,
      }));
      if (mapped.length === 0) throw new Error("No cards were generated");
      setCards(mapped);
      setSelectedCards(new Set(mapped.map((c: CardDraft) => c.id)));
      setStep("review");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
      setStep("input");
    }
  };

  const saveTopic = async (selected: CardDraft[]) => {
    const valid = selected.filter((c) => c.question.trim() && c.answer.trim());
    if (!valid.length) {
      setGenError("Add at least one card with question and answer");
      return;
    }
    const res = await fetch("/api/me/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topicName,
        description: context || uploadText,
        cards: valid.map((c) => ({ front: c.question.trim(), back: c.answer.trim() })),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Save failed");
    }
    const data = await res.json();
    setSavedSlug(data.slug ?? null);
    invalidateTopicMutations(queryClient);
    setStep("done");
  };

  const toggleCard = (id: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileNav />
        <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
          <div className="max-w-xl mx-auto px-6 py-20 text-center">
            <div className="size-16 rounded-2xl bg-good/10 flex items-center justify-center mx-auto mb-6">
              <Check className="size-8 text-good" />
            </div>
            <h1 className="text-3xl font-bold mb-3">Topic Created</h1>
            <p className="text-muted-foreground mb-8">
              &quot;{topicName}&quot; has been created with {selectedCards.size} cards. Ready to review?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={savedSlug ? `/review?topic=${savedSlug}` : "/review"}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Start Reviewing
              </Link>
              {savedSlug && (
                <Link
                  href={`/topics/${savedSlug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
                >
                  View Topic
                </Link>
              )}
              <Link
                href="/topics"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border/50 rounded-xl font-medium hover:bg-surface-raised transition-colors"
              >
                All Topics
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12">
          <Link
            href="/topics"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="size-4" />
            All Topics
          </Link>

          <h1 className="text-3xl font-bold tracking-tight mb-2">Add Topic</h1>
          <p className="text-muted-foreground mb-8">Create a new learning topic and generate your first deck.</p>

          {step === "input" && (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-8">
                {[
                  { key: "ai" as const, icon: Sparkles, label: "AI Generate", desc: "From a topic name" },
                  { key: "upload" as const, icon: Upload, label: "Upload Material", desc: "PDF, text, or URL" },
                  { key: "manual" as const, icon: PenLine, label: "Manual Entry", desc: "Create cards yourself" },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={`p-5 rounded-2xl border text-left transition-all ${
                      method === m.key
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/20 bg-surface hover:border-border/40"
                    }`}
                  >
                    <m.icon className={`size-5 mb-3 ${method === m.key ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm mb-1">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>

              <div className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic name</label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g., Machine Learning Fundamentals"
                    className="w-full h-11 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
                  />
                </div>

                {method === "ai" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">What do you want to cover?</label>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Describe your level and what concepts you want to learn..."
                      rows={4}
                      className="w-full px-4 py-3 bg-surface-raised rounded-xl border border-border/20 text-sm resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {method === "upload" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Upload or paste source material</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                      multiple
                      className="hidden"
                      onChange={() => setGenError(null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border/30 rounded-xl p-8 text-center hover:border-primary/30 transition-colors"
                    >
                      <Upload className="size-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Click to upload PDF or image</p>
                      <p className="text-xs text-muted-foreground/60">Or paste text below</p>
                    </button>
                    <textarea
                      value={uploadText}
                      onChange={(e) => setUploadText(e.target.value)}
                      placeholder="Paste notes, article text, or a URL description..."
                      rows={4}
                      className="w-full mt-3 px-4 py-3 bg-surface-raised rounded-xl border border-border/20 text-sm resize-none focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {method === "manual" && (
                  <div className="p-4 rounded-xl bg-surface-raised text-sm text-muted-foreground">
                    You will add cards one by one on the next step — no AI generation.
                  </div>
                )}

                {genError && <p className="text-sm text-again">{genError}</p>}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link
                    href="/topics"
                    className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={() => void handleGenerate()}
                    disabled={!topicName.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {method === "manual" ? (
                      <>
                        <PenLine className="size-4" />
                        Continue
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="size-4" />
                        Generate Deck
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === "generating" && (
            <div className="bg-surface rounded-2xl border border-border/20 p-12 text-center">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <BrainCircuit className="size-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Generating your deck</h2>
              <p className="text-sm text-muted-foreground">AI is creating flashcards from your material. This takes a few seconds...</p>
            </div>
          )}

          {step === "manual" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Add Cards</h2>
                  <p className="text-sm text-muted-foreground">{cards.length} card{cards.length !== 1 ? "s" : ""}</p>
                  {genError && <p className="text-sm text-again mt-1">{genError}</p>}
                </div>
                <button
                  onClick={async () => {
                    setGenError(null);
                    try {
                      await saveTopic(cards);
                    } catch (e) {
                      setGenError(e instanceof Error ? e.message : "Save failed");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check className="size-4" />
                  Save Topic
                </button>
              </div>
              <div className="space-y-4">
                {cards.map((card, i) => (
                  <div key={card.id} className="p-5 rounded-2xl border border-border/20 bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Card {i + 1}</span>
                      {cards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}
                          className="text-muted-foreground hover:text-again"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <input
                      value={card.question}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, question: e.target.value } : c))
                        )
                      }
                      placeholder="Question"
                      className="w-full h-10 px-4 bg-surface-raised rounded-xl border border-border/20 text-sm focus:outline-none focus:border-primary/40"
                    />
                    <textarea
                      value={card.answer}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((c) => (c.id === card.id ? { ...c, answer: e.target.value } : c))
                        )
                      }
                      placeholder="Answer"
                      rows={2}
                      className="w-full px-4 py-3 bg-surface-raised rounded-xl border border-border/20 text-sm resize-none focus:outline-none focus:border-primary/40"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const id = String(Date.now());
                    setCards((prev) => [...prev, { id, question: "", answer: "" }]);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Plus className="size-4" /> Add another card
                </button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Review Generated Cards</h2>
                  <p className="text-sm text-muted-foreground">{selectedCards.size} of {cards.length} selected</p>
                  {genError && <p className="text-sm text-again mt-1">{genError}</p>}
                </div>
                <button
                  onClick={async () => {
                    const selected = cards.filter((c) => selectedCards.has(c.id));
                    if (!selected.length) return;
                    setGenError(null);
                    try {
                      await saveTopic(selected);
                    } catch (e) {
                      setGenError(e instanceof Error ? e.message : "Save failed");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check className="size-4" />
                  Save Deck
                </button>
              </div>

              <div className="space-y-3">
                {cards.map((card) => {
                  const selected = selectedCards.has(card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleCard(card.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                        selected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/20 bg-surface hover:border-border/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                            selected ? "bg-primary border-primary" : "border-border"
                          }`}
                        >
                          {selected && <Check className="size-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">{card.question}</p>
                          <p className="text-sm text-muted-foreground">{card.answer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
