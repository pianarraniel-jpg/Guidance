"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToRealtimeHub } from '@/lib/realtime-hub';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import {
  buildCounselorBookingBellPayload,
  buildStudentAppointmentBellPayload,
  formatCounselorDisplayName,
  type BookingNotificationPayload,
} from '@/lib/booking-notifications';
import { isBookedByCounselor, isRescheduledByStudent } from '@/lib/appointment-utils';
import NotificationPopupAlert from '@/components/notifications/NotificationPopupAlert';

export type NotificationType = 'appointment' | 'assessment' | 'message';

export interface PopupAlert {
  id?: string;
  type: NotificationType;
  title: string;
  description: string;
  link?: string;
  studentName?: string;
  timestamp?: number;
}

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
  activePopup: PopupAlert | null;
  triggerPopupAlert: (alert: PopupAlert) => void;
  dismissPopupAlert: () => void;
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
  const [activePopup, setActivePopup] = useState<PopupAlert | null>(null);
  const shownBrowserIds = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef<boolean>(true);
  const recentlyNotifiedRef = useRef<Map<string, number>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPopupAlert = useCallback((alert: PopupAlert) => {
    setActivePopup({
      ...alert,
      timestamp: alert.timestamp || Date.now(),
    });
  }, []);

  const dismissPopupAlert = useCallback(() => {
    setActivePopup(null);
  }, []);

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

    // Fetch latest read IDs concurrently to prevent initial race condition/flicker on page load
    let currentReadSet = readIds;
    try {
      const { data: readData } = await supabase
        .from(STORAGE_KEYS.NOTIFICATIONS_READ)
        .select('notification_id')
        .eq('user_id', user.id);
      if (readData) {
        currentReadSet = new Set(readData.map((r: any) => r.notification_id));
        setReadIds(currentReadSet);
      }
    } catch (e) {
      console.warn('[NotificationContext] Error loading read notification IDs:', e);
    }

    const alerts: AppNotification[] = [];
    const readSet = currentReadSet;

    if (isCounselor) {
      const allAppointments = await storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
      const counselorAppointments = allAppointments.filter(a => {
        if (a.counselorId && a.counselorId === user.id) return true;
        if (a.counselorName && user.name && (
          a.counselorName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(a.counselorName.toLowerCase())
        )) return true;
        if (!a.counselorId && !a.counselorName) return true;
        return false;
      });

      counselorAppointments
        .filter(a => 
          a.status === APPOINTMENT_STATUS.CONFIRMED || 
          (a.status === APPOINTMENT_STATUS.PENDING && (!isBookedByCounselor(a) || isRescheduledByStudent(a))) || 
          a.status === APPOINTMENT_STATUS.CANCELLED
        )
        .forEach(a => {
          const booking = a as BookingNotificationPayload;
          const notif = buildCounselorBookingBellPayload(booking, false);
          // Active pending booking or reschedule request awaiting counselor action
          const isPendingAction = a.status === APPOINTMENT_STATUS.PENDING && (!isBookedByCounselor(a) || isRescheduledByStudent(a));
          alerts.push({
            ...notif,
            isRead: isPendingAction ? false : readSet.has(notif.id),
          });
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
        const isGroupRead = unreadInGroup.length === 0 || readSet.has(groupId);
        alerts.push({
          id: groupId, type: 'message',
          title: unreadInGroup.length > 1 ? `${unreadInGroup.length} New Messages` : `New Message`,
          description: lastMsg.text?.startsWith('[BOOKING_REQUEST]') ? 'Sent session invitation' : (lastMsg.text || 'Message received'),
          timestamp: lastMsg.timestamp || Date.now(),
          link: '/counselor/messages',
          studentName: 'Student',
          isRead: isGroupRead,
        });
      });
    } else if (isStudent) {
      const appointments = await storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      appointments
        .filter(a => 
          a.status === APPOINTMENT_STATUS.CONFIRMED || 
          a.status === APPOINTMENT_STATUS.CANCELLED || 
          (a.status === APPOINTMENT_STATUS.PENDING && (isBookedByCounselor(a) || isRescheduledByStudent(a)))
        )
        .forEach(a => {
          const booking = a as BookingNotificationPayload;
          const notif = buildStudentAppointmentBellPayload(booking, false);
          // Active invitation from counselor awaiting student confirmation
          const isPendingStudentAction = a.status === APPOINTMENT_STATUS.PENDING && isBookedByCounselor(a) && !isRescheduledByStudent(a);
          alerts.push({
            ...notif,
            isRead: isPendingStudentAction ? false : readSet.has(notif.id),
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
        const isGroupRead = unreadInGroup.length === 0 || readSet.has(groupId);
        alerts.push({
          id: groupId, type: 'message',
          title: unreadInGroup.length > 1 ? `${unreadInGroup.length} New Messages` : `New Message`,
          description: lastMsg.text?.startsWith('[BOOKING_REQUEST]') ? 'Invitation to book a session' : (lastMsg.text || 'Message received'),
          timestamp: lastMsg.timestamp || Date.now(),
          link: '/student/messages',
          studentName: 'Counselor',
          isRead: isGroupRead,
        });
      });
    }

    const sorted = alerts.sort((a, b) => b.timestamp - a.timestamp);

    // On initial mount, register existing unread items so we don't spam popups
    if (isInitialMountRef.current) {
      sorted.forEach(n => shownBrowserIds.current.add(n.id));
      isInitialMountRef.current = false;
    } else {
      const newlyUnread = sorted.filter(n => !n.isRead && !shownBrowserIds.current.has(n.id));
      if (newlyUnread.length > 0) {
        newlyUnread.forEach(n => {
          showBrowserNotification(n.title, n.description);
          shownBrowserIds.current.add(n.id);
        });
        const top = newlyUnread[0];
        triggerPopupAlert({
          id: top.id,
          type: top.type,
          title: top.title,
          description: top.description,
          link: top.link,
          studentName: top.studentName,
          timestamp: top.timestamp,
        });
      }
    }

    setNotifications(sorted);
  }, [isCounselor, isStudent, user, showBrowserNotification, triggerPopupAlert]);

  const refreshNotifications = useCallback(() => {
    void fetchNotificationsData();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchNotificationsData();
    }, 600);
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
      const notifId = `apt-student-${apt.id}-${apt.status || 'pending'}-${apt.date || ''}-${apt.time || ''}`;
      const bookedByCounselor = isBookedByCounselor(apt);
      const rescheduledByStudent = isRescheduledByStudent(apt);

      if (apt.status === APPOINTMENT_STATUS.CONFIRMED) {
        if (shouldNotify(eventKey)) {
          const title = rescheduledByStudent ? 'Reschedule Approved 🎉' : 'Session Confirmed 🎉';
          const description = rescheduledByStudent
            ? `Your request to reschedule on ${dateStr}${timeStr} with ${counselor} has been confirmed.`
            : `Your ${apt.type} session on ${dateStr}${timeStr} with ${counselor} has been confirmed.`;

          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/student/appointments',
          });
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
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/student/appointments',
          });
        }
      } else if ((event.action === 'insert' || apt.status === APPOINTMENT_STATUS.PENDING) && bookedByCounselor && !rescheduledByStudent) {
        if (shouldNotify(eventKey)) {
          const title = 'Session Invitation 📋';
          const description = `${counselor} scheduled a session for ${dateStr}${timeStr}. Please confirm your attendance.`;
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/student/appointments',
          });
        }
      }
    } else if (isCounselor) {
      const cId = apt.counselorId;
      const cName = apt.counselorName;
      const isForThisCounselor = !cId || cId === user.id ||
        (cName && user.name && (
          cName.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(cName.toLowerCase())
        )) || !user.department || user.department.toLowerCase() === 'all';

      if (!isForThisCounselor) return;

      const studentName = apt.studentName || 'A student';
      const timeStr = apt.time ? ` at ${apt.time}` : '';
      const dateStr = apt.date || 'the requested date';
      const eventKey = `counselor-apt-${apt.id}-${apt.status}-${apt.date}-${apt.time}`;
      const notifId = `apt-counselor-${apt.id}-${apt.status || 'pending'}-${apt.date || ''}-${apt.time || ''}`;
      const bookedByCounselor = isBookedByCounselor(apt);
      const rescheduledByStudent = isRescheduledByStudent(apt);

      if (apt.status === APPOINTMENT_STATUS.PENDING) {
        if (rescheduledByStudent && shouldNotify(eventKey)) {
          const title = 'Reschedule Requested 📅';
          const description = `${studentName} requested to reschedule session to ${dateStr}${timeStr}. Please review and confirm.`;
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/counselor/appointments',
          });
        } else if (!bookedByCounselor && shouldNotify(eventKey)) {
          const title = 'New Booking Request 📅';
          const description = `${studentName} requested a ${apt.type} session for ${dateStr}${timeStr}.`;
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/counselor/appointments',
          });
        }
      } else if (apt.status === APPOINTMENT_STATUS.CONFIRMED) {
        if (shouldNotify(eventKey)) {
          const title = rescheduledByStudent
            ? 'Reschedule Confirmed 📅'
            : (bookedByCounselor ? 'Session Confirmed by Student 🎉' : 'Session Confirmed 📅');
          const description = rescheduledByStudent
            ? `Rescheduled session with ${studentName} for ${dateStr}${timeStr} is confirmed.`
            : (bookedByCounselor
              ? `${studentName} confirmed the consultation scheduled for ${dateStr}${timeStr}.`
              : `Session with ${studentName} for ${dateStr}${timeStr} is confirmed.`);
          toast({
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/counselor/appointments',
          });
        }
      } else if (apt.status === APPOINTMENT_STATUS.CANCELLED) {
        if (shouldNotify(eventKey)) {
          const title = 'Session Cancelled ⚠️';
          const description = `${studentName} cancelled the session for ${dateStr}${timeStr}.`;
          toast({
            variant: 'destructive',
            title,
            description,
          });
          showBrowserNotification(title, description);
          triggerPopupAlert({
            id: notifId,
            type: 'appointment',
            title,
            description,
            link: '/counselor/appointments',
          });
        }
      }
    }

    setLastUpdate(Date.now());
    refreshNotifications();
  }, [user, isStudent, isCounselor, showBrowserNotification, refreshNotifications, triggerPopupAlert]);

  const handleRealtimeAppointmentEventRef = useRef(handleRealtimeAppointmentEvent);
  useEffect(() => {
    handleRealtimeAppointmentEventRef.current = handleRealtimeAppointmentEvent;
  }, [handleRealtimeAppointmentEvent]);

  const handleRealtimeMessageEvent = useCallback(async (rawPayload: any) => {
    if (!user) return;
    const msg = rawPayload?.new || rawPayload || {};
    const senderId = msg.sender_id || msg.senderId;
    const receiverId = msg.receiver_id || msg.receiverId;
    const text = msg.text;

    // Do NOT notify if there's no text or if sent by the current user
    if (!text || !senderId || senderId === user.id) return;

    // Must be meant for the current user
    const isForMe = receiverId === user.id || (!receiverId && (isCounselor || isStudent));
    if (!isForMe) return;

    // Deduplication check
    const msgKey = msg.id 
      ? `msg-${msg.id}` 
      : `msg-${senderId}-${msg.timestamp || Date.now()}-${String(text).slice(0, 15)}`;
    const now = Date.now();
    const last = recentlyNotifiedRef.current.get(msgKey);
    if (last && now - last < 5000) return;
    recentlyNotifiedRef.current.set(msgKey, now);

    // Look up sender's display name
    let senderName = '';
    try {
      const allUsers = await storageService.getAll<any>(STORAGE_KEYS.USERS);
      const found = allUsers.find(u => u.id === senderId);
      if (found?.name) {
        senderName = found.name;
      }
    } catch (e) {
      console.warn('[NotificationContext] Could not fetch sender user name:', e);
    }

    if (!senderName) {
      senderName = isStudent ? 'Your Counselor' : 'Student';
    }

    const isBooking = typeof text === 'string' && text.startsWith('[BOOKING_REQUEST]');
    const previewText = isBooking 
      ? 'Sent a consultation booking invitation' 
      : (typeof text === 'string' ? text.slice(0, 90) : 'New message received');
    const chatLink = isStudent ? '/student/messages' : '/counselor/messages';

    // Instant on-screen pop up notification (Toast)
    toast({
      title: `New Message from ${senderName} 💬`,
      description: previewText,
      action: (
        <ToastAction
          altText="View message"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = chatLink;
            }
          }}
        >
          View
        </ToastAction>
      ),
    });

    // Browser desktop notification pop up
    showBrowserNotification(`New Message from ${senderName}`, previewText);

    // Instant floating interactive popup alert
    triggerPopupAlert({
      id: msgKey,
      type: 'message',
      title: `New Message from ${senderName} 💬`,
      description: previewText,
      link: chatLink,
    });

    setLastUpdate(Date.now());
    refreshNotifications();
  }, [user, isStudent, isCounselor, showBrowserNotification, refreshNotifications, triggerPopupAlert]);

  const handleRealtimeMessageEventRef = useRef(handleRealtimeMessageEvent);
  useEffect(() => {
    handleRealtimeMessageEventRef.current = handleRealtimeMessageEvent;
  }, [handleRealtimeMessageEvent]);

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

    const onMessagePostgres = (payload: any) => {
      handleRealtimeMessageEventRef.current(payload.new || payload);
      handleRealtimeUpdateRef.current();
    };

    const onAssessmentPostgres = (payload: any) => {
      const asmt = payload.new || payload;
      if (asmt && asmt.status === 'submitted') {
        const student = asmt.student_name || asmt.studentName || 'A student';
        toast({
          title: 'Assessment Submitted 📝',
          description: `${student} completed a counseling form.`,
        });
        showBrowserNotification('Assessment Submitted', `${student} completed a counseling form.`);
        if (isCounselor) {
          triggerPopupAlert({
            id: asmt.id,
            type: 'assessment',
            title: 'Assessment Submitted 📝',
            description: `${student} completed a counseling form.`,
            link: '/counselor/assessments',
          });
        }
      } else if (asmt && asmt.status === 'evaluated' && isStudent) {
        toast({
          title: 'Assessment Feedback Received 📝',
          description: 'Your counselor has evaluated your assessment form.',
        });
        showBrowserNotification('Assessment Feedback', 'Your counselor has evaluated your assessment form.');
        triggerPopupAlert({
          id: asmt.id,
          type: 'assessment',
          title: 'Assessment Feedback Received 📝',
          description: 'Your counselor has evaluated your assessment form.',
          link: '/student/assessments',
        });
      }
      handleRealtimeUpdateRef.current();
    };

    if (isStudent) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `student_id=eq.${user.id}` }, onAppointmentPostgres)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, onMessagePostgres)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments', filter: `student_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assessment_tasks', filter: `student_id=eq.${user.id}` }, () => handleRealtimeUpdateRef.current());
    } else if (isCounselor) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, onAppointmentPostgres)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, onMessagePostgres)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, onAssessmentPostgres);
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
      } else if (event.table === 'messages' && (event.action === 'insert' || !event.action)) {
        handleRealtimeMessageEventRef.current(event.payload);
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
      setNotifications(prev => prev.map(n => ids.includes(n.id) || ids.some(id => n.id.includes(id)) ? { ...n, isRead: true } : n));
    } catch (e) {
      console.warn('[NotificationContext] Error persisting read IDs:', e);
    }
  }, [user]);

  const markAsRead = useCallback((id: string) => {
    const matchingNotifs = notifications.filter(n => n.id === id || n.id.includes(id));
    const idsToMark = matchingNotifs.length > 0 ? matchingNotifs.map(n => n.id) : [id];
    persistReadIds(idsToMark);
  }, [notifications, persistReadIds]);
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
      activePopup,
      triggerPopupAlert,
      dismissPopupAlert,
      markAsRead,
      markIdsAsRead,
      markAllAsRead,
      clearNotifications,
      refreshNotifications,
      lastUpdate,
      realtimeStatus,
    }}>
      {children}
      <NotificationPopupAlert />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
