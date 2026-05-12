"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCounselor, isStudent } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Initialize read IDs from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ);
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const alerts: AppNotification[] = [];

    // Current read IDs for filtering/marking
    const currentReadIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ) || '[]');
    const readSet = new Set(currentReadIds);
    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);

    if (isCounselor) {
      // 1. Counselor: Check for Pending Appointments
      const appointments = storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
      appointments
        .filter(a => a.status === APPOINTMENT_STATUS.PENDING)
        .forEach(a => {
          const id = `apt-${a.id}`;
          alerts.push({
            id,
            type: 'appointment',
            title: 'New Booking Request',
            description: `${a.studentName} requested a session for ${a.date}`,
            timestamp: new Date(a.createdAt || Date.now()).getTime(),
            link: '/counselor/appointments',
            studentName: a.studentName,
            isRead: readSet.has(id)
          });
        });

      // 2. Counselor: Check for Submitted Assessments (Forms)
      const assessments = storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS);
      assessments
        .filter(a => a.status === 'submitted')
        .forEach(a => {
          const id = `asmt-${a.id}`;
          alerts.push({
            id,
            type: 'assessment',
            title: 'Assessment Submitted',
            description: `${a.studentName} completed a clinical form`,
            timestamp: a.timestamp || Date.now(),
            link: '/counselor/assessments',
            studentName: a.studentName,
            isRead: readSet.has(id)
          });
        });

      // 3. Counselor: Grouped Messages from Students
      const messages = storageService.getAll<any>(STORAGE_KEYS.MESSAGES);
      const unreadMessages = messages.filter(m => 
        m.receiverId === user.id && !readSet.has(`msg-${m.id}`)
      );
      
      const groupedBySender = unreadMessages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const lastMsg = msgs.sort((a, b) => b.timestamp - a.timestamp)[0];
        const sender = allUsers.find(u => u.id === senderId);
        const name = sender?.name || 'Student';
        
        alerts.push({
          id: `group-msg-${senderId}`,
          type: 'message',
          title: `New Message from ${name}`,
          description: lastMsg.text,
          timestamp: lastMsg.timestamp,
          link: '/counselor/messages',
          studentName: name,
          isRead: false
        });
      });
    } else if (isStudent) {
      // 1. Student: Check for Appointment Status Changes
      const appointments = storageService.getByField<any>(STORAGE_KEYS.APPOINTMENTS, 'studentId', user.id);
      appointments
        .filter(a => a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.CANCELLED)
        .forEach(a => {
          const id = `apt-status-${a.id}-${a.status}`;
          alerts.push({
            id,
            type: 'appointment',
            title: a.status === APPOINTMENT_STATUS.CONFIRMED ? 'Session Confirmed' : 'Session Cancelled',
            description: `Your session with Dr. ${a.counselorName?.split(' ').pop()} for ${a.date} is ${a.status}.`,
            timestamp: Date.now() - 1000, 
            link: '/student/appointments',
            studentName: 'You',
            isRead: readSet.has(id)
          });
        });

      // 2. Student: Check for Clinical Feedback (Evaluated Assessments)
      const assessments = storageService.getByField<any>(STORAGE_KEYS.ASSESSMENTS, 'studentId', user.id);
      assessments
        .filter(a => a.status === 'evaluated')
        .forEach(a => {
          const id = `asmt-eval-${a.id}`;
          alerts.push({
            id,
            type: 'assessment',
            title: 'Feedback Received',
            description: `Your counselor has provided feedback on your assessment.`,
            timestamp: a.evaluatedAt || Date.now(),
            link: '/student/assessments',
            studentName: 'You',
            isRead: readSet.has(id)
          });
        });

      // 3. Student: Grouped Messages from Counselor
      const messages = storageService.getAll<any>(STORAGE_KEYS.MESSAGES);
      const unreadMessages = messages.filter(m => 
        m.receiverId === user.id && !readSet.has(`msg-${m.id}`)
      );

      const groupedBySender = unreadMessages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const lastMsg = msgs.sort((a, b) => b.timestamp - a.timestamp)[0];
        const sender = allUsers.find(u => u.id === senderId);
        const name = sender?.name || 'Counselor';
        
        alerts.push({
          id: `group-msg-${senderId}`,
          type: 'message',
          title: `New Message from ${name}`,
          description: lastMsg.text.startsWith('[BOOKING_REQUEST]') ? 'Invitation to book a session' : lastMsg.text,
          timestamp: lastMsg.timestamp,
          link: '/student/messages',
          studentName: name,
          isRead: false
        });
      });
    }

    // Sort all by most recent
    setNotifications(alerts.sort((a, b) => b.timestamp - a.timestamp));
    setReadIds(readSet);
  }, [isCounselor, isStudent, user]);

  useEffect(() => {
    refreshNotifications();
    
    const handleStorage = (e: StorageEvent) => {
      const watched = [
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.ASSESSMENTS,
        STORAGE_KEYS.MESSAGES,
        STORAGE_KEYS.NOTIFICATIONS_READ
      ];
      if (watched.includes(e.key as any)) {
        refreshNotifications();
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(refreshNotifications, 5000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [refreshNotifications]);

  const markAsRead = (id: string) => {
    const currentReadIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ) || '[]');
    if (!currentReadIds.includes(id)) {
      const updated = [...currentReadIds, id];
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_READ, JSON.stringify(updated));
      refreshNotifications();
    }
  };

  const markAllAsRead = () => {
    const currentReadIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ) || '[]');
    const newIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...currentReadIds, ...newIds]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_READ, JSON.stringify(updated));
    refreshNotifications();
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount: notifications.filter(n => !n.isRead).length,
      markAsRead,
      markAllAsRead,
      clearNotifications 
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
