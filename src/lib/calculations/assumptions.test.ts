import assert from "node:assert/strict";
import test from "node:test";

import {
  getAssumptionMetadata,
  getAssumptionSourceTier,
  getSystemDefaultAssumptions,
  resolveAssumptionSet,
} from "@/lib/calculations/assumptions";

test("system defaults are tagged with system_default source", () => {
  const defaults = getSystemDefaultAssumptions();
  assert.equal(defaults.equityReturn.source, "system_default");
  assert.equal(defaults.staleAccountDays.value, 7);
});

test("resolveAssumptionSet prioritizes user overrides over historical and defaults", () => {
  const assumptions = resolveAssumptionSet({
    historicalDerived: {
      equityReturn: 0.05,
      inflation: 0.03,
    },
    userOverrides: {
      equityReturn: 0.09,
    },
  });

  assert.equal(assumptions.equityReturn.value, 0.09);
  assert.equal(assumptions.equityReturn.source, "user_override");
  assert.equal(assumptions.inflation.value, 0.03);
  assert.equal(assumptions.inflation.source, "historical_derived");
  assert.equal(assumptions.salaryGrowth.source, "system_default");
});

test("assumption metadata reports strongest source tier", () => {
  const assumptions = resolveAssumptionSet({
    historicalDerived: {
      cashReturn: 0.015,
    },
  });

  assert.equal(getAssumptionSourceTier(assumptions), "historical_derived");
  assert.equal(getAssumptionMetadata(assumptions).sourceTier, "historical_derived");
});
