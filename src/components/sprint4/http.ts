import type { ApiErrorEnvelope } from "../accounts/contracts";

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;

    if (details) {
      this.details = details;
    }
  }
}

const shouldUseFallbackByDefault = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!("error" in value)) {
    return false;
  }

  const error = (value as { error: unknown }).error;

  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && "message" in error;
};

const toApiClientError = async (response: Response): Promise<ApiClientError> => {
  let parsedBody: unknown;

  try {
    parsedBody = (await response.json()) as unknown;
  } catch {
    parsedBody = null;
  }

  if (isApiErrorEnvelope(parsedBody)) {
    return new ApiClientError(
      parsedBody.error.code,
      parsedBody.error.message,
      parsedBody.error.details,
    );
  }

  return new ApiClientError(
    "INTERNAL_ERROR",
    `Request failed with status ${response.status}`,
  );
};

const shouldFallbackForStatus = (status: number): boolean =>
  status === 404 || status === 405 || status >= 500;

interface RequestWithFallbackOptions<T> {
  fallback: () => Promise<T>;
  init: RequestInit;
  path: string;
}

export const requestWithFallback = async <T,>({
  fallback,
  init,
  path,
}: RequestWithFallbackOptions<T>): Promise<T> => {
  if (shouldUseFallbackByDefault() || typeof window === "undefined") {
    return fallback();
  }

  const hasFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: HeadersInit | undefined = hasFormDataBody
    ? init.headers
    : {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      };

  const requestInit: RequestInit = {
    ...init,
    ...(headers ? { headers } : {}),
  };

  try {
    const response = await fetch(path, requestInit);

    if (!response.ok) {
      if (shouldFallbackForStatus(response.status)) {
        return fallback();
      }

      throw await toApiClientError(response);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    return fallback();
  }
};
