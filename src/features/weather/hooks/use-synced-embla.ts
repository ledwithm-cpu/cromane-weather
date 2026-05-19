import { useEffect, useRef } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';

/**
 * Keeps two Embla carousels in sync: scrolling one mirrors the other.
 * Invokes `onIndexChange` whenever either carousel settles on a new snap.
 */
export function useSyncedEmbla(
  a: EmblaCarouselType | undefined,
  b: EmblaCarouselType | undefined,
  onIndexChange?: (idx: number) => void,
) {
  const syncing = useRef(false);

  useEffect(() => {
    if (!a || !b) return;

    const mirror = (source: EmblaCarouselType, target: EmblaCarouselType) => () => {
      const idx = source.selectedScrollSnap();
      onIndexChange?.(idx);
      if (!syncing.current) {
        syncing.current = true;
        target.scrollTo(idx);
        syncing.current = false;
      }
    };

    const onA = mirror(a, b);
    const onB = mirror(b, a);
    a.on('select', onA);
    b.on('select', onB);
    return () => {
      a.off('select', onA);
      b.off('select', onB);
    };
  }, [a, b, onIndexChange]);
}
