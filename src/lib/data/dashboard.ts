// Dashboard types and API payload shape.

export type DashboardTopic = {
  name: string;
  slug: string;
  mastery: number;
  trend: "up" | "down" | "stable";
  cards: number;
  due: number;
  status: "at-risk" | "on-track" | "ahead";
};

export type ActivityLevel = "high" | "medium" | "low" | "empty";

export type WeeklyActivityDay = { day: string; cards: number };

export type DashboardPayload = {
  displayName: string;
  topics: DashboardTopic[];
  forecast: { day: string; count: number }[];
  weeklyActivity: WeeklyActivityDay[];
  activityGrid: ActivityLevel[];
  streakDays: number;
  insight: string;
  minutesPerCard: number;
};
