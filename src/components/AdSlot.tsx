import { useEffect, useRef } from 'react';

/**
 * Google AdSense display slot.
 *
 * Renders nothing until VITE_ADSENSE_SLOT (or the `slot` prop) is set, so the
 * layout stays clean during AdSense approval. Once a slot ID is provided,
 * a responsive display ad is rendered.
 *
 * No popups, no interstitials — display only.
 */
interface AdSlotProps {
  /** AdSense ad unit ID, e.g. "1234567890". Falls back to VITE_ADSENSE_SLOT env. */
  slot?: string;
  className?: string;
}

const PUBLISHER_ID = 'ca-pub-3606311257967384';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AdSlot = ({ slot, className = '' }: AdSlotProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const effectiveSlot = slot ?? import.meta.env.VITE_ADSENSE_SLOT;

  useEffect(() => {
    if (!effectiveSlot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* AdSense not loaded yet (blocked, offline, or still fetching) — ignore */
    }
  }, [effectiveSlot]);

  if (!effectiveSlot) return null;

  return (
    <div className={`w-full overflow-hidden ${className}`} aria-label="Advertisement">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={effectiveSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSlot;
