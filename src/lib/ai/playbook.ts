import {
  createJsonChatCompletion,
  OpenAIClientError,
  type OpenAIChatCompletionOptions,
  type OpenAIChatMessage,
} from "@/lib/ai/client";
import {
  buildLifeEventPlaybookUserPrompt,
  LIFE_EVENT_PLAYBOOK_SYSTEM,
  type LifeEventPlaybookPromptContext,
} from "@/lib/ai/prompts/life-event-playbook";
import {
  playbookAiOutputSchema,
  playbookActionAiSchema,
  type PlaybookAiAction,
} from "@/lib/ai/schemas";

type JsonGenerator = (
  messages: OpenAIChatMessage[],
  options?: OpenAIChatCompletionOptions,
) => Promise<string>;

interface GenerateLifeEventPlaybookOptions {
  fallbackActions: PlaybookAiAction[];
  retries?: number;
  jsonGenerator?: JsonGenerator;
}

export interface GeneratedLifeEventPlaybook {
  actions: PlaybookAiAction[];
  source: "ai" | "fallback";
}

const AI_RETRIES = 2;

const defaultFallbackAction: PlaybookAiAction = {
  title: "Review life-event plan together",
  description: "Confirm timeline, owners, and critical dependencies before execution starts.",
  category: "administrative",
  priority: "high",
  estimatedImpactDescription: "Improves execution reliability across the household.",
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeFallbackActions(actions: PlaybookAiAction[]): PlaybookAiAction[] {
  const listSchema = playbookActionAiSchema.array().min(1).max(15);
  const parsed = listSchema.safeParse(actions);
  if (parsed.success) {
    return parsed.data;
  }

  return [defaultFallbackAction];
}

async function generateWithOpenAi(
  context: LifeEventPlaybookPromptContext,
  jsonGenerator: JsonGenerator,
): Promise<PlaybookAiAction[]> {
  const content = await jsonGenerator(
    [
      {
        role: "system",
        content: LIFE_EVENT_PLAYBOOK_SYSTEM,
      },
      {
        role: "user",
        content: buildLifeEventPlaybookUserPrompt(context),
      },
    ],
    {
      model: process.env.OPENAI_PLAYBOOK_MODEL?.trim() || "gpt-4o",
      temperature: 0.2,
      maxTokens: 1400,
      timeoutMs: 15_000,
    },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON payload");
  }

  return playbookAiOutputSchema.parse(parsed).actions;
}

export async function generateLifeEventPlaybook(
  context: LifeEventPlaybookPromptContext,
  options: GenerateLifeEventPlaybookOptions,
): Promise<GeneratedLifeEventPlaybook> {
  const jsonGenerator = options.jsonGenerator ?? createJsonChatCompletion;
  const retries = Math.max(1, options.retries ?? AI_RETRIES);
  const fallbackActions = normalizeFallbackActions(options.fallbackActions);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const actions = await generateWithOpenAi(context, jsonGenerator);
      return {
        actions,
        source: "ai",
      };
    } catch {
      if (attempt < retries - 1) {
        await sleep((attempt + 1) * 1000);
      }
    }
  }

  return {
    actions: fallbackActions,
    source: "fallback",
  };
}
