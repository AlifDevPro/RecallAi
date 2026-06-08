"use client";



import Link from "next/link";

import {

  Layers,

  Plus,

  Search,

  TrendingUp,

  TrendingDown,

  Minus,

  MoreHorizontal,

  Archive,

  Trash2,

} from "lucide-react";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Sidebar } from "@/components/layout/Sidebar";

import { MobileNav } from "@/components/layout/MobileNav";

import { invalidateTopicMutations } from "@/lib/query/invalidate-learning";



type TopicRow = {

  id: string;

  slug: string;

  name: string;

  category: string;

  mastery: number;

  cards: number;

  due: number;

  status: "active" | "archived";

  trend: "up" | "down" | "stable";

};



type SortKey = "name" | "mastery" | "due";



function TopicsListSkeleton() {

  return (

    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">

      {Array.from({ length: 6 }).map((_, i) => (

        <div key={i} className="p-5 rounded-2xl bg-surface border border-border/20">

          <div className="h-10 w-10 bg-surface-raised rounded-xl mb-4" />

          <div className="h-4 w-32 bg-surface-raised rounded mb-2" />

          <div className="h-3 w-20 bg-surface-raised rounded mb-4" />

          <div className="h-1.5 bg-surface-raised rounded-full" />

        </div>

      ))}

    </div>

  );

}



export function TopicsView() {

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const [sort, setSort] = useState<SortKey>("due");

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [actionInFlight, setActionInFlight] = useState<string | null>(null);



  const topicsQuery = useQuery({

    queryKey: ["topics"],

    queryFn: async () => {
      try {
        const r = await fetch("/api/me/topics");
        if (!r.ok) return [] as TopicRow[];
        const d = (await r.json().catch(() => ({}))) as { topics?: TopicRow[] };
        return (d.topics ?? []) as TopicRow[];
      } catch {
        return [] as TopicRow[];
      }

    },

  });



  const allTopics = topicsQuery.data ?? [];



  const updateTopic = async (slug: string, body: { status?: string }) => {

    setActionInFlight(slug);

    setActionError(null);

    try {

      const res = await fetch(`/api/me/topics/${slug}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(body),

      });

      if (!res.ok) {

        const d = await res.json().catch(() => ({}));

        throw new Error((d as { error?: string }).error ?? "Update failed");

      }

      invalidateTopicMutations(queryClient, slug);

    } finally {

      setActionInFlight(null);

    }

  };



  const deleteTopic = async (slug: string) => {

    setActionInFlight(slug);

    setActionError(null);

    try {

      const res = await fetch(`/api/me/topics/${slug}`, { method: "DELETE" });

      if (!res.ok) {

        const d = await res.json().catch(() => ({}));

        throw new Error((d as { error?: string }).error ?? "Delete failed");

      }

      invalidateTopicMutations(queryClient, slug);

    } finally {

      setActionInFlight(null);

    }

  };



  const filtered = allTopics

    .filter((t) => {

      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === "all" ? true : t.status === filter;

      return matchesSearch && matchesFilter;

    })

    .sort((a, b) => {

      if (sort === "name") return a.name.localeCompare(b.name);

      if (sort === "mastery") return a.mastery - b.mastery;

      return b.due - a.due;

    });



  return (

    <div className="min-h-screen bg-background">

      <Sidebar />

      <MobileNav />



      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">

            <div>

              <h1 className="text-3xl font-bold tracking-tight">Topics</h1>

              <p className="text-sm text-muted-foreground mt-1">

                {allTopics.filter((t) => t.status === "active").length} active topics,{" "}

                {allTopics.reduce((s, t) => s + t.cards, 0)} total cards

              </p>

            </div>

            <Link

              href="/topics/new"

              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"

            >

              <Plus className="size-4" />

              Add Topic

            </Link>

          </div>



          {topicsQuery.isError && (

            <div className="mb-6 p-4 rounded-xl bg-again/10 border border-again/30 flex items-center justify-between gap-4">

              <p className="text-sm text-again">{topicsQuery.error.message}</p>

              <button

                type="button"

                onClick={() => void topicsQuery.refetch()}

                className="text-sm font-medium text-primary hover:underline shrink-0"

              >

                Retry

              </button>

            </div>

          )}

          {actionError && <p className="mb-4 text-sm text-again">{actionError}</p>}



          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">

            <div className="relative flex-1 max-w-sm w-full">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

              <input

                type="text"

                value={search}

                onChange={(e) => setSearch(e.target.value)}

                placeholder="Search topics..."

                className="w-full h-10 pl-10 pr-4 bg-surface rounded-xl border border-border/30 text-sm focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/50"

              />

            </div>

            <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border/20">

              {(["all", "active", "archived"] as const).map((f) => (

                <button

                  key={f}

                  onClick={() => setFilter(f)}

                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${

                    filter === f ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"

                  }`}

                >

                  {f}

                </button>

              ))}

            </div>

            <select

              value={sort}

              onChange={(e) => setSort(e.target.value as SortKey)}

              className="h-10 px-3 bg-surface rounded-xl border border-border/20 text-sm"

            >

              <option value="due">Sort: Due</option>

              <option value="mastery">Sort: Mastery</option>

              <option value="name">Sort: Name</option>

            </select>

          </div>



          {topicsQuery.isLoading ? (

            <TopicsListSkeleton />

          ) : filtered.length === 0 ? (

            <div className="text-center py-16">

              <p className="text-muted-foreground mb-4">

                {allTopics.length === 0 ? "No topics yet." : "No topics match your filters."}

              </p>

              {allTopics.length === 0 && (

                <Link href="/topics/new" className="text-sm text-primary hover:underline">

                  Create your first topic

                </Link>

              )}

            </div>

          ) : (

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {filtered.map((topic) => {

                const slug = topic.slug ?? topic.id;

                return (

                  <div

                    key={slug}

                    className="group relative p-5 rounded-2xl bg-surface border border-border/20 hover:border-primary/30 transition-all"

                  >

                    <div className="flex items-start justify-between mb-4">

                      <Link href={`/topics/${slug}`} className="flex items-center gap-3 min-w-0 flex-1">

                        <div className="size-10 rounded-xl bg-surface-raised flex items-center justify-center shrink-0">

                          <Layers className="size-5 text-primary/80" />

                        </div>

                        <div className="min-w-0">

                          <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">

                            {topic.name}

                          </p>

                          <p className="text-xs text-muted-foreground">{topic.category}</p>

                        </div>

                      </Link>

                      <div className="relative shrink-0">

                        <button

                          type="button"

                          disabled={actionInFlight === slug}

                          onClick={() => setMenuOpen(menuOpen === slug ? null : slug)}

                          className="size-8 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-colors disabled:opacity-40"

                        >

                          <MoreHorizontal className="size-4 text-muted-foreground" />

                        </button>

                        {menuOpen === slug && (

                          <>

                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />

                            <div className="absolute right-0 top-full mt-1 w-40 bg-surface-raised rounded-xl border border-border/30 py-1 z-20">

                              {topic.status === "active" ? (

                                <button

                                  onClick={async () => {

                                    setMenuOpen(null);

                                    try {

                                      await updateTopic(slug, { status: "archived" });

                                    } catch (err) {

                                      setActionError(err instanceof Error ? err.message : "Archive failed");

                                    }

                                  }}

                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"

                                >

                                  <Archive className="size-4" /> Archive

                                </button>

                              ) : (

                                <button

                                  onClick={async () => {

                                    setMenuOpen(null);

                                    try {

                                      await updateTopic(slug, { status: "active" });

                                    } catch (err) {

                                      setActionError(err instanceof Error ? err.message : "Restore failed");

                                    }

                                  }}

                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"

                                >

                                  <Archive className="size-4" /> Restore

                                </button>

                              )}

                              <button

                                onClick={async () => {

                                  setMenuOpen(null);

                                  if (!confirm(`Delete "${topic.name}" and all ${topic.cards} cards?`)) return;

                                  try {

                                    await deleteTopic(slug);

                                  } catch (err) {

                                    setActionError(err instanceof Error ? err.message : "Delete failed");

                                  }

                                }}

                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-again hover:bg-surface transition-colors"

                              >

                                <Trash2 className="size-4" /> Delete

                              </button>

                            </div>

                          </>

                        )}

                      </div>

                    </div>



                    <Link href={`/topics/${slug}`} className="block">

                      <div className="flex items-center gap-4 mb-4">

                        <div className="flex-1">

                          <div className="flex justify-between text-xs mb-1.5">

                            <span className="text-muted-foreground">Mastery</span>

                            <span className="font-mono font-medium">{topic.mastery}%</span>

                          </div>

                          <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">

                            <div

                              className={`h-full rounded-full ${

                                topic.mastery >= 80 ? "bg-good" : topic.mastery >= 60 ? "bg-hard" : "bg-again"

                              }`}

                              style={{ width: `${topic.mastery}%` }}

                            />

                          </div>

                        </div>

                        {topic.trend === "up" ? (

                          <TrendingUp className="size-4 text-good" />

                        ) : topic.trend === "down" ? (

                          <TrendingDown className="size-4 text-again" />

                        ) : (

                          <Minus className="size-4 text-muted-foreground" />

                        )}

                      </div>



                      <div className="flex items-center gap-4 text-xs text-muted-foreground">

                        <span>{topic.cards} cards</span>

                        {topic.due > 0 ? (

                          <span className="text-hard font-medium px-2 py-0.5 rounded-full bg-hard/10">

                            {topic.due} due

                          </span>

                        ) : (

                          <span>No cards due</span>

                        )}

                        {topic.status === "archived" && (

                          <span className="bg-surface-raised px-2 py-0.5 rounded-full">Archived</span>

                        )}

                      </div>

                    </Link>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </main>

    </div>

  );

}


