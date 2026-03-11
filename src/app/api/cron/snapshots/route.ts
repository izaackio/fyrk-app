import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { snapshotDateQuerySchema } from "@/lib/validations/balance-sheet";
import { ServiceError } from "@/services/errors";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";
import { snapshotService } from "@/services/snapshot.service";

function assertCronAuthorized(request: Request): void {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new ServiceError("INTERNAL_ERROR", "CRON_SECRET is not configured");
    }

    return;
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${expectedSecret}`) {
    throw new ServiceError("FORBIDDEN", "Invalid cron authorization");
  }
}

async function handleSnapshotRequest(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "cron");
    assertCronAuthorized(request);
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        snapshotDate: requestUrl.searchParams.get("snapshotDate") ?? undefined,
      },
      snapshotDateQuerySchema,
    );

    const result = await snapshotService.createDailySnapshots(
      query.snapshotDate ? { snapshotDate: query.snapshotDate } : {},
    );
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleSnapshotRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleSnapshotRequest(request);
}
