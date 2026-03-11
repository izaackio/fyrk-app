import type { DemoVariant } from "./contracts";

export interface DemoVariantOption {
  value: DemoVariant;
  label: string;
  description: string;
}

export const DEMO_VARIANT_OPTIONS: DemoVariantOption[] = [
  {
    value: "standard",
    label: "Balanced household",
    description: "A calm baseline with shared spending, investments, and a mortgage.",
  },
  {
    value: "fire",
    label: "FIRE planning",
    description: "A higher-savings demo focused on runway, optionality, and target dates.",
  },
  {
    value: "fam_family",
    label: "Family office",
    description: "A more complex household with broader holdings, planning, and reviews.",
  },
  {
    value: "friendly_family",
    label: "Starter household",
    description: "A simpler first-time setup with lighter balances and clearer next steps.",
  },
];

export const DEMO_VARIANT_LABELS: Record<DemoVariant, string> = DEMO_VARIANT_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {} as Record<DemoVariant, string>,
);
