import { z } from "zod";

export const schedulePreferencesSchema = z.object({
  hoursPerDay: z.number().min(0.5).max(6).multipleOf(0.5).optional(),
  scheduleNarrative: z.string().max(2000).optional(),
  goal: z.string().min(1).max(500).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  studyDays: z.array(z.number().int().min(0).max(6)).optional(),
  deadline: z.string().nullable().optional(),
});

export type SchedulePreferencesInput = z.infer<typeof schedulePreferencesSchema>;

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}
