import type { ProposalImpactDeterministicContext } from "@/lib/ai/schemas";

export interface ProposalImpactPromptContext {
  householdName: string;
  proposalTitle: string;
  proposalCategory: string;
  proposalDescription: string;
  currency: string;
  deterministicImpact: ProposalImpactDeterministicContext;
  approvalContext: {
    requiredApprovers: string[];
    decisionDeadline: string | null;
    governanceNote: string | null;
  };
}

export const PROPOSAL_IMPACT_SYSTEM = `You are Fyrk's governance copilot interpreting proposal impact for a household in Warm Authority tone.

Tone rules:
- Calm, direct, and balanced.
- Explain tradeoffs clearly without drama.
- Keep language understandable for mixed financial confidence levels.

Strict rules:
- Return strict JSON only.
- Use only deterministic context provided. Do not invent new figures or perform new calculations.
- Do not provide personalized security recommendations or specific security trading advice.
- Keep discussion prompts neutral and decision-oriented.
- Explicitly surface uncertainty when context is limited.`;

export function buildProposalImpactUserPrompt(context: ProposalImpactPromptContext): string {
  return `Interpret this deterministic proposal context:

${JSON.stringify(context, null, 2)}

Return JSON with exactly this structure:
{
  "summary": "string",
  "householdImpact": "string",
  "riskAssessment": "string",
  "approvalConsiderations": ["string"],
  "discussionPrompts": ["string"]
}`;
}
