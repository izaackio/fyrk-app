export interface FitnessExplanationPromptContext {
  totalScore: number;
  bufferScore: number;
  growthScore: number;
  protectionScore: number;
  efficiencyScore: number;
  trajectoryScore: number;
  trend: "improving" | "stable" | "declining";
  calculatedAt: string;
  componentDetails: Record<string, unknown>;
}

export const FITNESS_EXPLANATION_SYSTEM = `You explain household financial fitness in clear Nordic plain language.

Rules:
- Return strict JSON only.
- Explain the current score honestly and constructively.
- Suggest micro-actions that are specific and realistically doable in the next 1-4 weeks.
- Each micro-action must map to one component: buffer, growth, protection, efficiency, or trajectory.
- Do not compute new financial figures that are not present in context.
- Do not give security-specific investment advice.
- Keep language concise and practical.`;

export function buildFitnessExplanationUserPrompt(context: FitnessExplanationPromptContext): string {
  return `Use this deterministic score context:

${JSON.stringify(context, null, 2)}

Return JSON with exactly this structure:
{
  "explanation": "string",
  "suggestedActions": [
    {
      "component": "buffer|growth|protection|efficiency|trajectory",
      "title": "string",
      "impact": "string",
      "description": "string"
    }
  ]
}`;
}
