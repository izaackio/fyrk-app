import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { ServiceError, toServiceError } from "@/services/errors";

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiSuccessWithMetaResponse<T, M> {
  data: T;
  meta: M;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

function applySecurityHeaders<T>(response: NextResponse<T>, error?: ServiceError): NextResponse<T> {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=(), browsing-topics=()");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Vary", "Cookie");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (error?.code === "RATE_LIMITED") {
    const retryAfterMs =
      typeof error.details?.retryAfterMs === "number" ? error.details.retryAfterMs : null;

    if (retryAfterMs !== null) {
      response.headers.set("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
    }
  }

  return response;
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw ServiceError.validation("Request body must be valid JSON");
  }

  return parseWithSchema(payload, schema);
}

export function parseWithSchema<T>(payload: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw ServiceError.validation("Input validation failed", {
      issues: result.error.issues,
    });
  }

  return result.data;
}

export async function parseRouteParams<T>(
  params: Promise<unknown> | unknown,
  schema: ZodType<T>,
): Promise<T> {
  return parseWithSchema(await params, schema);
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return applySecurityHeaders(NextResponse.json({ data }, { status }));
}

export function successResponseWithMeta<T, M>(
  data: T,
  meta: M,
  status = 200,
): NextResponse<ApiSuccessWithMetaResponse<T, M>> {
  return applySecurityHeaders(NextResponse.json({ data, meta }, { status }));
}

export function errorResponse(error: unknown): NextResponse<ApiErrorResponse> {
  const normalized = toServiceError(error);

  return applySecurityHeaders(
    NextResponse.json(
      {
        error: {
          code: normalized.code,
          message: normalized.message,
          ...(normalized.details ? { details: normalized.details } : {}),
        },
      },
      { status: normalized.status },
    ),
    normalized,
  );
}
