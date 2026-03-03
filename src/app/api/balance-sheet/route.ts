import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { balanceSheetQuerySchema } from "@/lib/validations/balance-sheet";
import { balanceSheetService } from "@/services/balance-sheet.service";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      balanceSheetQuerySchema,
    );
    const balanceSheet = await balanceSheetService.getBalanceSheet(authContext, query.householdId);

    return successResponse(balanceSheet);
  } catch (error) {
    return errorResponse(error);
  }
}
