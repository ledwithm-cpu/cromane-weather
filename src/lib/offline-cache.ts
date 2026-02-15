// Offline cache layer — persists data to localStorage for low-signal resilience

const CACHE_PREFIX = 'cromane_';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function cacheClear(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // fail silently
  }
}
