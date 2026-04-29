/**
 * Open an external URL safely from any context:
 * - Inside the Lovable preview iframe (sandboxed): break out via window.top
 *   so we don't get ERR_BLOCKED_BY_RESPONSE / X-Frame-Options errors.
 * - Inside a Capacitor native app: window.open hands the URL to the system
 *   browser (or the Maps app for maps:// / geo: schemes).
 * - Standard browser tab: regular window.open with noopener.
 */
export function openExternal(url: string) {
  if (typeof window === 'undefined') return;

  // 1) Try to escape the iframe (Lovable preview, embedded webviews, etc.)
  try {
    if (window.top && window.top !== window.self) {
      // Same-origin? Navigate the top frame.
      try {
        // Accessing window.top.location throws on cross-origin.
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        window.top.location.href;
        window.top.location.href = url;
        return;
      } catch {
        // Cross-origin top — fall through to window.open below.
      }
    }
  } catch {
    /* no-op */
  }

  // 2) Standard new-tab open. Capacitor passes external URLs to the OS.
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (w) return;

  // 3) Last-resort fallback if popup was blocked.
  window.location.href = url;
}

/** Build platform-appropriate driving-directions URLs. */
export function buildDirectionsUrls(lat: number, lon: number) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`,
  };
}
