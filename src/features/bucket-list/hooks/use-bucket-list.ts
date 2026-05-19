import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bucketList:v1';
const EVENT = 'bucketList:changed';

export interface BucketItem {
  /** Location id from src/lib/locations.ts (e.g. "cromane") */
  locationId: string;
  /** Insertion-order priority. Lower = higher priority. */
  priorityIndex: number;
  /** ISO timestamp */
  createdAt: string;
}

function read(): BucketItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is BucketItem =>
          i && typeof i.locationId === 'string' && typeof i.priorityIndex === 'number',
      )
      .sort((a, b) => a.priorityIndex - b.priorityIndex);
  } catch {
    return [];
  }
}

function write(items: BucketItem[]) {
  // Re-normalise priority indices to be 0..n-1 in current order.
  const normalised = items.map((it, idx) => ({ ...it, priorityIndex: idx }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBucketList() {
  const [items, setItems] = useState<BucketItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const has = useCallback(
    (locationId: string) => items.some((i) => i.locationId === locationId),
    [items],
  );

  const add = useCallback(
    (locationId: string) => {
      const current = read();
      if (current.some((i) => i.locationId === locationId)) return;
      const nextIndex = current.length;
      write([
        ...current,
        { locationId, priorityIndex: nextIndex, createdAt: new Date().toISOString() },
      ]);
    },
    [],
  );

  const remove = useCallback((locationId: string) => {
    write(read().filter((i) => i.locationId !== locationId));
  }, []);

  const reorder = useCallback((next: BucketItem[]) => {
    write(next);
  }, []);

  const toggle = useCallback(
    (locationId: string) => {
      if (has(locationId)) remove(locationId);
      else add(locationId);
    },
    [has, add, remove],
  );

  return { items, has, add, remove, toggle, reorder };
}
