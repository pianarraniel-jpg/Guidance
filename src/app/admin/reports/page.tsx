"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { storageService } from '@/lib/storage-service';
import { STORAGE_KEYS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  Download,
  TrendingUp,
  BarChart3,
  BrainCircuit,
  Activity,
  Calendar,
  Users,
  RefreshCw,
  Clock,
  Sparkles,
  Smile,
  FileSpreadsheet,
  ChevronRight,
  Search,
  Filter,
  PlusCircle,
  TrendingDown,
  Briefcase,
  AlertCircle,
  Settings,
  Heart,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface MockReport {
  id: string;
  title: string;
  category: 'Wellness' | 'Counseling' | 'AI Insights' | 'Demographics';
  date: string;
  author: string;
  status: 'Ready' | 'Generating';
  fileSize: string;
}

export default function AdminReports() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search, filter, and interactive states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Custom interactive modal states
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState<'idle' | 'running' | 'success'>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [newReportType, setNewReportType] = useState('Campus Stress Index');
  const [newReportPeriod, setNewReportPeriod] = useState('Last 30 Days');

  // Selected audit view modal
  const [selectedReport, setSelectedReport] = useState<MockReport | null>(null);

  // Historical pre-loaded reports list
  const [reportsList, setReportsList] = useState<MockReport[]>([
    { id: 'REP-082', title: 'Q1 Comprehensive Campus Wellness Summary', category: 'Wellness', date: '2026-04-15', author: 'Dr. Evelyn Carter', status: 'Ready', fileSize: '1.8 MB' },
    { id: 'REP-081', title: 'AI Guidi Companion Engagement & Efficacy Audit', category: 'AI Insights', date: '2026-05-02', author: 'Clinical Engine', status: 'Ready', fileSize: '840 KB' },
    { id: 'REP-080', title: 'Counselor Workload & Student Resource Allocation Audit', category: 'Counseling', date: '2026-05-10', author: 'Sarah Jenkins, LPT', status: 'Ready', fileSize: '1.2 MB' },
    { id: 'REP-079', title: 'Mental Health Demographics & Exam Period Volatility Audit', category: 'Demographics', date: '2026-05-14', author: 'System Runner', status: 'Ready', fileSize: '2.4 MB' },
    { id: 'REP-078', title: 'May Stress Index & Exam Anxiety Mitigation Ledger', category: 'Wellness', date: '2026-05-18', author: 'Dr. Evelyn Carter', status: 'Ready', fileSize: '950 KB' },
  ]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [allApts, allUsers, allAssessments] = await Promise.all([
        storageService.getAll<any>(STORAGE_KEYS.APPOINTMENTS),
        storageService.getAll<any>(STORAGE_KEYS.USERS),
        storageService.getAll<any>(STORAGE_KEYS.ASSESSMENTS),
      ]);
      setAppointments(allApts || []);
      setUsers(allUsers || []);
      setAssessments(allAssessments || []);
    } catch (error) {
      console.error('Error fetching reporting assets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic Metrics Computations
  const totalStudents = users.filter(u => u.role === 'student').length;
  const completedAptsCount = appointments.filter(a => a.status === 'completed').length;
  const pendingAptsCount = appointments.filter(a => a.status === 'pending' || a.status === 'pending_approval').length;
  
  // 1. Live Average Stress Level
  const avgStress = assessments.length > 0
    ? Math.round(assessments.reduce((sum, a) => sum + (a.stressLevel ?? a.stress_level ?? 0), 0) / assessments.length)
    : 0;

  // 2. High Stress Count (Stress > 75)
  const highStressCount = assessments.filter(a => (a.stressLevel ?? a.stress_level ?? 0) > 75).length;

  // 3. Top Emotion Logged
  const emotionFrequencies = assessments.reduce((acc: Record<string, number>, curr) => {
    const emotion = curr.emotionalState || curr.emotional_state || 'Not specified';
    acc[emotion] = (acc[emotion] || 0) + 1;
    return acc;
  }, {});

  let primaryEmotion = 'Joyful';
  let primaryEmotionCount = 0;
  Object.entries(emotionFrequencies).forEach(([emotion, count]) => {
    if (count > primaryEmotionCount && emotion !== 'Not specified') {
      primaryEmotion = emotion;
      primaryEmotionCount = count;
    }
  });

  // 4. Counselor Workload Mapping
  const counselorApts = appointments.reduce((acc: Record<string, number>, curr) => {
    const name = curr.counselorName || curr.counselor_name || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const counselorWorkloads = Object.entries(counselorApts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Mock Wellness Chart Data over 6 Months
  const mockMonthlyTrends = [
    { month: 'Dec', wellness: 72, stress: 38 },
    { month: 'Jan', wellness: 78, stress: 32 },
    { month: 'Feb', wellness: 68, stress: 45 },
    { month: 'Mar', wellness: 65, stress: 49 },
    { month: 'Apr', wellness: 74, stress: 36 },
    { month: 'May', wellness: Math.max(20, 100 - avgStress), stress: avgStress || 35 },
  ];

  // Reports Filter Handler
  const filteredReportsList = reportsList.filter(rep => {
    const titleMatch = rep.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       rep.author.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = categoryFilter === 'all' ? true : rep.category === categoryFilter;
    return titleMatch && categoryMatch;
  });

  // Start report generation task simulator
  const handleStartGeneration = () => {
    setGenerationStep('running');
    setGenerationProgress(0);
    
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setGenerationStep('success');
          // Add newly generated report mock to state
          const newReport: MockReport = {
            id: `REP-0${83 + Math.floor(Math.random() * 20)}`,
            title: `${newReportPeriod} ${newReportType} Comprehensive Audit`,
            category: newReportType.includes('Stress') || newReportType.includes('Wellness') ? 'Wellness' : 'Counseling',
            date: new Date().toISOString().split('T')[0],
            author: 'Admin User',
            status: 'Ready',
            fileSize: '1.4 MB'
          };
          setReportsList(prevList => [newReport, ...prevList]);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="p-8 max-w-7xl mx-auto w-full min-h-screen">
          
          {/* Header */}
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campus Audits</h1>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Reports Core
                </Badge>
              </div>
              <p className="text-sm text-slate-400 font-medium">Download clinical insights, analyze academic stress loads, and manage counselor workloads.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => loadData(false)}
                disabled={isLoading}
                className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Re-Sync Assets
              </Button>
              <Button 
                onClick={() => {
                  setIsGeneratorOpen(true);
                  setGenerationStep('idle');
                  setGenerationProgress(0);
                }}
                className="h-11 px-5 rounded-xl bg-primary text-white font-black text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Generate New Report
              </Button>
            </div>
          </header>

          {/* Quick Analytics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-500">
                  <Activity className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">WELLNESS</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Campus Stress Avg</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-black ${avgStress > 70 ? 'text-red-500' : 'text-slate-900'}`}>{avgStress}%</p>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {avgStress > 75 ? 'Critical Anxiety' : avgStress >= 40 ? 'Moderate Stress' : 'Highly Stable'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-500">
                  <Clock className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">STAFFING</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Consultations</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">{appointments.length}</p>
                  <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-0.5">
                    {completedAptsCount} Completed • {pendingAptsCount} Pending
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-rose-50 text-rose-500">
                  <Heart className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">PRIMARY CLINICAL</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prevalent Emotion</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-rose-500 capitalize">{primaryEmotion}</p>
                  <span className="text-[11px] text-slate-400 font-semibold">{primaryEmotionCount} entries</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-100 text-slate-400 bg-slate-50/50">URGENT CASES</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">High-Risk Students</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-black ${highStressCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                    {highStressCount}
                  </p>
                  <span className="text-[11px] text-slate-400 font-semibold">Stress index &gt; 75%</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
            
            {/* Chart Area */}
            <div className="lg:col-span-8">
              <Card className="border-none shadow-sm bg-white rounded-[2.5rem] p-8 min-h-[420px] flex flex-col justify-between">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Campus Wellness Index Trends</CardTitle>
                    <CardDescription className="text-xs mt-1">Comparative evaluation of Campus Stress Index vs Student Wellness Scores.</CardDescription>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] uppercase">Active DB Sync</Badge>
                </div>

                <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockMonthlyTrends}>
                      <defs>
                        <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-[11px] font-bold text-slate-400" />
                      <YAxis axisLine={false} tickLine={false} className="text-[11px] font-bold text-slate-400" domain={[0, 100]} />
                      <Tooltip cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
                      <Area type="monotone" name="Wellness score" dataKey="wellness" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWellness)" />
                      <Area type="monotone" name="Stress Level" dataKey="stress" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStress)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Workload Allocation */}
            <div className="lg:col-span-4">
              <Card className="border-none shadow-sm bg-white rounded-[2.5rem] p-8 min-h-[420px] flex flex-col">
                <div className="mb-6">
                  <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Staff Caseloads</CardTitle>
                  <CardDescription className="text-xs mt-1">Consultation loads assigned per counselor.</CardDescription>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {counselorWorkloads.map((counselor, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-100/50 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center font-black text-primary text-xs shrink-0">
                          {counselor.name[0] || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{counselor.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Guidance Counselor</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-slate-700 font-bold text-xs border border-slate-100 shadow-sm rounded-lg px-2.5 py-1">
                        {counselor.count} Sessions
                      </Badge>
                    </div>
                  ))}
                  {counselorWorkloads.length === 0 && (
                    <p className="text-xs text-slate-400 font-medium italic text-center py-12">No counselor sessions scheduled.</p>
                  )}
                </div>
              </Card>
            </div>

          </div>

          {/* Historical Audit Log Directory */}
          <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col min-h-[450px]">
            
            {/* Header controls */}
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight font-headline">Audit Reports Directory</CardTitle>
                <CardDescription className="text-xs mt-0.5">Access historic mental health surveys, clinical performance reports, and data exports.</CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group w-60">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Search audits..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 border-slate-100 bg-slate-50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                  {['all', 'Wellness', 'Counseling', 'AI Insights'].map(c => (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        categoryFilter === c 
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {c === 'all' ? 'All categories' : c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reports List Table */}
            <div className="px-8 pb-8 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-4">Report Code</th>
                      <th className="py-4">Report Title</th>
                      <th className="py-4">Segment / Category</th>
                      <th className="py-4">Release Date</th>
                      <th className="py-4">Authorized Author</th>
                      <th className="py-4 text-right">Data Exports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReportsList.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
                        </td>
                        <td className="py-4">
                          <p className="text-xs font-black text-slate-800 leading-snug hover:text-primary cursor-pointer" onClick={() => setSelectedReport(report)}>
                            {report.title}
                          </p>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <Badge className={`border-none font-black text-[10px] px-2.5 py-0.5 rounded-full ${
                            report.category === 'Wellness' ? 'bg-emerald-50 text-emerald-600' :
                            report.category === 'AI Insights' ? 'bg-purple-50 text-purple-600' :
                            report.category === 'Counseling' ? 'bg-primary/10 text-primary' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {report.category}
                          </Badge>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="text-[11px] text-slate-500 font-bold">{report.date}</span>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <span className="text-[11px] text-slate-600 font-semibold">{report.author}</span>
                        </td>
                        <td className="py-4 whitespace-nowrap text-right space-x-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedReport(report)}
                            className="h-8 rounded-lg text-[10px] font-black text-slate-400 hover:text-slate-700"
                          >
                            Read Insights
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] font-black border-slate-100 text-primary hover:bg-primary/5 hover:text-primary gap-1"
                          >
                            <Download className="h-3 w-3" /> PDF ({report.fileSize})
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredReportsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-bold italic text-xs">No administrative audits match your search query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

        </div>

        {/* Dynamic Report Generator Modal */}
        {isGeneratorOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-text">
            <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              
              <div className="p-8 bg-slate-50 border-b border-slate-100">
                <h3 className="text-2xl font-black text-slate-900">Compile Campus Audit</h3>
                <p className="text-xs text-slate-400 mt-1">Configure parameters to generate dynamic mental health evaluations.</p>
              </div>

              <div className="p-8 space-y-6">
                
                {generationStep === 'idle' && (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Report Objective</label>
                        <select 
                          className="w-full h-11 border border-slate-100 rounded-xl bg-slate-50 px-3 text-xs font-semibold focus-visible:ring-1 focus-visible:ring-primary"
                          value={newReportType}
                          onChange={(e) => setNewReportType(e.target.value)}
                        >
                          <option>Campus Stress Index</option>
                          <option>AI Guidi Efficacy Ledger</option>
                          <option>Counselor Allocations & Caseloads</option>
                          <option>Anxiety Mitigation Diagnostics</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Period</label>
                        <select 
                          className="w-full h-11 border border-slate-100 rounded-xl bg-slate-50 px-3 text-xs font-semibold focus-visible:ring-1 focus-visible:ring-primary"
                          value={newReportPeriod}
                          onChange={(e) => setNewReportPeriod(e.target.value)}
                        >
                          <option>Last 7 Days</option>
                          <option>Last 30 Days</option>
                          <option>Current Academic Quarter</option>
                          <option>Complete Semester Audit</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)} className="h-11 rounded-xl text-xs font-bold">
                        Cancel
                      </Button>
                      <Button onClick={handleStartGeneration} className="h-11 bg-primary text-white font-black text-xs rounded-xl shadow-xl shadow-primary/10">
                        Initiate Compilation
                      </Button>
                    </div>
                  </>
                )}

                {generationStep === 'running' && (
                  <div className="py-8 text-center space-y-6">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                    <div className="space-y-2">
                      <p className="text-sm font-black text-slate-800">Processing University Database...</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing profiles, clinical assessments, and AI queues ({generationProgress}%)</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${generationProgress}%` }} />
                    </div>
                  </div>
                )}

                {generationStep === 'success' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-xl shadow-emerald-500/10">
                      <CheckCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-slate-900">Audit Created Successfully</h4>
                      <p className="text-xs text-slate-400">The compiler completed analyzing the dataset. The report has been appended to the directory.</p>
                    </div>
                    
                    <div className="pt-2 flex justify-center">
                      <Button 
                        onClick={() => setIsGeneratorOpen(false)} 
                        className="h-11 px-6 bg-primary text-white font-black text-xs rounded-xl shadow-xl shadow-primary/10"
                      >
                        Return to Directory
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          </div>
        )}

        {/* Selected Audit Summary Insights Dialog */}
        {selectedReport && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-text animate-in fade-in">
            <Card className="w-full max-w-lg rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
              
              <div className="p-8 bg-slate-50 border-b border-slate-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">{selectedReport.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase">{selectedReport.category}</Badge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">#{selectedReport.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Author</p>
                    <p className="text-xs font-bold text-slate-800">{selectedReport.author}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Publish Date</p>
                    <p className="text-xs font-bold text-slate-800">{selectedReport.date}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">File Format</p>
                    <p className="text-xs font-bold text-slate-800">Dynamic PDF Report / CSV spreadsheet</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Allocation</p>
                    <p className="text-xs font-bold text-slate-800">{selectedReport.fileSize}</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Executive Insight Summary</h4>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                    "System diagnostics report evaluating students wellness metrics, active queues, stress thresholds, and counsellor workloads. The metrics reflect stable wellness indexes with high engagement rates through AI-driven chatbots and structured feedback paths."
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setSelectedReport(null)} className="h-11 rounded-xl text-xs font-bold">
                    Dismiss
                  </Button>
                  <Button className="h-11 bg-primary text-white font-black text-xs rounded-xl shadow-xl shadow-primary/10 gap-1.5">
                    <Download className="h-4 w-4" /> Download Full PDF
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      </DashboardLayout>
    </ProtectedRoute>
  );
}
