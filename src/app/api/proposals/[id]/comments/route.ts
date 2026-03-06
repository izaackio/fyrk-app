import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { proposalCommentSchema, proposalPathParamsSchema } from "@/lib/validations/proposals";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";
import { proposalService } from "@/services/proposal.service";

interface ProposalCommentRouteContext {
  params: Promise<unknown> | unknown;
}

export async function POST(request: Request, context: ProposalCommentRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, proposalPathParamsSchema);
    const payload = await parseJsonBody(request, proposalCommentSchema);
    const comment = await proposalService.addComment(authContext, params.id, payload);

    return successResponse(comment, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
