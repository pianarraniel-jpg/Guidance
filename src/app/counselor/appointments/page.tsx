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
  Radio,
  Plus,
  Sparkles,
  Brain,
  Heart,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS, APPOINTMENT_STATUS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/contexts/AuthContext';

const SESSION_TYPES = [
  { value: 'Wellness Check-in', label: 'Wellness Check-in', icon: Heart, color: 'text-emerald-500 bg-emerald-50' },
  { value: 'Academic Stress', label: 'Academic Stress', icon: BookOpen, color: 'text-blue-500 bg-blue-50' },
  { value: 'Personal Concerns', label: 'Personal Concerns', icon: Brain, color: 'text-purple-500 bg-purple-50' },
  { value: 'Career Guidance', label: 'Career Guidance', icon: Briefcase, color: 'text-orange-500 bg-orange-50' },
  { value: 'Mental Health Support', label: 'Mental Health Support', icon: Sparkles, color: 'text-pink-500 bg-pink-50' },
];

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
];

export default function CounselorAppointmentsPage() {
  const { user: counselor } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Counselor-to-Student booking states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [bookingStudentId, setBookingStudentId] = useState("");
  const [bookingType, setBookingType] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [bookingLocation, setBookingLocation] = useState("Room 302");
  const [isBookingSubmit, setIsBookingSubmit] = useState(false);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackAppointment, setFeedbackAppointment] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newAction, setNewAction] = useState("");
  const [isLive, setIsLive] = useState(false);
  const { toast } = useToast();
  const { notifications, markAsRead } = useNotifications();

  const loadAppointments = useCallback(async () => {
    const data = await storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS);
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAppointments(data);
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const allUsers = await storageService.getAll<any>(STORAGE_KEYS.USERS);
      setStudents(allUsers.filter(u => u.role === 'student'));
    } catch (err) {
      console.error("Error loading students:", err);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleCounselorBooking = async () => {
    if (!bookingStudentId || !bookingType || !bookingDate || !bookingTime || !bookingReason.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields.",
      });
      return;
    }
    
    setIsBookingSubmit(true);
    try {
      const selectedStudent = students.find(s => s.id === bookingStudentId);
      if (!selectedStudent) throw new Error("Student not found");

      await storageService.create(STORAGE_KEYS.APPOINTMENTS, {
        studentId: bookingStudentId,
        studentName: selectedStudent.name,
        counselorId: counselor?.id,
        counselorName: counselor?.name,
        date: bookingDate,
        time: bookingTime,
        type: bookingType,
        status: APPOINTMENT_STATUS.CONFIRMED,
        location: bookingLocation,
        reason: bookingReason.trim(),
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Appointment Booked!",
        description: `Successfully booked a confirmed session for ${selectedStudent.name}.`,
      });

      setIsBookingOpen(false);
      // Reset form
      setBookingStudentId("");
      setBookingType("");
      setBookingDate("");
      setBookingTime("");
      setBookingReason("");
      setBookingLocation("Room 302");
      
      // Reload appointments
      loadAppointments();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: err.message || "An error occurred while booking.",
      });
    } finally {
      setIsBookingSubmit(false);
    }
  };

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
    setFeedbackText(appointment.counselorNotes || "");
    setActionItems(appointment.actionItems || ["Practice 4-7-8 breathing technique before sleep", "Limit caffeine intake after 2:00 PM"]);
    setNewAction("");
    setIsFeedbackOpen(true);
  };

  const submitFeedbackAndComplete = async () => {
    if (!feedbackText.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback required",
        description: "Please enter counselor feedback before completing the session.",
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
      { 
        status: APPOINTMENT_STATUS.COMPLETED,
        counselorNotes: feedbackText,
        actionItems: actionItems,
        lastUpdate: Date.now()
      },
    );

    toast({
      title: "Session Completed",
      description: "Feedback has been saved and the appointment is now completed.",
    });

    setIsFeedbackOpen(false);
    setSelectedApp((prev: any) =>
      prev?.id === feedbackAppointment.id
        ? { ...prev, status: APPOINTMENT_STATUS.COMPLETED, counselorNotes: feedbackText, actionItems }
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
          <Button
            onClick={() => setIsBookingOpen(true)}
            className="h-10 px-4 rounded-xl font-black bg-primary text-white hover:bg-primary/90 shadow-md flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Book Session
          </Button>
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
                Session Feedback & Actions
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Provide clinical reflections and recommended actions for the student.
              </p>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Student Session
              </p>
              <p className="text-sm font-bold text-slate-800">
                {feedbackAppointment?.studentName || "Unknown student"} •{" "}
                {feedbackAppointment?.date} {feedbackAppointment?.time}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Counselor Session Reflections (Visible to Student)
              </p>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Write feedback for the student and session here..."
                className="min-h-[120px] rounded-2xl p-4 bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Recommended Action Items (Student Homework)
              </p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {actionItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-800">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {item}</span>
                    <Button variant="ghost" size="sm" onClick={() => setActionItems(prev => prev.filter((_, i) => i !== idx))} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add new recommendation or action item..."
                  value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newAction.trim()) { setActionItems(prev => [...prev, newAction.trim()]); setNewAction(""); } } }}
                  className="h-10 rounded-xl text-xs font-medium bg-white border border-slate-200"
                />
                <Button onClick={() => { if (newAction.trim()) { setActionItems(prev => [...prev, newAction.trim()]); setNewAction(""); } }} variant="secondary" className="h-10 px-4 rounded-xl font-black bg-primary text-white hover:bg-primary/90 shadow-md">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                onClick={submitFeedbackAndComplete}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-white shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Complete Session
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

      {/* Counselor Booking Modal */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-50 border-b">
            <div className="flex flex-col gap-2">
              <DialogTitle className="text-2xl font-black text-slate-900">
                Book Session for Student
              </DialogTitle>
              <p className="text-sm text-slate-500">
                Create a confirmed appointment immediately for any registered student.
              </p>
            </div>
          </DialogHeader>
          <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
            <div className="space-y-4">
              {/* Student Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900">Select Student *</Label>
                <Select value={bookingStudentId} onValueChange={setBookingStudentId}>
                  <SelectTrigger className="w-full h-11 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-primary">
                    <SelectValue placeholder="Choose student..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl bg-white max-h-48 overflow-y-auto">
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id} className="hover:bg-slate-50 rounded-lg p-2.5 cursor-pointer text-xs font-bold text-slate-700">
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Type */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900">Session Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SESSION_TYPES.map(({ value, label, icon: Icon, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBookingType(value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        bookingType === value
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-primary/30'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={`text-[11px] font-bold ${bookingType === value ? 'text-primary' : 'text-slate-700'}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-900">Date *</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="h-11 rounded-xl text-xs font-semibold bg-white border border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-900">Time Slot *</Label>
                  <Select value={bookingTime} onValueChange={setBookingTime}>
                    <SelectTrigger className="w-full h-11 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-primary">
                      <SelectValue placeholder="Choose time slot..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl bg-white">
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot} className="hover:bg-slate-50 rounded-lg p-2.5 cursor-pointer text-xs font-bold text-slate-700">
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location Input */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900">Location</Label>
                <Input
                  placeholder="e.g. Guidance Office - Room 302"
                  value={bookingLocation}
                  onChange={(e) => setBookingLocation(e.target.value)}
                  className="h-11 rounded-xl text-xs font-semibold bg-white border border-slate-200"
                />
              </div>

              {/* Consultation Reason */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900">Consultation Reason / Goal *</Label>
                <Textarea
                  placeholder="Describe the primary concern or focus of this booked session..."
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="min-h-[100px] rounded-xl text-xs font-semibold bg-white border border-slate-200 p-3 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <Button
                onClick={handleCounselorBooking}
                disabled={isBookingSubmit || !bookingStudentId || !bookingType || !bookingDate || !bookingTime || !bookingReason.trim()}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-xl font-black text-white shadow-lg shadow-primary/20"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> {isBookingSubmit ? "Scheduling..." : "Book & Confirm"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsBookingOpen(false);
                  setBookingStudentId("");
                  setBookingType("");
                  setBookingDate("");
                  setBookingTime("");
                  setBookingReason("");
                  setBookingLocation("Room 302");
                }}
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
