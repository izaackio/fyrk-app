import type { SupabaseClient } from "@supabase/supabase-js";

import { createJsonChatCompletion, OpenAIClientError } from "@/lib/ai/client";
import { assembleWeeklyNarrativeContext, type WeeklyNarrativeContext } from "@/lib/ai/context";
import {
  buildDeterministicWeeklyNarrative,
  buildWeeklyNarrativeContextHash,
} from "@/lib/ai/deterministic-artifacts";
import {
  buildWeeklyNarrativeUserPrompt,
  WEEKLY_NARRATIVE_SYSTEM,
} from "@/lib/ai/prompts/weekly-narrative";
import {
  weeklyNarrativeOutputSchema,
  type WeeklyNarrativeOutput,
} from "@/lib/ai/schemas";
import type { AuthContext } from "@/lib/auth/middleware";
import { isActiveDemoContext } from "@/lib/demo";

interface WeeklyNarrativeCacheRow {
  as_of_week: string;
  context_hash: string;
  narrative: string;
  highlights: unknown;
  source: string;
  generated_at: string;
}

export interface WeeklyNarrativeResult extends WeeklyNarrativeOutput {
  generatedAt: string;
  source: "ai" | "fallback";
  asOfWeek: string;
  fromCache: boolean;
}

const aiRetries = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toIsoTimestamp(value = new Date()): string {
  return value.toISOString();
}

function sourceFromString(value: string | null | undefined): "ai" | "fallback" {
  return value === "ai" ? "ai" : "fallback";
}

async function generateWithOpenAi(context: WeeklyNarrativeContext): Promise<WeeklyNarrativeOutput> {
  const content = await createJsonChatCompletion(
    [
      {
        role: "system",
        content: WEEKLY_NARRATIVE_SYSTEM,
      },
      {
        role: "user",
        content: buildWeeklyNarrativeUserPrompt(context),
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 600,
      timeoutMs: 12_000,
    },
  );

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON payload");
  }

  return weeklyNarrativeOutputSchema.parse(parsedContent);
}

async function generateWithFallback(context: WeeklyNarrativeContext): Promise<{
  output: WeeklyNarrativeOutput;
  source: "ai" | "fallback";
}> {
  for (let attempt = 0; attempt < aiRetries; attempt += 1) {
    try {
      return {
        output: await generateWithOpenAi(context),
        source: "ai",
      };
    } catch {
      if (attempt < aiRetries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  return {
    output: buildDeterministicWeeklyNarrative(context),
    source: "fallback",
  };
}

async function loadCachedNarrative(
  supabase: SupabaseClient,
  householdId: string,
  asOfWeek: string,
): Promise<WeeklyNarrativeCacheRow | null> {
  const { data, error } = await supabase
    .from("weekly_narrative_cache")
    .select("as_of_week, context_hash, narrative, highlights, source, generated_at")
    .eq("household_id", householdId)
    .eq("as_of_week", asOfWeek)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WeeklyNarrativeCacheRow | null) ?? null;
}

async function loadLatestCachedNarrative(
  supabase: SupabaseClient,
  householdId: string,
): Promise<WeeklyNarrativeCacheRow | null> {
  const { data, error } = await supabase
    .from("weekly_narrative_cache")
    .select("as_of_week, context_hash, narrative, highlights, source, generated_at")
    .eq("household_id", householdId)
    .order("as_of_week", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WeeklyNarrativeCacheRow | null) ?? null;
}

async function persistNarrativeCache(
  supabase: SupabaseClient,
  input: {
    householdId: string;
    asOfWeek: string;
    contextHash: string;
    output: WeeklyNarrativeOutput;
    source: "ai" | "fallback";
    generatedAt: string;
  },
): Promise<void> {
  const { error } = await supabase.from("weekly_narrative_cache").upsert(
    {
      household_id: input.householdId,
      as_of_week: input.asOfWeek,
      context_hash: input.contextHash,
      narrative: input.output.narrative,
      highlights: input.output.highlights,
      source: input.source,
      generated_at: input.generatedAt,
    },
    {
      onConflict: "household_id,as_of_week",
    },
  );

  if (error) {
    throw error;
  }
}

function parseCachedOutput(row: WeeklyNarrativeCacheRow): WeeklyNarrativeOutput | null {
  const parsed = weeklyNarrativeOutputSchema.safeParse({
    narrative: row.narrative,
    highlights: row.highlights,
  });

  return parsed.success ? parsed.data : null;
}

function mapCachedNarrativeResult(
  row: WeeklyNarrativeCacheRow,
  output: WeeklyNarrativeOutput,
): WeeklyNarrativeResult {
  return {
    narrative: output.narrative,
    highlights: output.highlights,
    generatedAt: row.generated_at,
    source: sourceFromString(row.source),
    asOfWeek: row.as_of_week,
    fromCache: true,
  };
}

export async function generateWeeklyNarrative(
  authContext: AuthContext,
  householdId: string,
): Promise<WeeklyNarrativeResult> {
  const demoAccess = isActiveDemoContext(authContext, householdId);
  const context = await assembleWeeklyNarrativeContext(authContext, householdId);
  const contextHash = buildWeeklyNarrativeContextHash(context);
  const cached = await loadCachedNarrative(authContext.supabase, householdId, context.asOfWeek);

  if (cached && cached.context_hash === contextHash) {
    const parsedCached = parseCachedOutput(cached);
    if (parsedCached) {
      return mapCachedNarrativeResult(cached, parsedCached);
    }
  }

  if (demoAccess) {
    const precomputed = cached ?? (await loadLatestCachedNarrative(authContext.supabase, householdId));
    if (precomputed) {
      const parsedPrecomputed = parseCachedOutput(precomputed);
      if (parsedPrecomputed) {
        return mapCachedNarrativeResult(precomputed, parsedPrecomputed);
      }
    }

    const generatedAt = toIsoTimestamp();
    const output = buildDeterministicWeeklyNarrative(context);
    return {
      narrative: output.narrative,
      highlights: output.highlights,
      generatedAt,
      source: "fallback",
      asOfWeek: context.asOfWeek,
      fromCache: false,
    };
  }

  const generatedAt = toIsoTimestamp();
  const generationResult = await generateWithFallback(context);

  if (!demoAccess) {
    await persistNarrativeCache(authContext.supabase, {
      householdId,
      asOfWeek: context.asOfWeek,
      contextHash,
      output: generationResult.output,
      source: generationResult.source,
      generatedAt,
    });
  }

  return {
    narrative: generationResult.output.narrative,
    highlights: generationResult.output.highlights,
    generatedAt,
    source: generationResult.source,
    asOfWeek: context.asOfWeek,
    fromCache: false,
  };
}
