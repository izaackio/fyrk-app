import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createJsonChatCompletion, OpenAIClientError } from "@/lib/ai/client";
import { assembleWeeklyNarrativeContext, type WeeklyNarrativeContext } from "@/lib/ai/context";
import {
  buildWeeklyNarrativeUserPrompt,
  WEEKLY_NARRATIVE_SYSTEM,
} from "@/lib/ai/prompts/weekly-narrative";
import {
  weeklyNarrativeCacheHighlightsSchema,
  weeklyNarrativeOutputSchema,
  type WeeklyNarrativeHighlight,
  type WeeklyNarrativeOutput,
} from "@/lib/ai/schemas";
import type { AuthContext } from "@/lib/auth/middleware";

interface WeeklyNarrativeCacheRow {
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

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeForHash(entryValue)] as const);

    return Object.fromEntries(entries);
  }

  return value;
}

function buildContextHash(context: WeeklyNarrativeContext): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeForHash(context)))
    .digest("hex");
}

function toIsoTimestamp(value = new Date()): string {
  return value.toISOString();
}

function formatMinorAmount(minorUnits: number): string {
  const sign = minorUnits < 0 ? "-" : "";
  const whole = Math.trunc(Math.abs(minorUnits) / 100);
  const formatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, " ");
  return `${sign}${formatted}`;
}

function sourceFromString(value: string | null | undefined): "ai" | "fallback" {
  return value === "ai" ? "ai" : "fallback";
}

function buildFallbackNarrative(context: WeeklyNarrativeContext): WeeklyNarrativeOutput {
  const currency = context.financials.currency || context.household.baseCurrency || "SEK";
  const change = context.recentChanges.netWorthChange;
  const changeDirection = change > 0 ? "increased" : change < 0 ? "decreased" : "was flat";
  const changeAbs = formatMinorAmount(Math.abs(change));
  const currentNetWorth = formatMinorAmount(context.financials.totalNetWorth);

  const changeSentence =
    context.recentChanges.netWorthChangePct === null
      ? `Your household net worth is ${currentNetWorth} ${currency}, and this is the first comparable weekly snapshot.`
      : `Your household net worth ${changeDirection} by ${changeAbs} ${currency} (${context.recentChanges.netWorthChangePct}%) to ${currentNetWorth} ${currency}.`;

  const txSentence =
    context.recentChanges.newTransactions > 0
      ? `We recorded ${context.recentChanges.newTransactions} new transactions during the week.`
      : "No new transactions were recorded this week.";

  const eventSentence =
    context.recentChanges.significantEvents.length > 0
      ? `Largest movement: ${context.recentChanges.significantEvents[0]}.`
      : "Based on the accounts we can see, there were no major transaction events to flag.";

  const actionSentence =
    context.accounts.totalCount === 0
      ? "Add at least one account to improve the narrative quality next week."
      : "If this trend continues, review cash flow and liability changes before next week's check-in.";

  const highlights: WeeklyNarrativeHighlight[] = [
    {
      type: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
      text:
        context.recentChanges.netWorthChangePct === null
          ? `First baseline available at ${currentNetWorth} ${currency}.`
          : `Net worth ${changeDirection} by ${changeAbs} ${currency}.`,
    },
    {
      type: "neutral",
      text:
        context.recentChanges.newTransactions > 0
          ? `${context.recentChanges.newTransactions} transactions were recorded this week.`
          : "No new transactions were recorded this week.",
    },
  ];

  if (context.accounts.totalCount === 0) {
    highlights.push({
      type: "action",
      text: "Connect or import an account so next week's narrative can include richer context.",
    });
  } else if (context.recentChanges.significantEvents.length > 0) {
    highlights.push({
      type: "action",
      text: context.recentChanges.significantEvents[0] ?? "Review this week's largest transaction.",
    });
  }

  return {
    narrative: `${changeSentence} ${txSentence} ${eventSentence} ${actionSentence}`,
    highlights,
  };
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
    output: buildFallbackNarrative(context),
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
    .select("context_hash, narrative, highlights, source, generated_at")
    .eq("household_id", householdId)
    .eq("as_of_week", asOfWeek)
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

function parseCachedHighlights(raw: unknown): WeeklyNarrativeHighlight[] {
  const parsed = weeklyNarrativeCacheHighlightsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export async function generateWeeklyNarrative(
  authContext: AuthContext,
  householdId: string,
): Promise<WeeklyNarrativeResult> {
  const context = await assembleWeeklyNarrativeContext(authContext, householdId);
  const contextHash = buildContextHash(context);
  const cached = await loadCachedNarrative(authContext.supabase, householdId, context.asOfWeek);

  if (cached && cached.context_hash === contextHash) {
    return {
      narrative: cached.narrative,
      highlights: parseCachedHighlights(cached.highlights),
      generatedAt: cached.generated_at,
      source: sourceFromString(cached.source),
      asOfWeek: context.asOfWeek,
      fromCache: true,
    };
  }

  const generatedAt = toIsoTimestamp();
  const generationResult = await generateWithFallback(context);

  await persistNarrativeCache(authContext.supabase, {
    householdId,
    asOfWeek: context.asOfWeek,
    contextHash,
    output: generationResult.output,
    source: generationResult.source,
    generatedAt,
  });

  return {
    narrative: generationResult.output.narrative,
    highlights: generationResult.output.highlights,
    generatedAt,
    source: generationResult.source,
    asOfWeek: context.asOfWeek,
    fromCache: false,
  };
}
