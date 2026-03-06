import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { proposalPathParamsSchema, proposalRejectSchema } from "@/lib/validations/proposals";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";
import { proposalService } from "@/services/proposal.service";

interface ProposalRejectRouteContext {
  params: Promise<unknown> | unknown;
}

export async function POST(request: Request, context: ProposalRejectRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, proposalPathParamsSchema);
    const payload = await parseJsonBody(request, proposalRejectSchema);
    const proposal = await proposalService.reject(authContext, params.id, payload);

    return successResponse(proposal);
  } catch (error) {
    return errorResponse(error);
  }
}
