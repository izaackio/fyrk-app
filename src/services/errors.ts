import { ZodError } from "zod";

export const errorCodeToStatus = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  REVIEW_PDF_NOT_READY: 409,
  INTERNAL_ERROR: 500,
  AI_GENERATION_FAILED: 503,
} as const;

export type ErrorCode = keyof typeof errorCodeToStatus;

export class ServiceError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = errorCodeToStatus[code];
    this.details = details;
  }

  static validation(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError("VALIDATION_ERROR", message, details);
  }
}

function isSupabaseLikeError(error: unknown): error is {
  message: string;
  status?: number;
  code?: string;
} {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as Record<string, unknown>;
  return typeof maybeError.message === "string";
}

export function toServiceError(error: unknown): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof ZodError) {
    return ServiceError.validation("Input validation failed", {
      issues: error.issues,
    });
  }

  if (error instanceof SyntaxError) {
    return ServiceError.validation("Request body must be valid JSON");
  }

  if (isSupabaseLikeError(error)) {
    const message = error.message.toLowerCase();

    if (error.status === 401 || message.includes("jwt")) {
      return new ServiceError("AUTH_REQUIRED", "A valid session is required");
    }

    if (error.status === 403) {
      return new ServiceError("FORBIDDEN", "You are not allowed to perform this action");
    }

    if (error.code === "23505") {
      return ServiceError.validation("A record with the same unique value already exists");
    }

    if (
      error.code === "22P02" ||
      message.includes("invalid input syntax") ||
      message.includes("violates check constraint")
    ) {
      return ServiceError.validation("Input validation failed");
    }
  }

  return new ServiceError("INTERNAL_ERROR", "An unexpected error occurred");
}
