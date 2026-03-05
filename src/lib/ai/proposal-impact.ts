import {
  createJsonChatCompletion,
  OpenAIClientError,
  type OpenAIChatCompletionOptions,
  type OpenAIChatMessage,
} from "@/lib/ai/client";
import {
  buildProposalImpactUserPrompt,
  PROPOSAL_IMPACT_SYSTEM,
  type ProposalImpactPromptContext,
} from "@/lib/ai/prompts/proposal-impact";
import {
  proposalImpactAiOutputSchema,
  proposalImpactDeterministicContextSchema,
  proposalImpactOutputSchema,
  type ProposalImpactDeterministicContext,
  type ProposalImpactOutput,
} from "@/lib/ai/schemas";

type JsonGenerator = (
  messages: OpenAIChatMessage[],
  options?: OpenAIChatCompletionOptions,
) => Promise<string>;

interface InterpretProposalImpactOptions {
  retries?: number;
  retryDelayMs?: number;
  jsonGenerator?: JsonGenerator;
}

export interface InterpretedProposalImpact {
  interpretation: ProposalImpactOutput;
  source: "ai" | "fallback";
}

const AI_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 1_000;

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function normalizeConsiderations(context: ProposalImpactPromptContext): string[] {
  const output: string[] = [];

  if (context.approvalContext.requiredApprovers.length > 0) {
    output.push("Confirm required household approvers are aligned before execution.");
  }

  if (context.approvalContext.decisionDeadline) {
    output.push(`Validate timing against the decision deadline: ${context.approvalContext.decisionDeadline}.`);
  }

  if (context.approvalContext.governanceNote) {
    output.push(context.approvalContext.governanceNote.trim());
  }

  if (output.length === 0) {
    output.push("Confirm owner, timeline, and decision criteria before approval.");
  }

  return output.slice(0, 6);
}

function normalizeDiscussionPrompts(
  deterministicImpact: ProposalImpactDeterministicContext,
): string[] {
  const prompts: string[] = [];

  if (deterministicImpact.keyTradeoffs.length > 0) {
    prompts.push(`Which tradeoff matters most right now: ${deterministicImpact.keyTradeoffs[0]}?`);
  }

  if (deterministicImpact.assumptions.length > 0) {
    prompts.push(`Which assumption should be validated first: ${deterministicImpact.assumptions[0]}?`);
  }

  if (deterministicImpact.riskFlags.length > 0) {
    prompts.push(`What mitigation is needed for this risk: ${deterministicImpact.riskFlags[0]}?`);
  }

  if (prompts.length === 0) {
    prompts.push("What evidence do we need before making a final approval decision?");
  }

  return prompts.slice(0, 6);
}

function buildDataOnlyFallback(
  context: ProposalImpactPromptContext,
  deterministicImpact: ProposalImpactDeterministicContext,
): ProposalImpactOutput {
  return proposalImpactOutputSchema.parse({
    summary:
      "Proposal impact is shown in data-only mode because AI interpretation is temporarily unavailable.",
    householdImpact:
      deterministicImpact.keyTradeoffs[0] ??
      "Deterministic tradeoff data is available and ready for household discussion.",
    riskAssessment:
      deterministicImpact.riskFlags[0] ??
      "No explicit risk flags were provided in this deterministic context.",
    approvalConsiderations: normalizeConsiderations(context),
    discussionPrompts: normalizeDiscussionPrompts(deterministicImpact),
    deterministicImpact,
  });
}

async function generateWithOpenAi(
  context: ProposalImpactPromptContext,
  deterministicImpact: ProposalImpactDeterministicContext,
  jsonGenerator: JsonGenerator,
): Promise<ProposalImpactOutput> {
  const content = await jsonGenerator(
    [
      {
        role: "system",
        content: PROPOSAL_IMPACT_SYSTEM,
      },
      {
        role: "user",
        content: buildProposalImpactUserPrompt(context),
      },
    ],
    {
      model: process.env.OPENAI_PROPOSAL_IMPACT_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 900,
      timeoutMs: 12_000,
    },
  );

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    throw new OpenAIClientError("OpenAI returned invalid JSON payload");
  }

  const aiOutput = proposalImpactAiOutputSchema.parse(parsedContent);

  return proposalImpactOutputSchema.parse({
    summary: aiOutput.summary,
    householdImpact: aiOutput.householdImpact,
    riskAssessment: aiOutput.riskAssessment,
    approvalConsiderations: aiOutput.approvalConsiderations,
    discussionPrompts: aiOutput.discussionPrompts,
    deterministicImpact,
  });
}

export async function interpretProposalImpact(
  context: ProposalImpactPromptContext,
  options: InterpretProposalImpactOptions = {},
): Promise<InterpretedProposalImpact> {
  const deterministicImpact = proposalImpactDeterministicContextSchema.parse(context.deterministicImpact);
  const jsonGenerator = options.jsonGenerator ?? createJsonChatCompletion;
  const retries = Math.max(1, options.retries ?? AI_RETRIES);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return {
        interpretation: await generateWithOpenAi(context, deterministicImpact, jsonGenerator),
        source: "ai",
      };
    } catch {
      if (attempt < retries - 1 && retryDelayMs > 0) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  return {
    interpretation: buildDataOnlyFallback(context, deterministicImpact),
    source: "fallback",
  };
}
