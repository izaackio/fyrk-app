import { ServiceError } from "@/services/errors";

export type RateLimitBucket = "auth" | "read" | "write" | "demo" | "privacy" | "cron";

interface BucketConfig {
  max: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBucketConfig(bucket: RateLimitBucket): BucketConfig {
  const envPrefixByBucket: Record<RateLimitBucket, string | null> = {
    auth: "RATE_LIMIT_AUTH",
    read: null,
    write: "RATE_LIMIT_WRITE",
    demo: "RATE_LIMIT_DEMO",
    privacy: "RATE_LIMIT_PRIVACY",
    cron: "RATE_LIMIT_CRON",
  };

  const defaults: Record<RateLimitBucket, BucketConfig> = {
    auth: { max: 10, windowMs: 15 * 60 * 1000 },
    read: {
      max: parsePositiveInt(process.env.RATE_LIMIT_MAX, 100),
      windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
    },
    write: { max: 20, windowMs: 60 * 1000 },
    demo: { max: 6, windowMs: 10 * 60 * 1000 },
    privacy: { max: 3, windowMs: 60 * 60 * 1000 },
    cron: { max: 12, windowMs: 60 * 60 * 1000 },
  };

  const envPrefix = envPrefixByBucket[bucket];
  if (!envPrefix) {
    return defaults[bucket];
  }

  return {
    max: parsePositiveInt(process.env[`${envPrefix}_MAX`], defaults[bucket].max),
    windowMs: parsePositiveInt(process.env[`${envPrefix}_WINDOW_MS`], defaults[bucket].windowMs),
  };
}

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first?.trim()) {
      return first.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return "anonymous";
}

function pruneStore(now: number): void {
  if (rateLimitStore.size < 2048) {
    return;
  }

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function enforceRateLimit(request: Request, bucket: RateLimitBucket): void {
  const now = Date.now();
  pruneStore(now);

  const identifier = getClientIdentifier(request);
  const key = `${bucket}:${identifier}`;
  const config = getBucketConfig(bucket);
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  if (current.count >= config.max) {
    throw new ServiceError("RATE_LIMITED", "Rate limit exceeded", {
      bucket,
      retryAfterMs: Math.max(current.resetAt - now, 0),
    });
  }

  current.count += 1;
  rateLimitStore.set(key, current);
}

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
