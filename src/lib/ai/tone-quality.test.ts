import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  playbookAiOutputSchema,
  quarterlyReviewAiOutputSchema,
  weeklyNarrativeOutputSchema
} from "@/lib/ai/schemas";

const FIXTURE_ROOT = resolve(process.cwd(), "tests/fixtures/ai");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURE_ROOT, fileName), "utf8")) as T;
}

test("weekly narrative fixture passes schema and tone QA", () => {
  const parsed = weeklyNarrativeOutputSchema.parse(readFixture("weekly-output.sample.json"));

  assert.equal(parsed.highlights.length >= 2, true);
});

test("quarterly review fixture passes schema and tone QA", () => {
  const parsed = quarterlyReviewAiOutputSchema.parse(
    readFixture("quarterly-review-output.sample.json")
  );

  assert.equal(parsed.recommendations.length, 2);
});

test("playbook fixture passes schema and tone QA", () => {
  const parsed = playbookAiOutputSchema.parse(readFixture("playbook-output.sample.json"));

  assert.equal(parsed.actions.length, 5);
});
