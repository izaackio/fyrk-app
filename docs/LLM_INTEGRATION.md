# FYRK — LLM Integration Design
## AI Pipeline Architecture, Prompts, and Orchestration

> **Version:** 0.1
> **Source:** [API_SPEC.md](./API_SPEC.md) · [DATA_MODEL.md](./DATA_MODEL.md)
> **Primary model:** OpenAI GPT-4o | **Budget model:** GPT-4o-mini
> **Consumed by:** AI/LLM agent

---

## 1. AI Use Case Inventory

| # | Use case | Model | Trigger | Latency | Cost/call (est.) |
|---|---|---|---|---|---|
| AI-01 | "What Changed This Week" narrative | GPT-4o | Weekly cron + on-demand | <10s | ~$0.03 |
| AI-02 | Quarterly Review generation | GPT-4o | Quarterly cron + manual trigger | <30s | ~$0.15 |
| AI-03 | Life Event playbook generation | GPT-4o | User triggers event | <15s | ~$0.10 |
| AI-04 | Life Event impact modeling | GPT-4o | With playbook generation | <10s | ~$0.05 |
| AI-05 | Financial Fitness explanation | GPT-4o-mini | On score calculation | <5s | ~$0.01 |
| AI-06 | Fitness micro-action suggestions | GPT-4o-mini | With fitness calc | <5s | ~$0.01 |
| AI-07 | CSV parsing assistance | GPT-4o-mini | On CSV upload (fallback only) | <10s | ~$0.02 |
| AI-08 | Proposal impact analysis | GPT-4o-mini | On proposal creation | <5s | ~$0.01 |

**Estimated monthly cost (500 active households):** ~$120/month

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│              AI SERVICE LAYER                │
│                                               │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │ Context       │    │ Prompt Template    │  │
│  │ Assembler     │───▸│ Engine             │  │
│  └──────┬───────┘    └───────┬───────────┘  │
│         │                     │               │
│         ▼                     ▼               │
│  ┌──────────────────────────────────────┐    │
│  │         OpenAI Client                  │    │
│  │  (structured output / JSON mode)       │    │
│  └──────────────┬────────────────────────┘    │
│                  │                             │
│                  ▼                             │
│  ┌──────────────────────────────────────┐    │
│  │       Output Parser + Validator        │    │
│  │  (Zod schema validation)               │    │
│  └──────────────┬────────────────────────┘    │
│                  │                             │
│                  ▼                             │
│  ┌──────────────────────────────────────┐    │
│  │       Result Store                     │    │
│  │  (save to DB + timeline)               │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Core modules

```typescript
// src/lib/ai/client.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
})

// src/lib/ai/generate.ts
export async function generateStructuredOutput<T>(
  prompt: string,
  systemPrompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: options?.model ?? 'gpt-4o',
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  })

  const parsed = JSON.parse(response.choices[0].message.content!)
  return schema.parse(parsed)  // Validate against Zod schema
}
```

---

## 3. Context Assembly

Every AI call receives structured household context. The Context Assembler constructs this from the database:

```typescript
// src/lib/ai/context.ts

interface HouseholdContext {
  household: {
    name: string
    memberCount: number
    members: Array<{ displayName: string; role: string }>
    baseCurrency: string
  }
  financials: {
    totalNetWorth: number          // minor units
    totalAssets: number
    totalLiabilities: number
    accounts: Array<{
      name: string
      type: string
      wrapperType: string | null
      provider: string
      totalValue: number
      currency: string
    }>
    allocation: {
      byAssetClass: Array<{ class: string; pct: number }>
      byGeography: Array<{ country: string; pct: number }>
      byCurrency: Array<{ currency: string; pct: number }>
    }
    fitnessScore: number
    fitnessComponents: Record<string, number>
  }
  recentChanges?: {
    netWorthChange: number
    netWorthChangePct: number
    period: string
    newTransactions: number
    significantEvents: string[]
  }
  activeEvents?: Array<{
    type: string
    title: string
    status: string
    pendingActions: number
  }>
  goals?: Array<{
    title: string
    targetDate: string
    progressPct: number
  }>
}

export async function assembleHouseholdContext(
  householdId: string,
  options?: { includeRecentChanges?: boolean; includeEvents?: boolean }
): Promise<HouseholdContext> {
  // Query database and assemble context
  // ... implementation
}
```

---

## 4. Prompt Templates

### AI-01: "What Changed This Week" Narrative

```typescript
// src/lib/ai/prompts/weekly-narrative.ts

export const WEEKLY_NARRATIVE_SYSTEM = `You are a calm, professional household financial advisor 
generating a weekly summary for a Nordic household. 

VOICE: Warm but precise. Like a trusted family accountant who knows the family well.
FORMAT: 3-5 concise sentences. No bullet points. Conversational but informative.
RULES:
- Always mention net worth change (amount + percentage)
- Highlight the most significant change (market, transaction, or event)
- If something needs attention, mention it naturally (not as an alarm)
- Use the household members' first names  
- Amounts in SEK, formatted with spaces (e.g., "42 500 SEK")
- Never give investment advice. Describe what happened and what to be aware of.
- If data is limited, say so naturally ("Based on the accounts we can see...")`

export const WEEKLY_NARRATIVE_USER = (context: HouseholdContext) => `
Generate a weekly financial summary for the ${context.household.name}.

HOUSEHOLD CONTEXT:
${JSON.stringify(context, null, 2)}

Generate a warm, concise weekly narrative in JSON format:
{
  "narrative": "string (3-5 sentences)",
  "highlights": [
    { "type": "positive|neutral|negative|action", "text": "string" }
  ]
}`
```

### AI-02: Quarterly Review

```typescript
export const QUARTERLY_REVIEW_SYSTEM = `You are a Digital Family Office generating a quarterly 
financial review. This is the most important document the household receives every quarter.

VOICE: Professional, comprehensive, but accessible. Like a private banker's quarterly letter.
STRUCTURE: Follow the exact JSON schema provided.
RULES:
- All amounts in SEK minor units (öre). The UI will format them.
- Recommendations must be specific, actionable, and ranked by estimated impact.
- Never recommend specific securities or funds (give categories/approaches).
- Always acknowledge limitations in data quality.
- Be conservative in estimates — understate rather than overstate.
- Each recommendation needs: priority (critical/high/medium/low), title, 
  description, estimated impact in SEK/year, and the fitness component it affects.`

// Output schema
const quarterlyReviewSchema = z.object({
  narrative: z.string(),
  performanceAttribution: z.object({
    marketReturns: z.number(),
    netSavings: z.number(),
    debtReduction: z.number(),
    feesDrag: z.number(),
    explanation: z.string(),
  }),
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
    estimatedImpactPerYear: z.number(),
    fitnessComponent: z.string(),
    actionType: z.enum(['proposal', 'research', 'monitor', 'discuss']),
  })),
  upcomingEvents: z.array(z.object({
    title: z.string(),
    date: z.string(),
    preparationNeeded: z.string(),
  })),
  quarterSummary: z.string(),
  nextQuarterFocus: z.string(),
})
```

### AI-03: Life Event Playbook

```typescript
export const PLAYBOOK_SYSTEM = `You are a household financial planner generating a step-by-step 
playbook for a major life event in Sweden.

CONTEXT: Swedish financial system — ISK, KF, depå wrappers; PPM, tjänstepension; 
Swedish tax rules; Swedish insurance system; Swedish mortgage market.

RULES:
- Generate 10-15 actionable steps, sequenced logically.
- Each step must be concrete ("Call your mortgage bank for a lånelofte") not vague ("Consider your options").
- Assign priorities: critical (must do), high (should do), medium (to optimize), low (nice to have).
- Include estimated financial impact where quantifiable.
- Cover all domains: financial, legal, insurance, tax, administrative.
- Reference Swedish-specific concepts where relevant.
- Never give specific investment advice — focus on structure, process, and optimization.`

const playbookSchema = z.object({
  actions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['financial', 'legal', 'insurance', 'tax', 'administrative']),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    sortOrder: z.number(),
    estimatedImpactAmount: z.number().nullable(),
    estimatedImpactDescription: z.string(),
    dependsOnActionIndex: z.number().nullable(),
  })),
  impactSummary: z.string(),
  impactData: z.object({
    downPaymentRequired: z.number().nullable(),
    monthlyPaymentChange: z.number().nullable(),
    netWorthImpactPct: z.number().nullable(),
    fitnessScoreImpact: z.number().nullable(),
    keyRisks: z.array(z.string()),
    keyAssumptions: z.array(z.string()),
  }),
})
```

### AI-05/06: Fitness Explanation & Micro-actions

```typescript
export const FITNESS_SYSTEM = `You explain Financial Fitness Scores to Nordic households.

The score is 0-1000 with 5 components (each 0-200):
- Buffer: months of expenses covered by liquid savings
- Growth: investment allocation effectiveness vs age-appropriate benchmark
- Protection: insurance coverage vs liability/income exposure  
- Efficiency: minimizing fee drag and tax inefficiency
- Trajectory: is the household improving over time?

RULES:
- Explain what each component score means in plain language.
- For micro-actions: suggest ONE specific, achievable action per component that 
  would improve the score. "Move 5,000 SEK from savings to ISK" not "Consider investing more."
- Be encouraging but honest. Low scores are opportunities, not failures.`
```

---

## 5. Caching & Cost Management

| Strategy | Implementation |
|---|---|
| **Cache weekly narratives** | Store in DB; regenerate only if data changed since last generation |
| **Cache fitness explanations** | Regenerate only when score changes by ±10 points |
| **Rate limit AI endpoints** | Max 5 AI calls per user per minute |
| **Model tiering** | GPT-4o for complex generation; GPT-4o-mini for explanations/summaries |
| **Token budgets** | Max 4096 output tokens per call; context assembled to minimize input |
| **Batch generation** | Weekly narratives and fitness scores run as batch cron jobs |

---

## 6. Error Handling & Fallbacks

```typescript
// src/lib/ai/pipelines/with-fallback.ts

export async function generateWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => T,  // structured data without AI narrative
  maxRetries: number = 2,
): Promise<{ data: T; source: 'ai' | 'fallback' }> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await primaryFn()
      return { data: result, source: 'ai' }
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('AI generation failed, using fallback', error)
        return { data: fallbackFn(), source: 'fallback' }
      }
      await sleep(1000 * (i + 1))  // exponential backoff
    }
  }
  return { data: fallbackFn(), source: 'fallback' }
}
```

If AI generation fails:
- **Weekly narrative:** Show structured data (net worth change, transactions) without narrative
- **Quarterly review:** Show data-only review without AI narrative; retry button
- **Playbook:** Show template-based generic playbook; flag as "generic, not personalized"
- **Fitness explanation:** Show component scores without natural language explanation
