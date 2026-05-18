"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  Trash2,
  CalendarClock,
  Check,
  Eye,
  MapPin,
  FileText,
  Target,
  Radio
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';

export default function CounselorAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isLive, setIsLive] = useState(false);
  const { toast } = useToast();
  const { notifications, markAsRead } = useNotifications();

  const loadAppointments = useCallback(async () => {
    const data = await storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAppointments(data);
  }, []);

  useEffect(() => {
    loadAppointments();

    // Realtime: watch all appointment changes
    const channel = supabase
      .channel('counselor-appointments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
      }, (payload) => {
        setIsLive(true);
        const newApt = payload.new as any;
        toast({
          title: '📋 New Booking Request',
          description: `${newApt.student_name} has requested a session for ${newApt.date} at ${newApt.time}.`,
        });
        loadAppointments();
        setTimeout(() => setIsLive(false), 4000);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
      }, () => {
        loadAppointments();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'appointments',
      }, () => {
        loadAppointments();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(false);
      });

    return () => { supabase.removeChannel(channel); };
  }, [loadAppointments]);

  // Auto-clear appointment notifications when viewing this page
  useEffect(() => {
    const unreadApts = notifications.filter(n => n.type === 'appointment' && !n.isRead);
    if (unreadApts.length > 0) unreadApts.forEach(n => markAsRead(n.id));
  }, [notifications, markAsRead]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await storageService.update(STORAGE_KEYS.APPOINTMENTS, id, { status: newStatus });
    toast({ title: 'Status Updated', description: `Appointment is now ${newStatus}.` });
    if (selectedApp?.id === id) setSelectedApp((prev: any) => prev ? { ...prev, status: newStatus } : null);
  };

  const handleDelete = async (id: string) => {
    await storageService.delete(STORAGE_KEYS.APPOINTMENTS, id);
    toast({ variant: 'destructive', title: 'Appointment Deleted', description: 'The record has been permanently removed.' });
    setIsDetailsOpen(false);
  };

  const openFeedbackModal = (appointment: any) => {
    setFeedbackAppointment(appointment);
    setFeedbackText("");
    setIsFeedbackOpen(true);
  };

  const submitFeedbackAndComplete = async () => {
    if (!feedbackText.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback required",
        description:
          "Please enter counselor feedback before completing the session.",
      });
      return;
    }

    if (!feedbackAppointment) {
      toast({
        variant: "destructive",
        title: "Unable to complete",
        description: "No appointment selected for feedback.",
      });
      return;
    }

    await storageService.create("appointment_feedback", {
      appointmentId: feedbackAppointment.id,
      counselorId: feedbackAppointment.counselorId,
      counselorName: feedbackAppointment.counselorName,
      studentId: feedbackAppointment.studentId,
      feedback: feedbackText,
      createdAt: new Date().toISOString(),
    });

    await storageService.update(
      STORAGE_KEYS.APPOINTMENTS,
      feedbackAppointment.id,
      { status: APPOINTMENT_STATUS.COMPLETED },
    );
    toast({
      title: "Session Completed",
      description:
        "Feedback has been saved and the appointment is now completed.",
    });
    setIsFeedbackOpen(false);
    setSelectedApp((prev: any) =>
      prev?.id === feedbackAppointment.id
        ? { ...prev, status: APPOINTMENT_STATUS.COMPLETED }
        : prev,
    );
    loadAppointments();
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch =
      app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const pendingCount = appointments.filter(a => a.status === APPOINTMENT_STATUS.PENDING).length;

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[9px] uppercase">Confirmed</Badge>;
      case 'completed': return <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px] uppercase">Completed</Badge>;
      case 'cancelled': return <Badge className="bg-red-50 text-red-700 border-none font-black text-[9px] uppercase">Cancelled</Badge>;
      case 'pending': return <Badge className="bg-amber-50 text-amber-700 border-none font-black text-[9px] uppercase">Pending</Badge>;
      default: return <Badge variant="outline" className="text-[9px] font-black uppercase">{status}</Badge>;
    }
  };

  const openDetails = (app: any) => {
    setSelectedApp(app);
    markAsRead(`apt-${app.id}`);
    setTimeout(() => setIsDetailsOpen(true), 100);
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Appointment Queue
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <Radio
                className={`h-3 w-3 text-emerald-500 ${isLive ? "animate-ping" : "animate-pulse"}`}
              />
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                Live
              </span>
            </div>
            {pendingCount > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-100 font-black text-[10px]">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <p className="text-slate-500 font-medium">
            Monitoring university-wide student wellness check-ins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search student or type..."
              className="pl-10 h-10 w-[240px] bg-white border-none shadow-sm rounded-xl text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 bg-white border-none shadow-sm rounded-xl font-bold text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14 pl-8">
                  Student
                </TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">
                  Session Type
                </TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">
                  Location
                </TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">
                  Schedule
                </TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">
                  Status
                </TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14 pr-8 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((app) => (
                <TableRow
                  key={app.id}
                  className={`border-b border-slate-50 transition-all group ${app.status === APPOINTMENT_STATUS.PENDING ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-slate-50/30"}`}
                >
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                          <AvatarImage
                            src={`https://picsum.photos/seed/${app.studentName}/64/64`}
                          />
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {app.studentName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {app.status === APPOINTMENT_STATUS.PENDING && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          {app.studentName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          #{app.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700">
                      {app.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-lg bg-slate-50 border-none font-bold text-[9px] uppercase px-2"
                    >
                      {app.location || "Room 302"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">
                        {app.date}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {app.time}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Prominent inline quick-actions */}
                      {app.status === APPOINTMENT_STATUS.PENDING && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(
                              app.id,
                              APPOINTMENT_STATUS.CONFIRMED,
                            )
                          }
                          className="h-7 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 shadow-sm"
                        >
                          <Check className="h-3 w-3 mr-1" /> Accept
                        </Button>
                      )}
                      {app.status === APPOINTMENT_STATUS.CONFIRMED && (
                        <Button
                          size="sm"
                          onClick={() => openFeedbackModal(app)}
                          className="h-7 text-[10px] font-black bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 shadow-sm"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 rounded-2xl p-2 shadow-xl border-slate-100"
                        >
                          <DropdownMenuItem
                            onSelect={() => openDetails(app)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4 text-slate-400" /> View
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-slate-50" />
                          {app.status === APPOINTMENT_STATUS.PENDING && (
                            <DropdownMenuItem
                              onSelect={() =>
                                handleUpdateStatus(
                                  app.id,
                                  APPOINTMENT_STATUS.CONFIRMED,
                                )
                              }
                              className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Check className="h-4 w-4" /> Accept Session
                            </DropdownMenuItem>
                          )}
                          {app.status === APPOINTMENT_STATUS.CONFIRMED && (
                            <DropdownMenuItem
                              onSelect={() => openFeedbackModal(app)}
                              className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs hover:bg-blue-50 hover:text-blue-700"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Complete
                              Session
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() =>
                              handleUpdateStatus(app.id, "pending")
                            }
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs hover:bg-blue-50 hover:text-blue-700"
                          >
                            <CalendarClock className="h-4 w-4" /> Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-slate-50" />
                          <DropdownMenuItem
                            onSelect={() => handleDelete(app.id)}
                            className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAppointments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-slate-400 font-bold"
                  >
                    No active appointments in queue.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="p-6 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Queue: {filteredAppointments.length} sessions • {pendingCount}{" "}
              awaiting approval
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-sm">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Scheduled
              </p>
              <p className="text-2xl font-black text-slate-900">
                {appointments.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Pending Approval
              </p>
              <p className="text-2xl font-black text-slate-900">
                {pendingCount}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Success Rate
              </p>
              <p className="text-2xl font-black text-slate-900">
                {appointments.length
                  ? Math.round(
                      (appointments.filter((a) => a.status === "completed")
                        .length /
                        appointments.length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-white shadow-md">
                <AvatarImage
                  src={`https://picsum.photos/seed/${selectedApp?.studentName}/128/128`}
                />
                <AvatarFallback className="text-xl font-bold bg-primary text-white">
                  {selectedApp?.studentName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">
                  {selectedApp?.studentName}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase">
                    #{selectedApp?.id?.slice(-6).toUpperCase()}
                  </Badge>
                  {getStatusBadge(selectedApp?.status)}
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Session Type
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedApp?.type}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedApp?.location || "Guidance Office - Room 302"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Scheduled Date
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedApp?.date}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Preferred Time
                </p>
                <p className="text-sm font-bold text-slate-700">
                  {selectedApp?.time}
                </p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" /> Reason for
                Consultation
              </p>
              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                "{selectedApp?.reason || "No specific reason provided."}"
              </p>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              {selectedApp?.status === "pending" && (
                <Button
                  onClick={() => {
                    handleUpdateStatus(
                      selectedApp.id,
                      APPOINTMENT_STATUS.CONFIRMED,
                    );
                    setIsDetailsOpen(false);
                  }}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-black gap-2"
                >
                  <Check className="h-4 w-4" /> Accept Session
                </Button>
              )}
              {selectedApp?.status === "confirmed" && (
                <Button
                  onClick={() => {
                    openFeedbackModal(selectedApp);
                    setIsDetailsOpen(false);
                  }}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark as Complete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback modal triggered before marking completed */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-2xl font-black text-slate-900">
                Session Feedback
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Please enter counselor feedback before marking the session as
                complete.
              </p>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Appointment
              </p>
              <p className="text-sm font-bold text-slate-800">
                {feedbackAppointment?.studentName || "Unknown student"} •{" "}
                {feedbackAppointment?.date} {feedbackAppointment?.time}
              </p>
            </div>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Write feedback for the student and session here..."
              className="min-h-[140px] rounded-3xl"
            />
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                onClick={submitFeedbackAndComplete}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Feedback
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsFeedbackOpen(false)}
                className="flex-1 h-12 rounded-xl font-bold border-slate-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
