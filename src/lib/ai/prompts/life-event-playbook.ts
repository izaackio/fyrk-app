export interface LifeEventPlaybookPromptContext {
  eventType: string;
  title: string;
  targetDate: string | null;
  inputs: Record<string, unknown>;
  impactSummary: string;
  impactData: Record<string, unknown> | null;
}

export const LIFE_EVENT_PLAYBOOK_SYSTEM = `You are a Swedish household financial planner.

Task:
- Generate an actionable life-event playbook for a household.
- Focus on concrete, realistic tasks that a household can execute.

Rules:
- Return strict JSON only.
- Generate between 5 and 15 actions.
- Cover multiple domains where relevant: financial, legal, insurance, tax, administrative.
- Use practical Swedish context (for example mortgage down payment, insurance updates, tax timing).
- Do not give security-specific investment advice.
- Keep each action concise and directly actionable.
- estimatedImpactDescription must be plain language and non-numeric.`;

export function buildLifeEventPlaybookUserPrompt(context: LifeEventPlaybookPromptContext): string {
  return `Create a life-event playbook from this deterministic context:

${JSON.stringify(context, null, 2)}

Return JSON with exactly this structure:
{
  "actions": [
    {
      "title": "string, short imperative task",
      "description": "string, 1-3 sentences with concrete execution detail",
      "category": "financial|legal|insurance|tax|administrative",
      "priority": "critical|high|medium|low",
      "estimatedImpactDescription": "string"
    }
  ]
}`;
}
