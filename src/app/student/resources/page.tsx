"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Wind, 
  BookOpen, 
  Anchor, 
  Music, 
  ChevronRight, 
  Phone, 
  MessageCircle, 
  Clock, 
  Heart,
  FileText,
  Download,
  MapPin,
  Mail,
  Globe,
  Users,
  Brain,
  Calendar
} from 'lucide-react';
import BreathingExerciseModal from '@/components/wellness/BreathingExerciseModal';

const DEFAULT_SELF_CARE = [
  {
    id: 'default-1',
    label: 'Breathing',
    time: '10 min',
    duration: 10,
    type: 'breathing',
  },
  {
    id: 'default-2',
    label: 'Gratitude Journaling',
    time: '10 min',
    duration: 10,
    type: 'journaling',
  },
  {
    id: 'default-3',
    label: '5-4-3-2-1 Sensory Grounding',
    time: '8 min',
    duration: 8,
    type: 'grounding',
  },
  {
    id: 'default-4',
    label: 'Mindful Body Scan Meditation',
    time: '12 min',
    duration: 12,
    type: 'meditation',
  }
];

export default function StudentResources() {
  const [activeCategory, setActiveCategory] = useState('All Resources');
  const { user } = useAuth();
  const [customTools, setCustomTools] = useState<any[]>([]);
  const [globalTools, setGlobalTools] = useState<any[]>([]);
  const [downloadables, setDownloadables] = useState<any[]>([]);

  // Interactive Countdown Timer Modal State
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{
    title: string;
    duration: number; // in seconds
    type: string;
  } | null>(null);

  const categories = ['All Resources', 'Campus Services', 'Self-Care Tools', 'Downloadables'];


  const campusServices = [
    {
      icon: Brain,
      title: 'Academic Tutoring',
      description: 'Free peer and professional tutoring across all majors.',
      contact: 'tutoring@uspf.edu.ph',
      location: 'Building A, 2nd Floor',
      hours: 'Mon-Thu: 2:00-6:00 PM'
    },
    {
      icon: Users,
      title: 'Peer Support Groups',
      description: 'Student-led wellness and support groups.',
      contact: 'peergroup@uspf.edu.ph',
      location: 'Student Center, Room 205',
      hours: 'Weekly sessions scheduled'
    },
    {
      icon: Calendar,
      title: 'Wellness Workshops',
      description: 'Monthly events on stress, sleep, focus & resilience.',
      contact: 'wellness@uspf.edu.ph',
      location: 'Auditorium',
      hours: 'Dates posted monthly'
    },
    {
      icon: MessageCircle,
      title: 'Peer Mentoring',
      description: 'Connect with senior students for guidance.',
      contact: 'mentoring@uspf.edu.ph',
      location: 'Virtual & In-person',
      hours: 'Flexible scheduling'
    },
  ];

  useEffect(() => {
    const fetchToolsAndWorksheets = async () => {
      // 1. Fetch global tools
      try {
        const { data: gData, error: gError } = await supabase
          .from('global_self_care_tools')
          .select('*');
        if (!gError && gData && gData.length > 0) {
          setGlobalTools(gData);
        } else if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('guidance_global_self_care');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setGlobalTools(parsed);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error("Error fetching global tools:", err);
      }

      // 2. Fetch worksheets
      try {
        const { data: wData, error: wError } = await supabase
          .from('worksheets')
          .select('*')
          .order('created_at', { ascending: false });
        if (!wError && wData) {
          setDownloadables(wData);
        }
      } catch (err) {
        console.error("Error fetching worksheets:", err);
      }

      // 3. Fetch student-specific tools
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('self_care_tools')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data?.self_care_tools) {
          setCustomTools(data.self_care_tools || []);
        }
      } catch (err) {
        console.error("Error fetching custom tools:", err);
      }
    };
    fetchToolsAndWorksheets();
  }, [user?.id]);

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'breathing': return Wind;
      case 'journaling': return BookOpen;
      case 'grounding': return Anchor;
      case 'meditation': return Music;
      default: return Heart;
    }
  };

  const getToolStyles = (type: string) => {
    switch (type) {
      case 'breathing': return { bg: 'bg-blue-50', color: 'text-blue-500' };
      case 'journaling': return { bg: 'bg-purple-50', color: 'text-purple-500' };
      case 'grounding': return { bg: 'bg-emerald-50', color: 'text-emerald-500' };
      case 'meditation': return { bg: 'bg-indigo-50', color: 'text-indigo-500' };
      default: return { bg: 'bg-rose-50', color: 'text-rose-500' };
    }
  };

  // Helper to parse duration integer minutes and convert to seconds
  const parseDurationToSeconds = (timeVal: any, durationVal?: any): number => {
    if (typeof durationVal === 'number' && durationVal > 0) {
      return durationVal * 60;
    }
    if (typeof timeVal === 'number' && timeVal > 0) {
      return timeVal * 60;
    }
    if (typeof timeVal === 'string') {
      const num = parseInt(timeVal.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) return num * 60;
    }
    return 10 * 60; // 10 minutes default
  };

  // Handler to launch active counting timer modal
  const handleStartTool = (tool: any) => {
    const seconds = parseDurationToSeconds(tool.time, tool.duration);
    setSelectedTool({
      title: tool.label || 'Mindfulness Exercise',
      duration: seconds,
      type: tool.type || 'breathing',
    });
    setIsTimerOpen(true);
  };

  const rawTools = [
    ...globalTools.map(gt => ({ ...gt, isGlobal: true })),
    ...customTools.map(ct => ({ ...ct, isGlobal: false }))
  ];

  const toolsToRender = rawTools.length > 0 ? rawTools : DEFAULT_SELF_CARE;

  const allSelfCareTools = toolsToRender.map((tool, idx) => {
    const styles = getToolStyles(tool.type);
    return {
      id: tool.id || `tool-${idx}`,
      icon: getToolIcon(tool.type),
      label: tool.label,
      type: tool.type || 'breathing',
      bg: styles.bg,
      color: styles.color,
      time: tool.time,
      duration: tool.duration,
    };
  });

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Campus Resources & Support</h1>
            <p className="text-slate-500 font-medium">Your comprehensive guide to wellness, academic support, and emergency resources.</p>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <Button 
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-6 whitespace-nowrap text-sm font-bold ${
                  activeCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-white border border-slate-200'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>



          {/* Campus Services Directory */}
          {(activeCategory === 'All Resources' || activeCategory === 'Campus Services') && (
            <div className="mb-12">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Campus Support Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campusServices.map((service) => {
                  const IconComponent = service.icon;
                  return (
                    <Card key={service.title} className="border-none shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-lg font-black text-slate-900">{service.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-slate-600 font-medium">{service.description}</p>
                        <div className="space-y-2 pt-3 border-t border-slate-100">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-slate-600 font-bold">{service.location}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <a href={`mailto:${service.contact}`} className="text-xs text-primary font-bold hover:underline">{service.contact}</a>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-slate-600 font-bold">{service.hours}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Self-Care Tools */}
          {(activeCategory === 'All Resources' || activeCategory === 'Self-Care Tools') && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quick Self-Care Tools</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Click &quot;Start&quot; on any protocol to begin a guided countdown session.</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold border-teal-200 text-teal-700 bg-teal-50/60 px-3 py-1">
                  Active Mindfulness Timers
                </Badge>
              </div>

              {allSelfCareTools.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allSelfCareTools.map((tool, idx) => (
                    <Card 
                      key={`${tool.label}-${idx}`}
                      onClick={() => handleStartTool(tool)}
                      className="border-none shadow-md hover:shadow-xl transition-all group cursor-pointer hover:-translate-y-1 bg-white"
                    >
                      <CardContent className="p-6">
                        <div className={`h-10 w-10 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                          <tool.icon className="h-5 w-5" />
                        </div>
                        <h4 className="font-black text-sm text-slate-900 mb-1 group-hover:text-primary transition-colors">{tool.label}</h4>
                        <p className="text-xs text-slate-500 font-bold mb-3">
                          {typeof tool.time === 'number' ? `${tool.time} min` : (tool.time || `${tool.duration || 10} min`)}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTool(tool);
                          }}
                          className="text-xs font-black text-primary uppercase flex items-center gap-1 group-hover:gap-2 transition-all"
                        >
                          Start <ChevronRight className="h-3 w-3" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center flex flex-col items-center gap-2 bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                  <Heart className="h-6 w-6 text-slate-200" />
                  <p className="text-xs text-slate-400 italic font-medium">No self-care tools assigned yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Downloadable Resources */}
          {(activeCategory === 'All Resources' || activeCategory === 'Downloadables') && (
            <div className="mb-12">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Downloadable Worksheets & Guides</h2>
              {downloadables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {downloadables.map((resource) => (
                    <Card key={resource.id || resource.title} className="border-none shadow-lg hover:shadow-xl transition-all group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <FileText className="h-6 w-6" />
                          </div>
                          <Badge variant="outline" className="text-xs font-black uppercase tracking-wider border-primary/20 bg-primary/5 text-primary">
                            {resource.category}
                          </Badge>
                        </div>
                        <h3 className="font-black text-sm text-slate-900 mb-2 line-clamp-2">{resource.title}</h3>
                        <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-2">{resource.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-500 mb-4">
                          <span>{resource.pages}</span>
                          <span>{resource.file_size}</span>
                        </div>
                        <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2" asChild>
                          <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" /> Download PDF
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center flex flex-col items-center gap-2 bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
                  <FileText className="h-6 w-6 text-slate-200" />
                  <p className="text-xs text-slate-400 italic font-medium">No downloadable resources uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* CTA Card */}
          <Card className="border-none shadow-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Need Immediate Support?</h3>
                <p className="text-sm text-slate-600 font-medium">If you&apos;re experiencing a crisis, please reach out to the USPF Counseling Center or call the Mental Health Crisis Hotline immediately.</p>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl px-8 py-6 h-auto flex items-center gap-2 shrink-0">
                <Phone className="h-5 w-5" /> Call Now
              </Button>
            </div>
          </Card>
        </main>

        {/* Functional Interactive Exercise Timer Modal */}
        {selectedTool && (
          <BreathingExerciseModal
            isOpen={isTimerOpen}
            onClose={() => {
              setIsTimerOpen(false);
              setSelectedTool(null);
            }}
            duration={selectedTool.duration}
            title={selectedTool.title}
            type={selectedTool.type}
            autoStart={true}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

