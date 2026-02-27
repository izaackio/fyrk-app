import assert from "node:assert/strict";
import test from "node:test";

import { enforceRateLimit } from "../lib/auth/rate-limit";
import { authEmailRequestSchema } from "../lib/validations/auth";
import {
  createHouseholdSchema,
  updateHouseholdMemberSchema,
} from "../lib/validations/household";
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
