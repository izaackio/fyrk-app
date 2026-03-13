import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { createProposalSchema, proposalListQuerySchema } from "@/lib/validations/proposals";
import {
  errorResponse,
  parseJsonBody,
  parseWithSchema,
  successResponse,
} from "@/services/http";
import { proposalService } from "@/services/proposal.service";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
        status: requestUrl.searchParams.get("status") ?? undefined,
      },
      proposalListQuerySchema,
    );

    const proposals = await proposalService.list(authContext, query);
    return successResponse(proposals);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, createProposalSchema);
    const proposal = await proposalService.create(authContext, payload);

    return successResponse(proposal, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
