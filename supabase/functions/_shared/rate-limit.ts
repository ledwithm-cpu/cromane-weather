// Shared in-memory IP rate limiter for edge functions.
// Each function gets its own Map instance via createRateLimiter(),
// so limits don't bleed across functions on the same warm worker.

export interface RateLimiterOptions {
  /** Max requests per window. Default 30. */
  limit?: number;
  /** Window length in ms. Default 60_000. */
  windowMs?: number;
}

export interface RateLimiter {
  isRateLimited(ip: string): boolean;
}

export function createRateLimiter(opts: RateLimiterOptions = {}): RateLimiter {
  const limit = opts.limit ?? 30;
  const windowMs = opts.windowMs ?? 60_000;
  const map = new Map<string, { count: number; resetAt: number }>();

  return {
    isRateLimited(ip: string): boolean {
      const now = Date.now();
      const entry = map.get(ip);
      if (!entry || now > entry.resetAt) {
        map.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
      }
      entry.count++;
      return entry.count > limit;
    },
  };
}

/** Extracts the originating IP from a request, falling back to 'unknown'. */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
