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
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isCounselor, isStudent } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshNotifications = useCallback(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const alerts: AppNotification[] = [];
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
      const receivedMessages = messages.filter(m => m.receiverId === user.id);
      
      const groupedBySender = receivedMessages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp);
        const lastMsg = sorted[0];
        const unreadInGroup = sorted.filter(m => !readSet.has(`msg-${m.id}`));
        
        // Dynamic ID based on latest received message to ensure "newness"
        const groupId = `group-msg-${senderId}-${lastMsg.id}`;
        const isGroupRead = readSet.has(groupId);

        if (unreadInGroup.length > 0 || isGroupRead) {
          const sender = allUsers.find(u => u.id === senderId);
          const name = sender?.name || 'Student';
          
          alerts.push({
            id: groupId,
            type: 'message',
            title: unreadInGroup.length > 1 
              ? `${unreadInGroup.length} New Messages from ${name}`
              : `New Message from ${name}`,
            description: lastMsg.text.startsWith('[BOOKING_REQUEST]') ? 'Sent session invitation' : lastMsg.text,
            timestamp: lastMsg.timestamp,
            link: '/counselor/messages',
            studentName: name,
            isRead: isGroupRead
          });
        }
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

      // 3. Student: Check for New Clinical Tasks Assigned
      const tasks = storageService.getByField<any>(STORAGE_KEYS.ASSESSMENT_TASKS, 'studentId', user.id);
      tasks
        .filter(t => t.status === 'pending')
        .forEach(t => {
          const id = `asmt-task-${t.id}`;
          alerts.push({
            id,
            type: 'assessment',
            title: 'New Clinical Task',
            description: `Dr. ${t.counselorName?.split(' ').pop()} assigned: ${t.title}`,
            timestamp: t.timestamp || Date.now(),
            link: '/student/assessments',
            studentName: 'You',
            isRead: readSet.has(id)
          });
        });

      // 4. Student: Grouped Messages from Counselor
      const messages = storageService.getAll<any>(STORAGE_KEYS.MESSAGES);
      const receivedMessages = messages.filter(m => m.receiverId === user.id);

      const groupedBySender = receivedMessages.reduce((acc, m) => {
        if (!acc[m.senderId]) acc[m.senderId] = [];
        acc[m.senderId].push(m);
        return acc;
      }, {} as Record<string, any[]>);

      Object.entries(groupedBySender).forEach(([senderId, msgs]) => {
        const sorted = msgs.sort((a, b) => b.timestamp - a.timestamp);
        const lastMsg = sorted[0];
        const unreadInGroup = sorted.filter(m => !readSet.has(`msg-${m.id}`));

        const groupId = `group-msg-${senderId}-${lastMsg.id}`;
        const isGroupRead = readSet.has(groupId);

        if (unreadInGroup.length > 0 || isGroupRead) {
          const sender = allUsers.find(u => u.id === senderId);
          const name = sender?.name || 'Counselor';
          
          alerts.push({
            id: groupId,
            type: 'message',
            title: unreadInGroup.length > 1
              ? `${unreadInGroup.length} New Messages from ${name}`
              : `New Message from ${name}`,
            description: lastMsg.text.startsWith('[BOOKING_REQUEST]') ? 'Invitation to book a session' : lastMsg.text,
            timestamp: lastMsg.timestamp,
            link: '/student/messages',
            studentName: name,
            isRead: isGroupRead
          });
        }
      });
    }

    setNotifications(alerts.sort((a, b) => b.timestamp - a.timestamp));
  }, [isCounselor, isStudent, user]);

  useEffect(() => {
    refreshNotifications();
    
    const handleStorage = (e: StorageEvent) => {
      const watched = [
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.ASSESSMENTS,
        STORAGE_KEYS.MESSAGES,
        STORAGE_KEYS.NOTIFICATIONS_READ,
        STORAGE_KEYS.ASSESSMENT_TASKS
      ];
      if (watched.includes(e.key as any)) {
        refreshNotifications();
      }
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(refreshNotifications, 2000);

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
    const newIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (newIds.length === 0) return;
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
      clearNotifications,
      refreshNotifications
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
