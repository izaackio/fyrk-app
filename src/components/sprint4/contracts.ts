export type TimelineEntryType =
  | "life_event"
  | "decision"
  | "milestone"
  | "review"
  | "system"
  | "note";

export type TimelineCategory =
  | "housing"
  | "family"
  | "career"
  | "investing"
  | "debt"
  | "insurance"
  | "tax"
  | "planning"
  | "other";

export type LifeEventType =
  | "buying_apartment"
  | "having_child"
  | "changing_jobs"
  | "inheritance"
  | "retirement"
  | "marriage"
  | "divorce";

export type LifeEventStatus = "active" | "completed" | "cancelled";

export type PlaybookActionCategory =
  | "financial"
  | "legal"
  | "insurance"
  | "tax"
  | "planning";

export type PlaybookActionPriority = "critical" | "high" | "medium" | "low";

export type PlaybookActionStatus = "pending" | "completed" | "skipped";

export type FitnessComponent =
  | "buffer"
  | "growth"
  | "protection"
  | "efficiency"
  | "trajectory";

export interface TimelineActor {
  id: string;
  displayName: string;
}

export interface TimelineLinkedEvent {
  id: string;
  status: LifeEventStatus;
  title: string;
}

export interface TimelineEntry {
  category: TimelineCategory;
  createdAt: string;
  createdBy: TimelineActor;
  description: string | null;
  entryDate: string;
  entryType: TimelineEntryType;
  householdId: string;
  id: string;
  isFuture: boolean;
  linkedEvent: TimelineLinkedEvent | null;
  title: string;
}

export interface TimelineFilters {
  categories?: TimelineCategory[];
  from?: string;
  search?: string;
  to?: string;
  types?: TimelineEntryType[];
}

export interface CreateTimelineEntryRequest {
  category: TimelineCategory;
  createdBy: TimelineActor;
  description: string | null;
  entryDate: string;
  entryType: TimelineEntryType;
  householdId: string;
  title: string;
}

export interface UpdateTimelineEntryRequest {
  category?: TimelineCategory;
  description?: string | null;
  entryDate?: string;
  entryType?: TimelineEntryType;
  title?: string;
}

export interface EventLibraryInputDefinition {
  hint: string | null;
  key: string;
  label: string;
  options: string[];
  required: boolean;
  type: "currency" | "date" | "number" | "select" | "text";
}

export interface EventLibraryItem {
  available: boolean;
  category: TimelineCategory;
  description: string;
  eventType: LifeEventType;
  requiredInputs: EventLibraryInputDefinition[];
  title: string;
}

export interface PlaybookAction {
  assignedTo: string | null;
  assignedToLabel: string | null;
  category: PlaybookActionCategory;
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  estimatedImpactDescription: string;
  id: string;
  priority: PlaybookActionPriority;
  status: PlaybookActionStatus;
  title: string;
}

export interface EventImpactData {
  downPaymentRequired: number | null;
  fitnessScoreImpact: number | null;
  monthlyMortgageCost: number | null;
  netWorthImpactPct: number | null;
}

export interface LifeEvent {
  createdAt: string;
  eventType: LifeEventType;
  householdId: string;
  id: string;
  impactData: EventImpactData;
  impactSummary: string;
  inputs: Record<string, string | number | null>;
  playbook: {
    actions: PlaybookAction[];
    totalActions: number;
  };
  progress: {
    completed: number;
    pct: number;
    skipped: number;
    total: number;
  };
  status: LifeEventStatus;
  targetDate: string | null;
  title: string;
  updatedAt: string;
}

export interface TriggerLifeEventRequest {
  eventType: LifeEventType;
  householdId: string;
  inputs: Record<string, string | number | null>;
  title: string;
}

export interface UpdatePlaybookActionRequest {
  assignedTo?: string | null;
  assignedToLabel?: string | null;
  status?: PlaybookActionStatus;
}

export interface FitnessSuggestedAction {
  component: FitnessComponent;
  description: string;
  impact: string;
  title: string;
}

export interface FitnessCurrentScore {
  bufferScore: number;
  calculatedAt: string;
  efficiencyScore: number;
  explanation: string;
  growthScore: number;
  protectionScore: number;
  suggestedActions: FitnessSuggestedAction[];
  totalScore: number;
  trajectoryScore: number;
}

export interface FitnessHistoryPoint {
  date: string;
  score: number;
}

export interface FitnessPayload {
  current: FitnessCurrentScore;
  history: FitnessHistoryPoint[];
}
