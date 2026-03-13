import type { FitnessSuggestedAction } from "@/lib/calculations/fitness";

import {
  createJsonChatCompletion,
  OpenAIClientError,
  type OpenAIChatCompletionOptions,
  type OpenAIChatMessage,
} from "@/lib/ai/client";
import { buildDeterministicFitnessExplanation } from "@/lib/ai/deterministic-artifacts";
import {
  buildFitnessExplanationUserPrompt,
  FITNESS_EXPLANATION_SYSTEM,
  type FitnessExplanationPromptContext,
} from "@/lib/ai/prompts/fitness-explanation";
import {
  fitnessActionAiSchema,
  fitnessExplanationAiOutputSchema,
} from "@/lib/ai/schemas";

type JsonGenerator = (
  messages: OpenAIChatMessage[],
  options?: OpenAIChatCompletionOptions,
) => Promise<string>;

interface GenerateFitnessExplanationOptions {
  fallbackExplanation: string;
  fallbackActions: FitnessSuggestedAction[];
  retries?: number;
  jsonGenerator?: JsonGenerator;
}

export interface GeneratedFitnessExplanation {
  explanation: string;
  suggestedActions: FitnessSuggestedAction[];
  source: "ai" | "fallback";
}

const AI_RETRIES = 2;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeFallbackActions(actions: FitnessSuggestedAction[]): FitnessSuggestedAction[] {
  const parsed = fitnessActionAiSchema.array().max(5).safeParse(actions);
  if (!parsed.success) {
    return [];
  }

  return parsed.data;
}

function normalizeFallbackExplanation(explanation: string, totalScore: number): string {
  const normalized = explanation.trim();
  if (normalized.length > 0) {
    return normalized;
  }

  return `Your household financial fitness score is ${totalScore}.`;
}

async function generateWithOpenAi(
  context: FitnessExplanationPromptContext,
  jsonGenerator: JsonGenerator,
): Promise<{ explanation: string; suggestedActions: FitnessSuggestedAction[] }> {
  const content = await jsonGenerator(
    [
      {
        role: "system",
        content: FITNESS_EXPLANATION_SYSTEM,
      },
      {
        role: "user",
        content: buildFitnessExplanationUserPrompt(context),
      },
    ],
    {
      model: process.env.OPENAI_FITNESS_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.25,
      maxTokens: 700,
      timeoutMs: 10_000,
    },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON payload");
  }

  const output = fitnessExplanationAiOutputSchema.parse(parsed);
  return {
    explanation: output.explanation,
    suggestedActions: output.suggestedActions,
  };
}

export async function generateFitnessExplanation(
  context: FitnessExplanationPromptContext,
  options: GenerateFitnessExplanationOptions,
): Promise<GeneratedFitnessExplanation> {
  const jsonGenerator = options.jsonGenerator ?? createJsonChatCompletion;
  const retries = Math.max(1, options.retries ?? AI_RETRIES);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const output = await generateWithOpenAi(context, jsonGenerator);
      return {
        explanation: output.explanation,
        suggestedActions: output.suggestedActions,
        source: "ai",
      };
    } catch {
      if (attempt < retries - 1) {
        await sleep((attempt + 1) * 1000);
      }
    }
  }

  return {
    ...buildDeterministicFitnessExplanation({
      totalScore: context.totalScore,
      fallbackExplanation: normalizeFallbackExplanation(options.fallbackExplanation, context.totalScore),
      fallbackActions: normalizeFallbackActions(options.fallbackActions),
    }),
    source: "fallback",
  };
}
