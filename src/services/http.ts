import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { ServiceError, toServiceError } from "@/services/errors";

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
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
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: unknown): NextResponse<ApiErrorResponse> {
  const normalized = toServiceError(error);

  return NextResponse.json(
    {
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
    },
    { status: normalized.status },
  );
}
