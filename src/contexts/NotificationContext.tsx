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
  const { user, isCounselor } = useAuth();
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
    if (!isCounselor || !user) {
      setNotifications([]);
      return;
    }

    const alerts: AppNotification[] = [];

    // Current read IDs for filtering/marking
    const currentReadIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ) || '[]');
    const readSet = new Set(currentReadIds);

    // 1. Check for Pending Appointments
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

    // 2. Check for Submitted Assessments (Forms)
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

    // 3. Check for New Messages
    const messages = storageService.getAll<any>(STORAGE_KEYS.MESSAGES);
    messages
      .filter(m => m.receiverId === user.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10) // Show last 10 messages as alerts
      .forEach(m => {
        const id = `msg-${m.id}`;
        alerts.push({
          id,
          type: 'message',
          title: 'New Message',
          description: `Student ${m.senderRole}: ${m.text.substring(0, 30)}${m.text.length > 30 ? '...' : ''}`,
          timestamp: m.timestamp,
          link: '/counselor/messages',
          studentName: 'Student',
          isRead: readSet.has(id)
        });
      });

    // Sort all by most recent
    setNotifications(alerts.sort((a, b) => b.timestamp - a.timestamp));
    setReadIds(readSet);
  }, [isCounselor, user]);

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
    const interval = setInterval(refreshNotifications, 5000); // Poll every 5s for local session updates

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
