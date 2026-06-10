export type ExtendedProfileSettings = {
  skillLevel?: string;
  timezone?: string;
  location?: string;
  primaryGoal?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  topicOrder?: string[];
};

export function pickExtendedSettings(settings: Record<string, unknown> | null | undefined): ExtendedProfileSettings {
  const s = settings ?? {};
  return {
    skillLevel: typeof s.skillLevel === "string" ? s.skillLevel : undefined,
    timezone: typeof s.timezone === "string" ? s.timezone : undefined,
    location: typeof s.location === "string" ? s.location : undefined,
    primaryGoal: typeof s.primaryGoal === "string" ? s.primaryGoal : undefined,
    website: typeof s.website === "string" ? s.website : undefined,
    github: typeof s.github === "string" ? s.github : undefined,
    linkedin: typeof s.linkedin === "string" ? s.linkedin : undefined,
    topicOrder: Array.isArray(s.topicOrder)
      ? s.topicOrder.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

export function mergeExtendedSettings(
  existing: Record<string, unknown> | null | undefined,
  patch: Partial<ExtendedProfileSettings>
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
}
