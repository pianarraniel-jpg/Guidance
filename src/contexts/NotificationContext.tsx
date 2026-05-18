"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCounselor, isStudent } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const shownBrowserIds = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, []);

  const loadReadIds = useCallback(async () => {
    if (!user) { setReadIds(new Set()); return; }
    const { data } = await supabase
      .from(STORAGE_KEYS.NOTIFICATIONS_READ)
      .select('notification_id')
      .eq('user_id', user.id);
    setReadIds(new Set((data ?? []).map((r: any) => r.notification_id)));
  }, [user]);

  const fetchNotificationsData = useCallback(async () => {
    if (!user) { setNotifications([]); return; }

    const alerts: AppNotification[] = [];
    const readSet = readIds;

    if (isCounselor) {
      const appointments = await storageService.getCounselorPendingAppointments();
      appointments.forEach(a => {
        const id = `apt-${a.id}`;
        alerts.push({
          id, type: 'appointment',
          title: 'New Booking Request',
          description: `${a.studentName} requested a session for ${a.date}`,
          timestamp: new Date(a.createdAt || Date.now()).getTime(),
          link: '/counselor/appointments',
          studentName: a.studentName,
          isRead: readSet.has(id),
        });
      });

      const assessments = await storageService.getSubmittedAssessments();
      assessments.forEach(a => {
        const id = `asmt-${a.id}`;
        alerts.push({
          id, type: 'assessment',
          title: 'Assessment Submitted',
          description: `${a.studentName || 'A student'} completed a clinical form`,
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
        .filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.CANCELLED)
        .forEach(a => {
          const id = `apt-status-${a.id}-${a.status}`;
          alerts.push({
            id, type: 'appointment',
            title: a.status === APPOINTMENT_STATUS.CONFIRMED ? 'Session Confirmed' : 'Session Cancelled',
            description: `Your session with Dr. ${a.counselorName?.split(' ').pop()} for ${a.date} is ${a.status}.`,
            timestamp: new Date(a.createdAt || Date.now()).getTime(),
            link: '/student/appointments',
            studentName: 'You',
            isRead: readSet.has(id),
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
            title: 'New Clinical Task',
            description: `Dr. ${t.counselorName?.split(' ').pop()} assigned: ${t.title}`,
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

    sorted
      .filter(n => !n.isRead && !shownBrowserIds.current.has(n.id))
      .forEach(n => {
        showBrowserNotification(n.title, n.description);
        shownBrowserIds.current.add(n.id);
      });

    setNotifications(sorted);
  }, [isCounselor, isStudent, user, readIds, showBrowserNotification]);

  const refreshNotifications = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchNotificationsData();
    }, 400);
  }, [fetchNotificationsData]);

  const handleRealtimeUpdate = useCallback(() => {
    setLastUpdate(Date.now());
    refreshNotifications();
  }, [refreshNotifications]);

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

    if (isStudent) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `student_id=eq.${user.id}` }, handleRealtimeUpdate)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, handleRealtimeUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments', filter: `student_id=eq.${user.id}` }, handleRealtimeUpdate)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assessment_tasks', filter: `student_id=eq.${user.id}` }, handleRealtimeUpdate);
    } else if (isCounselor) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, handleRealtimeUpdate)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, handleRealtimeUpdate)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, handleRealtimeUpdate);
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isStudent, isCounselor, fetchNotificationsData, handleRealtimeUpdate]);

  const persistReadIds = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    const rows = ids.map(notification_id => ({ user_id: user.id, notification_id }));
    await supabase.from(STORAGE_KEYS.NOTIFICATIONS_READ).upsert(rows, { onConflict: 'user_id,notification_id' });
    setReadIds(prev => new Set([...prev, ...ids]));
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
