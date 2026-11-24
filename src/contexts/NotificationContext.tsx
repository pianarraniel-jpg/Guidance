"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToRealtimeHub } from '@/lib/realtime-hub';
import { toast } from '@/hooks/use-toast';
import {
  buildCounselorBookingBellPayload,
  buildStudentAppointmentBellPayload,
  formatCounselorDisplayName,
  type BookingNotificationPayload,
} from '@/lib/booking-notifications';

export type NotificationType = 'appointment' | 'assessment' | 'message';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;
  link: string;
  studentName: string;
  isRead: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markIdsAsRead: (ids: string[]) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshNotifications: () => void;
  lastUpdate: number;
  realtimeStatus: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCounselor, isStudent, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [realtimeStatus, setRealtimeStatus] = useState<string>('connecting');
  const shownBrowserIds = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);
  const recentlyNotifiedRef = useRef<Map<string, number>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn('[NotificationContext] Could not show browser notification:', e);
      }
    }
  }, []);

  const loadReadIds = useCallback(async () => {
    if (!user) { setReadIds(new Set()); return; }
    try {
      const { data } = await supabase
        .from(STORAGE_KEYS.NOTIFICATIONS_READ)
        .select('notification_id')
        .eq('user_id', user.id);
      setReadIds(new Set((data ?? []).map((r: any) => r.notification_id)));
    } catch (e) {
      console.warn('[NotificationContext] Error loading read notification IDs:', e);
    }
  }, [user]);

  const fetchNotificationsData = useCallback(async () => {
    if (!user) { setNotifications([]); return; }

    const alerts: AppNotification[] = [];
    const readSet = readIds;

    if (isCounselor) {
      const appointments = await storageService.getCounselorPendingAppointments();
      appointments.forEach(a => {
        const booking = a as BookingNotificationPayload;
        const id = `apt-${booking.id}-${booking.status || 'pending'}`;
        alerts.push(buildCounselorBookingBellPayload(booking, readSet.has(id)));
      });

      const assessments = await storageService.getSubmittedAssessments();
      assessments.forEach(a => {
        const id = `asmt-${a.id}`;
        alerts.push({
          id, type: 'assessment',
          title: 'Assessment Submitted',
          description: `${a.studentName || 'A student'} completed a counseling form`,
          timestamp: a.timestamp || Date.now(),
          link: '/counselor/assessments',
          studentName: a.studentName || 'Student',
          isRead: readSet.has(id),
        });
      });

      const messages = await storageService.getUserMessages(user.id);
      const groupedBySender = messages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const sorted = (msgs as any[]).sort((a, b) => b.timestamp - a.timestamp);
        const lastMsg = sorted[0];
        const unreadInGroup = sorted.filter(m => !readSet.has(`msg-${m.id}`));
        const groupId = `group-msg-${senderId}-${lastMsg.id}`;
        const isGroupRead = readSet.has(groupId);
        if (unreadInGroup.length > 0 || isGroupRead) {
          alerts.push({
            id: groupId, type: 'message',
            title: unreadInGroup.length > 1 ? `${unreadInGroup.length} New Messages` : `New Message`,
            description: lastMsg.text?.startsWith('[BOOKING_REQUEST]') ? 'Sent session invitation' : (lastMsg.text || 'Message received'),
            timestamp: lastMsg.timestamp || Date.now(),
            link: '/counselor/messages',
            studentName: 'Student',
            isRead: isGroupRead,
          });
        }
      });
    } else if (isStudent) {
      const appointments = await storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      appointments
        .filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.CANCELLED || a.status === APPOINTMENT_STATUS.PENDING)
        .forEach(a => {
          const booking = a as BookingNotificationPayload;
          const notif = buildStudentAppointmentBellPayload(booking, false);
          alerts.push({
            ...notif,
            isRead: readSet.has(notif.id),
          });
        });

      const assessments = await storageService.getByField<any>(STORAGE_KEYS.ASSESSMENTS, 'studentId', user.id);
      assessments
        .filter(a => a.status === 'evaluated')
        .forEach(a => {
          const id = `asmt-eval-${a.id}`;
          alerts.push({
            id, type: 'assessment',
            title: 'Feedback Received',
            description: 'Your counselor has provided feedback on your assessment.',
            timestamp: a.evaluatedAt || Date.now(),
            link: '/student/assessments',
            studentName: 'You',
            isRead: readSet.has(id),
          });
        });

      const tasks = await storageService.getByField<any>(STORAGE_KEYS.ASSESSMENT_TASKS, 'studentId', user.id);
      tasks
        .filter(t => t.status === 'pending')
        .forEach(t => {
          const id = `asmt-task-${t.id}`;
          alerts.push({
            id, type: 'assessment',
            title: 'New Student Task',
            description: `${formatCounselorDisplayName(t.counselorName)} assigned: ${t.title}`,
            timestamp: t.timestamp || Date.now(),
            link: '/student/assessments',
            studentName: 'You',
            isRead: readSet.has(id),
          });
        });

      const messages = await storageService.getUserMessages(user.id);
      const groupedBySender = messages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const sorted = (msgs as any[]).sort((a, b) => b.timestamp - a.timestamp);
        const lastMsg = sorted[0];
        const unreadInGroup = sorted.filter(m => !readSet.has(`msg-${m.id}`));
        const groupId = `group-msg-${senderId}-${lastMsg.id}`;
        const isGroupRead = readSet.has(groupId);
        if (unreadInGroup.length > 0 || isGroupRead) {
          alerts.push({
            id: groupId, type: 'message',
            title: unreadInGroup.length > 1 ? `${unreadInGroup.length} New Messages` : `New Message`,
            description: lastMsg.text?.startsWith('[BOOKING_REQUEST]') ? 'Invitation to book a session' : (lastMsg.text || 'Message received'),
            timestamp: lastMsg.timestamp || Date.now(),
            link: '/student/messages',
            studentName: 'Counselor',
            isRead: isGroupRead,
          });
        }
      });
    }

    const sorted = alerts.sort((a, b) => b.timestamp - a.timestamp);

    // On initial mount, register existing unread items so we don't spam popups
    if (isInitialMountRef.current) {
      sorted.forEach(n => shownBrowserIds.current.add(n.id));
      isInitialMountRef.current = false;
    } else {
      sorted
        .filter(n => !n.isRead && !shownBrowserIds.current.has(n.id))
        .forEach(n => {
          showBrowserNotification(n.title, n.description);
          shownBrowserIds.current.add(n.id);
        });
    }

    setNotifications(sorted);
  }, [isCounselor, isStudent, user, readIds, showBrowserNotification]);

  const refreshNotifications = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchNotificationsData();
    }, 300);
  }, [fetchNotificationsData]);

  const handleRealtimeAppointmentEvent = useCallback((event: { action: string; payload: any }) => {
    if (!user) return;
    const raw = event.payload?.new || event.payload || {};
    const apt = {
      id: raw.id || event.payload?.id,
      studentId: raw.student_id || raw.studentId,
      studentName: raw.student_name || raw.studentName || 'Student',
      counselorId: raw.counselor_id || raw.counselorId,
      counselorName: raw.counselor_name || raw.counselorName,
      date: raw.date,
      time: raw.time,
      type: raw.type || 'Consultation',
      status: raw.status,
      reason: raw.reason,
    };

    const now = Date.now();
    const shouldNotify = (key: string) => {
      const last = recentlyNotifiedRef.current.get(key);
      if (last && now - last < 4000) return false;
      recentlyNotifiedRef.current.set(key, now);
      return true;
    };

    if (isStudent && apt.studentId === user.id) {
      const counselor = formatCounselorDisplayName(apt.counselorName);
      const timeStr = apt.time ? ` at ${apt.time}` : '';
      const dateStr = apt.date || 'your scheduled date';
      const eventKey = `student-apt-${apt.id}-${apt.status}-${apt.date}-${apt.time}`;

      if (apt.status === APPOINTMENT_STATUS.CONFIRMED) {
        if (shouldNotify(eventKey)) {
          const isCounselorBooking = event.action === 'insert';
          const title = isCounselorBooking ? 'New Session Scheduled 📋' : 'Session Confirmed 🎉';
          const description = isCounselorBooking
            ? `${counselor} scheduled a ${apt.type} session with you for ${dateStr}${timeStr}.`
            : `Your ${apt.type} session on ${dateStr}${timeStr} with ${counselor} has been confirmed.`;

          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
        }
      } else if (apt.status === APPOINTMENT_STATUS.CANCELLED) {
        if (shouldNotify(eventKey)) {
          const title = 'Session Cancelled ⚠️';
          const description = `Your session on ${dateStr}${timeStr} with ${counselor} has been cancelled.`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showBrowserNotification(title, description);
        }
      } else if (event.action === 'insert') {
        if (shouldNotify(eventKey)) {
          const title = 'Consultation Scheduled 📋';
          const description = `${counselor} scheduled a session with you for ${dateStr}${timeStr}.`;
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
        }
      }
    } else if (isCounselor) {
      const studentName = apt.studentName || 'Student';
      const timeStr = apt.time ? ` at ${apt.time}` : '';
      const dateStr = apt.date || 'the requested date';
      const eventKey = `counselor-apt-${apt.id}-${apt.status}-${apt.date}-${apt.time}`;

      if (event.action === 'insert' && apt.status === APPOINTMENT_STATUS.PENDING) {
        if (shouldNotify(eventKey)) {
          const title = 'New Booking Request 📅';
          const description = `${studentName} requested a ${apt.type} session for ${dateStr}${timeStr}.`;
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
        }
      } else if (apt.status === APPOINTMENT_STATUS.CANCELLED) {
        if (shouldNotify(eventKey)) {
          const title = 'Session Cancelled';
          const description = `${studentName} cancelled the session for ${dateStr}${timeStr}.`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showBrowserNotification(title, description);
        }
      }
    }

    setLastUpdate(Date.now());
    refreshNotifications();
  }, [user, isStudent, isCounselor, showBrowserNotification, refreshNotifications]);

  const handleRealtimeAppointmentEventRef = useRef(handleRealtimeAppointmentEvent);
  useEffect(() => {
    handleRealtimeAppointmentEventRef.current = handleRealtimeAppointmentEvent;
  }, [handleRealtimeAppointmentEvent]);

  const handleRealtimeUpdate = useCallback(() => {
    setLastUpdate(Date.now());
    refreshNotifications();
  }, [refreshNotifications]);

  const handleRealtimeUpdateRef = useRef(handleRealtimeUpdate);
  useEffect(() => {
    handleRealtimeUpdateRef.current = handleRealtimeUpdate;
  }, [handleRealtimeUpdate]);

  useEffect(() => { loadReadIds(); }, [loadReadIds]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchNotificationsData();

    const channel = supabase.channel(`notif-${user.id}`);
    const onAppointmentPostgres = (payload: any) => {
      handleRealtimeAppointmentEventRef.current({
        action: payload.eventType === 'INSERT' ? 'insert' : payload.eventType === 'DELETE' ? 'delete' : 'update',
        payload: payload.new || payload.old || payload,
      });
    };

    if (isStudent) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `student_id=eq.${user.id}` }, onAppointmentPostgres)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments', filter: `student_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assessment_tasks', filter: `student_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current());
    } else if (isCounselor) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onAppointmentPostgres)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => handleRealtimeUpdateRef.current());
    } else if (isAdmin) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onAppointmentPostgres)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => handleRealtimeUpdateRef.current())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => handleRealtimeUpdateRef.current());
    }

    channel.subscribe((status) => {
      setRealtimeStatus(status);
    });

    const unsubHub = subscribeToRealtimeHub((event) => {
      if (event.table === 'appointments') {
        handleRealtimeAppointmentEventRef.current({
          action: event.action,
          payload: event.payload,
        });
      } else {
        handleRealtimeUpdateRef.current();
      }
    });

    return () => {
      setRealtimeStatus('closed');
      supabase.removeChannel(channel);
      unsubHub();
    };
  }, [user?.id, isStudent, isCounselor, isAdmin, fetchNotificationsData]);

  const persistReadIds = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    try {
      const rows = ids.map(notification_id => ({ user_id: user.id, notification_id }));
      await supabase.from(STORAGE_KEYS.NOTIFICATIONS_READ).upsert(rows, { onConflict: 'user_id,notification_id' });
      setReadIds(prev => new Set([...prev, ...ids]));
    } catch (e) {
      console.warn('[NotificationContext] Error persisting read IDs:', e);
    }
  }, [user]);

  const markAsRead = useCallback((id: string) => { persistReadIds([id]); }, [persistReadIds]);
  const markIdsAsRead = useCallback((ids: string[]) => { persistReadIds(ids); }, [persistReadIds]);
  const markAllAsRead = useCallback(() => {
    const unread = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unread.length > 0) persistReadIds(unread);
  }, [notifications, persistReadIds]);

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
      markAsRead,
      markIdsAsRead,
      markAllAsRead,
      clearNotifications,
      refreshNotifications,
      lastUpdate,
      realtimeStatus,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
