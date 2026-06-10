import { NextResponse } from "next/server";
import { z } from "zod";
import { logRouteError } from "@/lib/api/log-route-error";
import { SCHEDULE_FULL_DAY_SYSTEM } from "@/lib/ai/prompts";
import { generateWithFailover } from "@/lib/ai/router";
import { buildScheduleAiContext } from "@/lib/schedule/build-ai-context";
import { parseAiScheduleBlocks } from "@/lib/schedule/map-ai-blocks";
import { validateScheduleBlocks } from "@/lib/schedule/validate-blocks";
import { requireUser } from "@/lib/supabase/route-auth";

const regenerateBodySchema = z.object({
  day: z.number().int().min(0).max(6).optional(),
  scope: z.enum(["day", "week"]).default("day"),
  mode: z.enum(["narrative", "profile"]).default("profile"),
  narrative: z.string().max(2000).optional(),
  saveNarrative: z.boolean().optional(),
});

function validateParsedBlocks(
  blocks: ReturnType<typeof parseAiScheduleBlocks>,
  scope: "day" | "week",
  day?: number
): { ok: true } | { ok: false; error: string } {
  const daysToCheck =
    scope === "week" ? [0, 1, 2, 3, 4, 5, 6] : day != null ? [day] : [];

  for (const d of daysToCheck) {
    const dayBlocks = blocks.filter((b) => b.day === d);
    if (dayBlocks.length === 0) {
      if (scope === "day") {
        return { ok: false, error: `No blocks generated for day ${d}` };
      }
      continue;
    }
    const result = validateScheduleBlocks(
      d,
      dayBlocks.map((b) => ({
        start: b.start,
        end: b.end,
        title: b.title,
        kind: b.kind,
        detail: b.detail,
        ai: b.ai,
      }))
    );
    if (!result.ok) {
      return { ok: false, error: `Day ${d}: ${result.error}` };
    }
  }

  if (blocks.length === 0) {
    return { ok: false, error: "AI returned no valid blocks" };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty body ok */
  }

  const parsed = regenerateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { day, scope, mode, narrative, saveNarrative } = parsed.data;

  if (scope === "day" && day == null) {
    return NextResponse.json({ error: "day is required when scope is day" }, { status: 400 });
  }

  try {
    if (saveNarrative && narrative != null) {
      await auth.supabase
        .from("study_plans")
        .update({ schedule_narrative: narrative })
        .eq("user_id", auth.user.id);
    }

    const context = await buildScheduleAiContext(auth.supabase, auth.user.id, {
      mode,
      scope,
      day,
      narrativeOverride: narrative,
    });

    const { text } = await generateWithFailover(
      `${context}\n\nReturn schedule JSON with a "blocks" array.`,
      {
        system: SCHEDULE_FULL_DAY_SYSTEM,
        json: true,
        route: "schedule-regenerate",
        userId: auth.user.id,
      }
    );

    const raw = JSON.parse(text);
    let blocks = parseAiScheduleBlocks(raw);

    if (scope === "day" && day != null) {
      blocks = blocks.filter((b) => b.day === day);
    }

    let validation = validateParsedBlocks(blocks, scope, day);
    if (!validation.ok) {
      const { text: retryText } = await generateWithFailover(
        `${context}\n\nPrevious attempt failed validation: ${validation.error}. Fix overlaps and return valid schedule JSON.`,
        {
          system: SCHEDULE_FULL_DAY_SYSTEM,
          json: true,
          route: "schedule-regenerate-retry",
          userId: auth.user.id,
        }
      );
      const retryRaw = JSON.parse(retryText);
      blocks = parseAiScheduleBlocks(retryRaw);
      if (scope === "day" && day != null) {
        blocks = blocks.filter((b) => b.day === day);
      }
      validation = validateParsedBlocks(blocks, scope, day);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 422 });
      }
    }

    return NextResponse.json({
      schedule: { blocks },
      scope,
      mode,
    });
  } catch (e) {
    logRouteError("POST /api/ai/schedule/regenerate", e, { userId: auth.user.id });
    const message = e instanceof Error ? e.message : "Schedule generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
