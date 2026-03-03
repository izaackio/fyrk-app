export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenAIChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface OpenAIChoice {
  message?: {
    content?: string | null;
  };
}

interface OpenAIChatCompletionResponse {
  choices?: OpenAIChoice[];
  error?: {
    message?: string;
  };
}

export class OpenAIClientError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "OpenAIClientError";
    this.status = status;
  }
}

function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    throw new OpenAIClientError("OPENAI_API_KEY is not configured");
  }

  return key;
}

function getOpenAiOrganization(): string | null {
  const org = process.env.OPENAI_ORG_ID?.trim();
  return org && org.length > 0 ? org : null;
}

export async function createJsonChatCompletion(
  messages: OpenAIChatMessage[],
  options: OpenAIChatCompletionOptions = {},
): Promise<string> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12_000;
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    };

    const organization = getOpenAiOrganization();
    if (organization) {
      headers["OpenAI-Organization"] = organization;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: options.model ?? process.env.OPENAI_WEEKLY_NARRATIVE_MODEL?.trim() ?? "gpt-4o",
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 600,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as OpenAIChatCompletionResponse;

    if (!response.ok) {
      const errorMessage =
        body.error?.message ?? `OpenAI request failed with status ${response.status}`;
      throw new OpenAIClientError(errorMessage, response.status);
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new OpenAIClientError("OpenAI response did not contain message content", response.status);
    }

    return content;
  } catch (error) {
    if (error instanceof OpenAIClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenAIClientError(`OpenAI request timed out after ${timeoutMs}ms`);
    }

    throw new OpenAIClientError("OpenAI request failed");
  } finally {
    clearTimeout(timeoutHandle);
  }
}
