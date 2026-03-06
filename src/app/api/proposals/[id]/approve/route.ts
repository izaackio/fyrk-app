import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { proposalPathParamsSchema } from "@/lib/validations/proposals";
import { errorResponse, parseRouteParams, successResponse } from "@/services/http";
import { proposalService } from "@/services/proposal.service";

interface ProposalApproveRouteContext {
  params: Promise<unknown> | unknown;
}

export async function POST(request: Request, context: ProposalApproveRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, proposalPathParamsSchema);
    const proposal = await proposalService.approve(authContext, params.id);

    return successResponse(proposal);
  } catch (error) {
    return errorResponse(error);
  }
}
