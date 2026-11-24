"use client";

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { subscribeToRealtimeHub, type DataChangeEvent } from '@/lib/realtime-hub';

/**
 * useLiveSync hook triggers a callback whenever a real-time event occurs:
 * 1. Supabase Postgres database changes (INSERT/UPDATE/DELETE)
 * 2. Supabase Realtime broadcast events from other clients
 * 3. NotificationContext lastUpdate changes
 * 4. Window focus / visibility change (tab reactivation)
 * 5. Automatic periodic background heartbeat sync (every 10s while tab is visible)
 *
 * This completely eliminates the need for manual browser refreshes (F5).
 */
export function useLiveSync(
  onSync: () => void,
  targetTables?: string[]
) {
  const { lastUpdate } = useNotifications();
  const onSyncRef = useRef(onSync);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const triggerSync = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      try {
        onSyncRef.current();
      } catch (err) {
        console.error('[useLiveSync] Error executing sync callback:', err);
      }
    }, 150);
  };

  // 1. Sync from NotificationContext updates
  useEffect(() => {
    if (lastUpdate) {
      triggerSync();
    }
  }, [lastUpdate]);

  // 2. Direct subscription to Realtime Hub
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeHub((event: DataChangeEvent) => {
      if (!targetTables || targetTables.length === 0 || targetTables.includes(event.table)) {
        triggerSync();
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [targetTables]);

  // 3. Tab visibility and focus sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerSync();
      }
    };

    const handleFocus = () => {
      triggerSync();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 4. Background heartbeat sync (10 seconds interval when tab is active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        try {
          onSyncRef.current();
        } catch {}
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);
}
