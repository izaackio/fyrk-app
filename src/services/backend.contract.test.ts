import assert from "node:assert/strict";
import test from "node:test";

import { parseDemoContextCookie } from "../lib/demo";
import { enforceRateLimit, resetRateLimitStore } from "../lib/auth/rate-limit";
import {
  accountTransactionsQuerySchema,
  createAccountSchema,
  updateAccountSchema,
} from "../lib/validations/accounts";
import { authEmailRequestSchema } from "../lib/validations/auth";
import { importConfirmBodySchema, importCsvFormSchema } from "../lib/validations/import";
import {
  createHouseholdSchema,
  initializeDemoHouseholdSchema,
  updateHouseholdMemberSchema,
} from "../lib/validations/household";
import {
  createLifeEventSchema,
  updatePlaybookActionSchema,
} from "../lib/validations/events";
import { fitnessQuerySchema } from "../lib/validations/fitness";
import {
  createProposalSchema,
  proposalCommentSchema,
  proposalListQuerySchema,
  proposalRejectSchema,
} from "../lib/validations/proposals";
import {
  generateReviewSchema,
  reviewListQuerySchema,
  reviewPathParamsSchema,
} from "../lib/validations/reviews";
import {
  timelineQuerySchema,
  updateTimelineEntrySchema,
} from "../lib/validations/timeline";
import { ServiceError } from "./errors";
import { errorResponse, successResponse } from "./http";

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

test("demo household schema only accepts supported variants", () => {
  const valid = initializeDemoHouseholdSchema.safeParse({ variant: "friendly_family" });
  const invalid = initializeDemoHouseholdSchema.safeParse({ variant: "unknown" });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
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

test("review schemas validate generate, list query, and path params", () => {
  const generateParsed = generateReviewSchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });
  const queryParsed = reviewListQuerySchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });
  const pathParsed = reviewPathParamsSchema.parse({
    id: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
  });

  assert.equal(generateParsed.householdId, queryParsed.householdId);
  assert.equal(pathParsed.id, "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6");
});

test("proposal schemas parse list filters and validate reject/comment payloads", () => {
  const createParsed = createProposalSchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    title: "Increase monthly investing",
    description: "Propose moving 10k SEK per month into global index funds.",
    category: "investment",
  });
  const queryParsed = proposalListQuerySchema.parse({
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    status: "pending,rejected",
  });
  const rejectParsed = proposalRejectSchema.parse({
    reason: "This is too large for this quarter's budget.",
  });
  const commentParsed = proposalCommentSchema.parse({
    content: "Let's revisit this after the next salary review.",
  });

  assert.equal(createParsed.category, "investment");
  assert.deepEqual(queryParsed.status, ["pending", "rejected"]);
  assert.equal(rejectParsed.reason.length > 0, true);
  assert.equal(commentParsed.content.length > 0, true);
});

test("auth bucket rate limiting blocks request 11 within the same window", () => {
  resetRateLimitStore();
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

test("demo bucket rate limiting blocks request 7 within the same window", () => {
  resetRateLimitStore();
  const request = buildRequest("203.0.113.43");

  for (let index = 0; index < 6; index += 1) {
    enforceRateLimit(request, "demo");
  }

  assert.throws(
    () => enforceRateLimit(request, "demo"),
    (error: unknown) =>
      error instanceof ServiceError && error.code === "RATE_LIMITED" && error.status === 429,
  );
});

test("demo context cookies reject invalid payloads", () => {
  const valid = parseDemoContextCookie(
    "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6:standard",
  );
  const invalid = parseDemoContextCookie("not-a-cookie");

  assert.deepEqual(valid, {
    householdId: "f8ac6abb-bfdb-4f65-8e26-cfb6770f4ea6",
    variant: "standard",
  });
  assert.equal(invalid, null);
});

test("api success responses include hardened security headers", async () => {
  const response = successResponse({ ok: true });

  assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Content-Security-Policy"), "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
});

test("api error responses preserve envelope shape and add retry hints", async () => {
  const response = errorResponse(
    new ServiceError("RATE_LIMITED", "Rate limit exceeded", {
      retryAfterMs: 2_500,
    }),
  );
  const payload = await response.json();

  assert.deepEqual(payload, {
    error: {
      code: "RATE_LIMITED",
      message: "Rate limit exceeded",
      details: {
        retryAfterMs: 2_500,
      },
    },
  });
  assert.equal(response.headers.get("Retry-After"), "3");
});
