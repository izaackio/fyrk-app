import { z } from "zod";

const alarmistPatterns = [
  /\bpanic\b/iu,
  /\bcatastroph(?:e|ic)\b/iu,
  /\bdisaster|disastrous\b/iu,
  /\burgent(?:ly)?\b/iu,
  /\bimmediately\b/iu,
  /\bact now\b/iu,
  /\bwarning\b/iu
];

const securityAdvicePattern =
  /\b(buy|sell|short|rotate into|add to|trim|exit|increase|decrease)\b[^.!?\n]{0,80}\b(stock|stocks|fund|funds|etf|etfs|bond|bonds|security|securities|share|shares|equity|equities|holding|holdings)\b/iu;

function countSentences(value: string): number {
  return value
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/u)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

export interface WarmAuthorityTextOptions {
  disallowDigits?: boolean;
  maxLength: number;
  maxSentences?: number;
  maxWords?: number;
  minSentences?: number;
}

export function collectWarmAuthorityIssues(
  value: string,
  options: Omit<WarmAuthorityTextOptions, "maxLength">
): string[] {
  const issues: string[] = [];
  const normalized = value.trim();

  if (!normalized) {
    return ["Text must not be empty."];
  }

  const sentenceCount = countSentences(normalized);

  if (options.minSentences !== undefined && sentenceCount < options.minSentences) {
    issues.push(`Text must contain at least ${options.minSentences} sentence(s).`);
  }

  if (options.maxSentences !== undefined && sentenceCount > options.maxSentences) {
    issues.push(`Text must contain no more than ${options.maxSentences} sentence(s).`);
  }

  if (options.maxWords !== undefined && countWords(normalized) > options.maxWords) {
    issues.push(`Text must contain no more than ${options.maxWords} words.`);
  }

  if (normalized.includes("!")) {
    issues.push("Text must avoid exclamation marks.");
  }

  if (options.disallowDigits && /\d/u.test(normalized)) {
    issues.push("Text must not introduce numeric figures.");
  }

  if (alarmistPatterns.some((pattern) => pattern.test(normalized))) {
    issues.push("Text must avoid alarmist language.");
  }

  if (securityAdvicePattern.test(normalized)) {
    issues.push("Text must avoid personalized security advice.");
  }

  return issues;
}

export function warmAuthorityTextSchema(options: WarmAuthorityTextOptions) {
  return z
    .string()
    .trim()
    .min(1)
    .max(options.maxLength)
    .superRefine((value, context) => {
      for (const issue of collectWarmAuthorityIssues(value, options)) {
        context.addIssue({
          code: "custom",
          message: issue
        });
      }
    });
}
