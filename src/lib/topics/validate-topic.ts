import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_TOPIC_NAME = 100;
const MAX_CARD_FIELD = 2000;

export type RoadmapTask = { id: string; label: string; done: boolean };
export type RoadmapMilestone = {
  id: string;
  title: string;
  description: string;
  status: "done" | "active" | "upcoming";
  progress: number;
  tasks: RoadmapTask[];
  eta: string;
};

export function slugifyTopicName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function resolveUniqueSlug(
  supabase: SupabaseClient,
  userId: string,
  baseSlug: string
): Promise<string> {
  const { data } = await supabase
    .from("topics")
    .select("slug")
    .eq("user_id", userId)
    .like("slug", `${baseSlug}%`);

  const existing = new Set((data ?? []).map((r) => r.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  for (let i = 2; i < 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

export function validateTopicName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Topic name required";
  if (trimmed.length > MAX_TOPIC_NAME) return `Topic name must be at most ${MAX_TOPIC_NAME} characters`;
  return null;
}

export function validateCardFields(front: string, back: string): string | null {
  const f = front.trim();
  const b = back.trim();
  if (!f) return "Card front required";
  if (f.length > MAX_CARD_FIELD || b.length > MAX_CARD_FIELD) {
    return `Card text must be at most ${MAX_CARD_FIELD} characters`;
  }
  return null;
}

function normalizeTask(raw: Record<string, unknown>, idx: number): RoadmapTask {
  return {
    id: typeof raw.id === "string" ? raw.id : `task-${idx}`,
    label: typeof raw.label === "string" ? raw.label.trim() : "",
    done: Boolean(raw.done),
  };
}

function normalizeStatus(raw: unknown): RoadmapMilestone["status"] {
  if (raw === "done" || raw === "active" || raw === "upcoming") return raw;
  if (raw === "locked") return "upcoming";
  return "upcoming";
}

export function normalizeMilestone(raw: unknown, idx: number): RoadmapMilestone | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const title = typeof m.title === "string" ? m.title.trim() : "";
  if (!title) return null;

  const tasksRaw = Array.isArray(m.tasks) ? m.tasks : [];
  const tasks = tasksRaw
    .map((t, i) => normalizeTask(t as Record<string, unknown>, i))
    .filter((t) => t.label);

  const doneCount = tasks.filter((t) => t.done).length;
  const progress =
    typeof m.progress === "number"
      ? Math.min(100, Math.max(0, Math.round(m.progress)))
      : tasks.length
      ? Math.round((doneCount / tasks.length) * 100)
      : 0;

  return {
    id: typeof m.id === "string" ? m.id : `milestone-${idx}`,
    title,
    description: typeof m.description === "string" ? m.description : "",
    status: normalizeStatus(m.status),
    progress,
    tasks,
    eta: typeof m.eta === "string" ? m.eta : "—",
  };
}

export function validateRoadmap(input: unknown): RoadmapMilestone[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m, i) => normalizeMilestone(m, i))
    .filter((m): m is RoadmapMilestone => m !== null);
}

export function normalizeRoadmapFromAi(parsed: unknown): RoadmapMilestone[] {
  const arr = Array.isArray(parsed) ? parsed : (parsed as { milestones?: unknown[] })?.milestones ?? [];
  return validateRoadmap(arr);
}
