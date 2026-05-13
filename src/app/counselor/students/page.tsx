"use client";

import React, { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Trash2,
  ExternalLink,
  Users
} from 'lucide-react';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS, USER_ROLES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CounselorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadStudents = () => {
    const allUsers = storageService.getAll<any>(STORAGE_KEYS.USERS);
    const studentList = allUsers.filter(u => u.role === USER_ROLES.STUDENT);
    setStudents(studentList);
  };

  useEffect(() => {
    loadStudents();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USERS) loadStudents();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleDeleteStudent = (id: string) => {
    storageService.delete(STORAGE_KEYS.USERS, id);
    toast({
      title: "Record Removed",
      description: "The student wellness profile has been deactivated.",
    });
    loadStudents();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId?.includes(searchTerm) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full pb-10">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Student Directory</h1>
          <p className="text-slate-500 font-medium">Monitoring wellness profiles for the USPF community.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by name or student ID..." 
              className="pl-10 h-12 w-[300px] bg-white border-none shadow-sm rounded-2xl text-xs font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-primary/5 px-4 h-12 rounded-2xl flex items-center gap-2 border border-primary/10">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-black text-primary">{students.length} Enrolled</span>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden mb-10">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pl-8">Student</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">ID Number</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">University Email</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16">Engagement</TableHead>
                <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest h-16 pr-8 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${student.id}/64/64`} />
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg bg-slate-50 border-none font-black text-[10px] uppercase px-3 py-1 text-slate-500">
                      {student.studentId || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-600">{student.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase">Active Engagement</Badge>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 group-hover:text-primary">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 border-slate-100 shadow-xl">
                        <DropdownMenuItem className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-slate-700 hover:bg-slate-50">
                           <ExternalLink className="h-4 w-4 text-slate-400" /> Clinical Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onSelect={() => handleDeleteStudent(student.id)}
                          className="flex items-center gap-2 p-3 rounded-xl cursor-pointer font-bold text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                           <Trash2 className="h-4 w-4" /> Deactivate Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                      <p className="font-bold text-sm italic">No students found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
