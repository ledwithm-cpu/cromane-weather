import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const STORAGE_KEY = 'bucketList:v1';
const EVENT = 'bucketList:changed';
const MIGRATED_KEY = 'bucketList:migrated:';

export interface BucketItem {
  /** Location id from src/features/location/data/locations.ts */
  locationId: string;
  /** Insertion-order priority. Lower = higher priority. */
  priorityIndex: number;
  /** ISO timestamp */
  createdAt: string;
}

function readLocal(): BucketItem[] {
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

function writeLocal(items: BucketItem[]) {
  const normalised = items.map((it, idx) => ({ ...it, priorityIndex: idx }));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBucketList() {
  const { user } = useAuth();
  const [items, setItems] = useState<BucketItem[]>(() => readLocal());

  // Cloud fetch + one-time local→cloud migration on first login
  useEffect(() => {
    if (!user) {
      // logged out: fall back to local
      setItems(readLocal());
      return;
    }
    let cancelled = false;

    const sync = async () => {
      // Migrate local items into cloud once per user
      const migratedFlag = `${MIGRATED_KEY}${user.id}`;
      const alreadyMigrated = window.localStorage.getItem(migratedFlag) === '1';
      const local = readLocal();

      if (!alreadyMigrated && local.length > 0) {
        const rows = local.map((it) => ({
          user_id: user.id,
          location_id: it.locationId,
          priority_index: it.priorityIndex,
          created_at: it.createdAt,
        }));
        await supabase
          .from('bucket_list_items')
          .upsert(rows, { onConflict: 'user_id,location_id', ignoreDuplicates: true });
        window.localStorage.setItem(migratedFlag, '1');
      }

      const { data } = await supabase
        .from('bucket_list_items')
        .select('location_id, priority_index, created_at')
        .eq('user_id', user.id)
        .order('priority_index', { ascending: true });

      if (cancelled || !data) return;
      const cloud = data.map((d) => ({
        locationId: d.location_id,
        priorityIndex: d.priority_index,
        createdAt: d.created_at,
      }));
      setItems(cloud);
      // Mirror to local so logged-out fallback stays useful
      writeLocal(cloud);
    };

    sync();
    return () => { cancelled = true; };
  }, [user]);

  // Listen to local changes (logged out path)
  useEffect(() => {
    if (user) return;
    const onChange = () => setItems(readLocal());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [user]);

  const has = useCallback(
    (locationId: string) => items.some((i) => i.locationId === locationId),
    [items],
  );

  const add = useCallback(
    async (locationId: string) => {
      if (items.some((i) => i.locationId === locationId)) return;
      const nextIndex = items.length;
      const newItem: BucketItem = {
        locationId, priorityIndex: nextIndex, createdAt: new Date().toISOString(),
      };
      const next = [...items, newItem];
      setItems(next);
      writeLocal(next);
      if (user) {
        await supabase.from('bucket_list_items').insert({
          user_id: user.id,
          location_id: locationId,
          priority_index: nextIndex,
        });
      }
    },
    [items, user],
  );

  const remove = useCallback(
    async (locationId: string) => {
      const next = items.filter((i) => i.locationId !== locationId);
      setItems(next);
      writeLocal(next);
      if (user) {
        await supabase
          .from('bucket_list_items')
          .delete()
          .eq('user_id', user.id)
          .eq('location_id', locationId);
      }
    },
    [items, user],
  );

  const reorder = useCallback(
    async (next: BucketItem[]) => {
      const normalised = next.map((it, idx) => ({ ...it, priorityIndex: idx }));
      setItems(normalised);
      writeLocal(normalised);
      if (user) {
        // Update priorities one by one
        await Promise.all(
          normalised.map((it) =>
            supabase
              .from('bucket_list_items')
              .update({ priority_index: it.priorityIndex })
              .eq('user_id', user.id)
              .eq('location_id', it.locationId),
          ),
        );
      }
    },
    [user],
  );

  const toggle = useCallback(
    (locationId: string) => (has(locationId) ? remove(locationId) : add(locationId)),
    [has, add, remove],
  );

  return { items, has, add, remove, toggle, reorder };
}
