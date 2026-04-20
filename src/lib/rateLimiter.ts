// src/lib/rateLimiter.ts

// Simple in-memory rate limiter per event + route
const cache = new Map<string, { count: number; windowStart: number }>();
const LIMIT = 20;
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(eventId: string, routeName: string): boolean {
  const key = `${eventId}:${routeName}`;
  const now = Date.now();
  const state = cache.get(key);

  if (!state || now - state.windowStart > WINDOW_MS) {
    // Start new temporal window
    cache.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }

  if (state.count < LIMIT) {
    state.count += 1;
    return true; // allowed
  }

  return false; // rate limited
}
