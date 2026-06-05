export type MockSections = {
  mcq: number;
  short: number;
  long: number;
  numerical: number;
};

export type MockRules = {
  strict: boolean;
  shuffle: boolean;
  negative: boolean;
  calculator: boolean;
  fullscreen: boolean;
  webcam: boolean;
};

export type MockConfig = {
  mode: "global" | "institutional";
  institutions: string[];
  topics: string[];
  bloom: string[];
  yearFrom: number;
  yearTo: number;
  sections: MockSections;
  modality: "text" | "voice" | "image";
  mixed: boolean;
  rules: MockRules;
  duration: number;
  paperId?: string;
  tab_switches?: number;
};

const DEFAULT_RULES: MockRules = {
  strict: true,
  shuffle: true,
  negative: false,
  calculator: true,
  fullscreen: true,
  webcam: false,
};

export function sectionTotal(sections: MockSections): number {
  return sections.mcq + sections.short + sections.long + sections.numerical;
}

export function normalizeMockConfig(raw: unknown): MockConfig {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sectionsRaw = (body.sections ?? {}) as Record<string, unknown>;
  const rulesRaw = (body.rules ?? {}) as Record<string, unknown>;

  const sections: MockSections = {
    mcq: Math.max(0, Number(sectionsRaw.mcq) || 0),
    short: Math.max(0, Number(sectionsRaw.short) || 0),
    long: Math.max(0, Number(sectionsRaw.long) || 0),
    numerical: Math.max(0, Number(sectionsRaw.numerical) || 0),
  };

  const mode = body.mode === "institutional" ? "institutional" : "global";
  const modality =
    body.modality === "voice" || body.modality === "image" ? body.modality : "text";

  return {
    mode,
    institutions: Array.isArray(body.institutions)
      ? body.institutions.map(String).filter(Boolean)
      : [],
    topics: Array.isArray(body.topics)
      ? body.topics.map(String).filter(Boolean)
      : ["General"],
    bloom: Array.isArray(body.bloom) ? body.bloom.map(String).filter(Boolean) : [],
    yearFrom: Number(body.yearFrom) || 2019,
    yearTo: Number(body.yearTo) || 2024,
    sections,
    modality,
    mixed: Boolean(body.mixed),
    rules: {
      strict: rulesRaw.strict !== false,
      shuffle: rulesRaw.shuffle !== false,
      negative: Boolean(rulesRaw.negative),
      calculator: rulesRaw.calculator !== false,
      fullscreen: rulesRaw.fullscreen !== false,
      webcam: Boolean(rulesRaw.webcam),
    },
    duration: Math.max(15, Number(body.duration) || 60),
    paperId: typeof body.paperId === "string" ? body.paperId : undefined,
    tab_switches: Number(body.tab_switches) || 0,
  };
}

export function validateMockConfig(raw: unknown): MockConfig {
  const config = normalizeMockConfig(raw);
  if (sectionTotal(config.sections) < 1) {
    throw new Error("At least one question is required");
  }
  if (!config.topics.length) {
    throw new Error("Select at least one topic");
  }
  return config;
}

export { DEFAULT_RULES };
