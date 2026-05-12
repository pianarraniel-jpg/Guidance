"use client";

import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'assessment': return <ClipboardList className="h-4 w-4 text-emerald-500" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4" />;
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
        <div className="bg-white p-4 border-b border-slate-50 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Student Alerts</h4>
          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">{unreadCount} New</Badge>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <Link 
                key={notif.id} 
                href={notif.link}
                onClick={() => markAsRead(notif.id)}
                className={`p-4 flex gap-3 transition-colors border-b border-slate-50 last:border-0 group ${notif.isRead ? 'opacity-50' : 'hover:bg-slate-50 bg-white'}`}
              >
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[11px] font-black text-slate-900 group-hover:text-primary transition-colors">{notif.title}</p>
                    {!notif.isRead && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                    {notif.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[9px] text-slate-300 font-bold uppercase">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-primary self-center" />
              </Link>
            ))
          ) : (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-slate-100" />
              <p className="text-[11px] font-bold text-slate-300 italic">No active concerns found.</p>
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-3 bg-slate-50/50 border-t border-slate-50">
            <Button 
              variant="ghost" 
              onClick={markAllAsRead}
              className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary gap-2"
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
