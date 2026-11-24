import { supabase } from './supabase';

export interface DataChangeEvent {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'all';
  id?: string;
  payload?: any;
  timestamp: number;
}

type SyncCallback = (event: DataChangeEvent) => void;

const listeners = new Set<SyncCallback>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let isChannelSubscribed = false;
let debounceTimer: NodeJS.Timeout | null = null;

const notifyListeners = (event: DataChangeEvent) => {
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (err) {
      console.error('[RealtimeHub] Error in listener callback:', err);
    }
  });
};

/**
 * Initializes the unified Realtime channel.
 * Listens to Broadcast messages and Postgres changes.
 */
function initChannelIfNeeded() {
  if (typeof window === 'undefined') return;
  if (channel) return;

  channel = supabase.channel('guidance-realtime-hub', {
    config: {
      broadcast: { self: false },
    },
  });

  // 1. Listen to broadcast events
  channel.on('broadcast', { event: 'data-changed' }, (msg) => {
    const payload = msg.payload as DataChangeEvent;
    if (payload) {
      notifyListeners(payload);
    }
  });

  // 2. Listen to postgres database changes on key tables
  const tables = [
    'appointments',
    'assessments',
    'assessment_tasks',
    'messages',
    'appointment_feedback',
    'session_notes',
    'availability',
    'chat_alerts',
  ];

  tables.forEach(table => {
    channel!
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
        notifyListeners({
          table,
          action: 'insert',
          id: (payload.new as any)?.id,
          payload: payload.new,
          timestamp: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, (payload) => {
        notifyListeners({
          table,
          action: 'update',
          id: (payload.new as any)?.id,
          payload: payload.new,
          timestamp: Date.now(),
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
        notifyListeners({
          table,
          action: 'delete',
          id: (payload.old as any)?.id,
          timestamp: Date.now(),
        });
      });
  });

  channel.subscribe((status) => {
    isChannelSubscribed = status === 'SUBSCRIBED';
  });

  // 3. Listen to cross-tab storage sync
  window.addEventListener('storage', (e) => {
    if (e.key === 'guidance:last_sync' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        notifyListeners(parsed);
      } catch {}
    }
  });

  // 4. Same-window custom event
  window.addEventListener('guidance:datachange', ((e: CustomEvent<DataChangeEvent>) => {
    if (e.detail) {
      notifyListeners(e.detail);
    }
  }) as EventListener);
}

/**
 * Broadcast an update event to all connected counselors and students.
 */
export async function broadcastDataChange(params: {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'all';
  id?: string;
  payload?: any;
}) {
  const event: DataChangeEvent = {
    ...params,
    timestamp: Date.now(),
  };

  // Local dispatch in this window immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('guidance:datachange', { detail: event }));

    // Storage dispatch for other tabs in same browser
    try {
      localStorage.setItem('guidance:last_sync', JSON.stringify(event));
    } catch {}
  }

  // Network broadcast to other devices/browsers via Supabase
  try {
    initChannelIfNeeded();
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'data-changed',
        payload: event,
      });
    }
  } catch (err) {
    console.warn('[RealtimeHub] Broadcast send failed:', err);
  }
}

/**
 * Subscribe a component or hook to realtime changes.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToRealtimeHub(callback: SyncCallback): () => void {
  initChannelIfNeeded();
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}
