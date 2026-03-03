import assert from "node:assert/strict";
import test from "node:test";

import { ServiceError } from "./errors";
import { snapshotService } from "./snapshot.service";

test("snapshot service validates snapshotDate input format before database work", async () => {
  await assert.rejects(
    () =>
      snapshotService.createDailySnapshots({
        snapshotDate: "2026/03/02",
      }),
    (error: unknown) =>
      error instanceof ServiceError &&
      error.code === "VALIDATION_ERROR" &&
      error.message.includes("snapshotDate"),
  );
});
