import type { ActivityLevel, DashboardTopic } from "./dashboard";

export const fixtureTopics: DashboardTopic[] = [
  { name: "Algorithms", slug: "algorithms", mastery: 84, trend: "up", cards: 142, due: 7, status: "at-risk" },
  { name: "Database Systems", slug: "database-systems", mastery: 76, trend: "stable", cards: 98, due: 5, status: "on-track" },
  { name: "Python", slug: "python", mastery: 91, trend: "up", cards: 65, due: 6, status: "on-track" },
  { name: "Organic Chemistry", slug: "organic-chemistry", mastery: 96, trend: "stable", cards: 210, due: 0, status: "ahead" },
  { name: "System Design", slug: "system-design", mastery: 45, trend: "down", cards: 54, due: 12, status: "at-risk" },
];

export const fixtureForecast = [
  { day: "Mon", count: 18 },
  { day: "Tue", count: 24 },
  { day: "Wed", count: 15 },
  { day: "Thu", count: 32 },
  { day: "Fri", count: 28 },
  { day: "Sat", count: 12 },
  { day: "Sun", count: 8 },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fixtureActivityGrid: ActivityLevel[] = (() => {
  const rand = mulberry32(20260604);
  return Array.from({ length: 90 }, () => {
    const r = rand();
    if (r > 0.85) return "high";
    if (r > 0.6) return "medium";
    if (r > 0.35) return "low";
    return "empty";
  });
})();
