import assert from "node:assert/strict";
import test from "node:test";

import { enforceRateLimit } from "../lib/auth/rate-limit";
import {
  accountTransactionsQuerySchema,
  createAccountSchema,
  updateAccountSchema,
} from "../lib/validations/accounts";
import { authEmailRequestSchema } from "../lib/validations/auth";
import { importConfirmBodySchema, importCsvFormSchema } from "../lib/validations/import";
import {
  createHouseholdSchema,
  updateHouseholdMemberSchema,
} from "../lib/validations/household";
import {
  createLifeEventSchema,
  updatePlaybookActionSchema,
} from "../lib/validations/events";
import { fitnessQuerySchema } from "../lib/validations/fitness";
import {
  timelineQuerySchema,
  updateTimelineEntrySchema,
} from "../lib/validations/timeline";
import { ServiceError } from "./errors";

function buildRequest(ip: string): Request {
  return new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

test("auth email schema normalizes casing and whitespace", () => {
  const parsed = authEmailRequestSchema.parse({ email: "  USER@Example.COM  " });
  assert.equal(parsed.email, "user@example.com");
});

test("household create schema enforces and normalizes base currency", () => {
  const parsed = createHouseholdSchema.parse({
    name: "Andersson Household",
    baseCurrency: "sek",
  });

  assert.equal(parsed.baseCurrency, "SEK");
});

test("member update schema only accepts one mutation shape", () => {
  const roleUpdate = updateHouseholdMemberSchema.safeParse({ role: "admin" });
  const removeUpdate = updateHouseholdMemberSchema.safeParse({ status: "removed" });
  const invalidBoth = updateHouseholdMemberSchema.safeParse({ role: "admin", status: "removed" });

  assert.equal(roleUpdate.success, true);
  assert.equal(removeUpdate.success, true);
  assert.equal(invalidBoth.success, false);
});

test("account create schema normalizes currency and visibility alias", () => {
  const parsed = createAccountSchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    name: "ISK Avanza",
    providerId: "avanza",
    accountType: "investment",
    wrapperType: "ISK",
    currency: "sek",
    visibility: "hidden",
  });

  assert.equal(parsed.currency, "SEK");
  assert.equal(parsed.visibility, "amount_hidden");
});

test("account update schema requires at least one mutable field", () => {
  const validNameOnly = updateAccountSchema.safeParse({ name: "New name" });
  const invalidEmpty = updateAccountSchema.safeParse({});

  assert.equal(validNameOnly.success, true);
  assert.equal(invalidEmpty.success, false);
});

test("account transaction query schema parses limit and typed filters", () => {
  const parsed = accountTransactionsQuerySchema.parse({
    limit: "20",
    type: "buy,sell,dividend",
    from: "2025-01-01",
    to: "2025-12-31",
  });

  assert.equal(parsed.limit, 20);
  assert.deepEqual(parsed.type, ["buy", "sell", "dividend"]);
});

test("import schemas validate file metadata and optional confirm body", () => {
  const previewParsed = importCsvFormSchema.parse({
    accountId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    format: "avanza",
    fileName: "transactions.csv",
  });
  const confirmParsed = importConfirmBodySchema.parse({});

  assert.equal(previewParsed.format, "avanza");
  assert.deepEqual(confirmParsed, {});
});

test("timeline query schema parses entry filters and defaults", () => {
  const parsed = timelineQuerySchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    types: "life_event,decision",
    limit: "25",
  });

  assert.equal(parsed.limit, 25);
  assert.deepEqual(parsed.types, ["life_event", "decision"]);
});

test("timeline update schema requires at least one field", () => {
  const valid = updateTimelineEntrySchema.safeParse({ title: "Updated title" });
  const invalid = updateTimelineEntrySchema.safeParse({});

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("life event schemas validate create and action update payloads", () => {
  const createParsed = createLifeEventSchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    eventType: "buying_apartment",
    title: "Buying our first apartment",
    inputs: {
      budget: 350_000_000,
      targetDate: "2026-09-01",
    },
  });
  const updateValid = updatePlaybookActionSchema.safeParse({
    status: "completed",
    completionNotes: "Done",
  });
  const updateInvalid = updatePlaybookActionSchema.safeParse({});

  assert.equal(createParsed.eventType, "buying_apartment");
  assert.equal(updateValid.success, true);
  assert.equal(updateInvalid.success, false);
});

test("fitness query schema requires a valid household id", () => {
  const valid = fitnessQuerySchema.safeParse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });
  const invalid = fitnessQuerySchema.safeParse({
    householdId: "not-a-uuid",
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("auth bucket rate limiting blocks request 11 within the same window", () => {
  const request = buildRequest("203.0.113.42");

  for (let index = 0; index < 10; index += 1) {
    enforceRateLimit(request, "auth");
  }

  assert.throws(
    () => enforceRateLimit(request, "auth"),
    (error: unknown) =>
      error instanceof ServiceError && error.code === "RATE_LIMITED" && error.status === 429,
  );
});
