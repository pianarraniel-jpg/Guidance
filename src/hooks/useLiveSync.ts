"use client";

import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

/**
 * useLiveSync hook triggers a callback whenever a background Postgres realtime update occurs.
 * This completely eliminates the need for manual browser refreshes (F5) to see updated UI state.
 */
export function useLiveSync(onSync: () => void) {
  const { lastUpdate } = useNotifications();

  useEffect(() => {
    if (lastUpdate) {
      onSync();
    }
  }, [lastUpdate, onSync]);
}
