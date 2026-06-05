export const BLOCK_KINDS = [
  "review",
  "learn",
  "recall",
  "personal",
  "work",
  "break",
  "fitness",
  "sleep",
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

export type ScheduleBlock = {
  id: string;
  start: string;
  end: string;
  title: string;
  kind: BlockKind;
  detail?: string;
  done?: boolean;
  ai?: boolean;
};

export type ScheduleBlockInput = {
  id?: string;
  start: string;
  end: string;
  title: string;
  kind: string;
  detail?: string;
  done?: boolean;
  ai?: boolean;
};

export type AiScheduleBlock = {
  day: number;
  start: string;
  end: string;
  title: string;
  kind: BlockKind;
  detail?: string;
  ai?: boolean;
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type ScheduleSummary = {
  cardsDue: number;
  topicsWithDue: number;
  wakeTime: string | null;
  sleepTime: string | null;
  activeWindowMinutes: number | null;
  tomorrowDue: number;
  insight: string;
  studyPlan: {
    minutesPerDay: number;
    studyDays: number[];
  };
  tomorrowPreview: { label: string; tone: "primary" | "accent" | "good" }[];
};
