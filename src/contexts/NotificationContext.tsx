
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
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCounselor } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshNotifications = useCallback(() => {
    if (!isCounselor || !user) {
      setNotifications([]);
      return;
    }

    const alerts: AppNotification[] = [];

    // 1. Check for Pending Appointments
    const appointments = storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
    appointments
      .filter(a => a.status === APPOINTMENT_STATUS.PENDING)
      .forEach(a => {
        alerts.push({
          id: `apt-${a.id}`,
          type: 'appointment',
          title: 'New Booking Request',
          description: `${a.studentName} requested a session for ${a.date}`,
          timestamp: new Date(a.createdAt || Date.now()).getTime(),
          link: '/counselor/appointments',
          studentName: a.studentName
        });
      });

    // 2. Check for Submitted Assessments (Forms)
    const assessments = storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS);
    assessments
      .filter(a => a.status === 'submitted')
      .forEach(a => {
        alerts.push({
          id: `asmt-${a.id}`,
          type: 'assessment',
          title: 'Assessment Submitted',
          description: `${a.studentName} completed a clinical form`,
          timestamp: a.timestamp || Date.now(),
          link: '/counselor/assessments',
          studentName: a.studentName
        });
      });

    // 3. Check for New Messages
    const messages = storageService.getAll<any>(STORAGE_KEYS.MESSAGES);
    messages
      .filter(m => m.receiverId === user.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5) // Just show last few as alerts
      .forEach(m => {
        alerts.push({
          id: `msg-${m.id}`,
          type: 'message',
          title: 'New Message',
          description: `Student ${m.senderRole}: ${m.text.substring(0, 30)}${m.text.length > 30 ? '...' : ''}`,
          timestamp: m.timestamp,
          link: '/counselor/messages',
          studentName: 'Student'
        });
      });

    // Sort all by most recent
    setNotifications(alerts.sort((a, b) => b.timestamp - a.timestamp));
  }, [isCounselor, user]);

  useEffect(() => {
    refreshNotifications();
    
    // Listen for storage changes from other tabs/actions
    const handleStorage = (e: StorageEvent) => {
      const watched = [
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.ASSESSMENTS,
        STORAGE_KEYS.MESSAGES
      ];
      if (watched.includes(e.key as any)) {
        refreshNotifications();
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(refreshNotifications, 10000); // Poll every 10s for local session updates

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [refreshNotifications]);

  const clearNotifications = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount: notifications.length,
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
