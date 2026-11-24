"use client";

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  MessageSquare, 
  Calendar, 
  ClipboardList,
  ChevronRight,
  Clock,
  CheckCheck
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const { notifications, markAsRead, markIdsAsRead, markAllAsRead } = useNotifications();
  const { isCounselor, isStudent } = useAuth();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'assessment': return <ClipboardList className="h-4 w-4 text-emerald-500" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center border-2 border-white ring-2 ring-red-500/20 animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-[1.5rem] border-none shadow-2xl overflow-hidden" align="end">
        <div className="bg-white p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
            Notifications
          </h4>
          {unreadCount > 0 ? (
            <Badge className="bg-primary text-white border-none text-[10px] font-black shadow-sm">
              {unreadCount} New
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-200 text-slate-400 font-bold text-[10px]">
              All Read ({notifications.length})
            </Badge>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <Link 
                key={notif.id} 
                href={notif.link}
                onClick={() => markAsRead(notif.id)}
                className={`p-4 flex gap-3 transition-colors border-b border-slate-50 last:border-0 group ${
                  notif.isRead 
                    ? 'bg-white hover:bg-slate-50' 
                    : 'bg-primary/[0.04] hover:bg-primary/[0.08]'
                }`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.isRead ? 'bg-slate-100' : 'bg-white shadow-sm ring-1 ring-primary/10'
                }`}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-[11px] transition-colors ${
                      notif.isRead ? 'font-bold text-slate-800' : 'font-black text-slate-950 group-hover:text-primary'
                    }`}>
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20 shrink-0" />
                    )}
                  </div>
                  <p className={`text-[10px] line-clamp-2 leading-relaxed ${
                    notif.isRead ? 'text-slate-500 font-medium' : 'text-slate-800 font-semibold'
                  }`}>
                    {notif.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary self-center transition-colors" />
              </Link>
            ))
          ) : (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-slate-200" />
              <p className="text-[11px] font-bold text-slate-400 italic">
                No active notifications found.
              </p>
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 bg-slate-50/70 border-t border-slate-100">
            <Button 
              variant="ghost" 
              onClick={markAllAsRead}
              className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary gap-2"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
