"use client";

import React from 'react';
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
  AlertCircle, 
  Calendar, 
  Smile, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical
} from 'lucide-react';

const studentsData = [
  {
    name: 'Alex Martinez',
    email: 'alex.m@example.edu',
    id: '#USPF-8821',
    course: 'Computer Science',
    year: 'Senior',
    lastSession: '2 days ago',
    status: 'Critical',
    statusColor: 'bg-red-50 text-red-600 border-red-100'
  },
  {
    name: 'Sarah Williams',
    email: 's.williams@example.edu',
    id: '#USPF-4102',
    course: 'Psychology',
    year: 'Sophomore',
    lastSession: 'Last week',
    status: 'Moderate',
    statusColor: 'bg-orange-50 text-orange-600 border-orange-100'
  },
  {
    name: 'David Chen',
    email: 'd.chen@example.edu',
    id: '#USPF-9912',
    course: 'Business Admin',
    year: 'Freshman',
    lastSession: 'Today',
    status: 'Stable',
    statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  },
  {
    name: 'Jordan Lee',
    email: 'jordan.lee@example.edu',
    id: '#USPF-2245',
    course: 'Fine Arts',
    year: 'Junior',
    lastSession: '3 days ago',
    status: 'Stable',
    statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  },
  {
    name: 'Elena Kovach',
    email: 'e.kovach@example.edu',
    id: '#USPF-1108',
    course: 'Engineering',
    year: 'Senior',
    lastSession: '1 month ago',
    status: 'Critical',
    statusColor: 'bg-red-50 text-red-600 border-red-100'
  }
];

export default function CounselorAppointmentsPage() {
  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Student Directory</h1>
          <p className="text-slate-500 font-medium">Manage wellness check-ins and session schedules</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] h-10 bg-white border-none shadow-sm rounded-xl font-bold text-xs">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="cs">Computer Science</SelectItem>
              <SelectItem value="psych">Psychology</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-[140px] h-10 bg-white border-none shadow-sm rounded-xl font-bold text-xs">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="freshman">Freshman</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-[160px] h-10 bg-white border-none shadow-sm rounded-xl font-bold text-xs">
              <SelectValue placeholder="Stress Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14 pl-8">Student Name</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">ID</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">Course</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">Year</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">Last Session</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14">Stress Status</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-14 pr-8 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsData.map((student, idx) => (
                <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all cursor-pointer group">
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 ring-2 ring-white">
                        <AvatarImage src={`https://picsum.photos/seed/${student.name}/64/64`} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{student.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-500">{student.id}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700">{student.course}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700">{student.year}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-700">{student.lastSession}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-tight border-none ${student.statusColor}`}>
                      <div className={`h-1.5 w-1.5 rounded-full mr-2 ${student.status === 'Critical' ? 'bg-red-500' : student.status === 'Moderate' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-primary transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="p-6 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Showing 5 of 1,240 students</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-[10px] text-slate-500 border-slate-100">Previous</Button>
              <Button size="sm" className="h-8 rounded-lg font-bold text-[10px] bg-primary hover:bg-primary/90 text-white border-none shadow-sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High Priority</p>
              <p className="text-2xl font-black text-slate-900">12</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Sessions</p>
              <p className="text-2xl font-black text-slate-900">34</p>
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-lg shadow-slate-200/40 bg-white rounded-3xl overflow-hidden p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
              <Smile className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Sentiment</p>
              <p className="text-2xl font-black text-slate-900">7.8</p>
            </div>
          </div>
        </Card>
      </div>

      <footer className="mt-12 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          © 2024 GuidanceSync Supportive Wellness. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
