"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertCircle,
  FileText,
  Download,
  MapPin,
  Mail,
  Globe,
  Users,
  Briefcase,
  Brain,
  Calendar
} from 'lucide-react';

export default function StudentResources() {
  const [activeCategory, setActiveCategory] = useState('All Resources');

  const categories = ['All Resources', 'Emergency', 'Campus Services', 'Self-Care Tools', 'Downloadables'];

  const emergencyContacts = [
    {
      title: 'USPF Counseling Center',
      phone: '(02) 555-0123',
      hours: 'Mon-Fri: 8:00 AM - 5:00 PM',
      type: 'Crisis & Counseling',
      icon: Phone,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Mental Health Crisis Hotline',
      phone: '1-800-MENTAL-1',
      hours: '24/7 Available',
      type: 'Emergency Support',
      icon: AlertCircle,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Campus Health Services',
      phone: '(02) 555-0199',
      hours: 'Mon-Fri: 9:00 AM - 6:00 PM',
      type: 'Medical & Wellness',
      icon: Heart,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Student Assistance Program (SAP)',
      phone: '(02) 555-0456',
      hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
      type: 'Academic & Career',
      icon: Briefcase,
      color: 'bg-blue-50 text-blue-600',
    },
  ];

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

  const downloadables = [
    {
      title: 'Exam Anxiety Management Guide',
      description: 'Evidence-based strategies and techniques to reduce exam-related stress.',
      category: 'Stress Management',
      pages: '8 pages',
      fileSize: '2.4 MB'
    },
    {
      title: 'Sleep Hygiene Checklist',
      description: 'Daily routine template to improve sleep quality and academic performance.',
      category: 'Self-Care',
      pages: '4 pages',
      fileSize: '1.1 MB'
    },
    {
      title: 'Cognitive Reframing Worksheet',
      description: 'Interactive tool to challenge negative thoughts and build resilience.',
      category: 'Mental Wellness',
      pages: '6 pages',
      fileSize: '1.8 MB'
    },
    {
      title: 'Time Management & Study Planning',
      description: 'Semester planner and weekly study schedule templates.',
      category: 'Academic',
      pages: '10 pages',
      fileSize: '3.2 MB'
    },
    {
      title: 'Mindfulness & Grounding Techniques',
      description: 'Step-by-step guides for 5, 10, and 15-minute mindfulness practices.',
      category: 'Mindfulness',
      pages: '7 pages',
      fileSize: '2.1 MB'
    },
    {
      title: 'Stress Level Assessment Tool',
      description: 'Self-diagnostic tool to track stress levels and identify triggers.',
      category: 'Assessment',
      pages: '5 pages',
      fileSize: '1.5 MB'
    },
  ];

  const selfCareTools = [
    { icon: Wind, label: 'Box Breathing (4-7-8)', bg: 'bg-blue-50', color: 'text-blue-500', time: '2 min' },
    { icon: BookOpen, label: 'Journaling Prompts', bg: 'bg-purple-50', color: 'text-purple-500', time: '10 min' },
    { icon: Anchor, label: '5-Sense Grounding', bg: 'bg-emerald-50', color: 'text-emerald-500', time: '5 min' },
    { icon: Music, label: 'Guided Meditation', bg: 'bg-indigo-50', color: 'text-indigo-500', time: '15 min' },
  ];

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

          {/* Emergency Contacts - Always Visible */}
          {(activeCategory === 'All Resources' || activeCategory === 'Emergency') && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-2xl font-black text-slate-900">Emergency & Crisis Support</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {emergencyContacts.map((contact) => {
                  const IconComponent = contact.icon;
                  return (
                    <Card key={contact.title} className="border-2 border-slate-100 shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="p-6">
                        <div className={`h-10 w-10 rounded-xl ${contact.color} flex items-center justify-center mb-4`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <h3 className="font-black text-sm text-slate-900 mb-1">{contact.title}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">{contact.type}</p>
                        <div className="space-y-2">
                          <a href={`tel:${contact.phone.replace(/[- ]/g, '')}`} className="text-sm font-black text-primary hover:underline block">
                            📞 {contact.phone}
                          </a>
                          <p className="text-xs text-slate-500 font-bold">{contact.hours}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

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
              <h2 className="text-2xl font-black text-slate-900 mb-6">Quick Self-Care Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selfCareTools.map((tool) => (
                  <Card key={tool.label} className="border-none shadow-md hover:shadow-lg transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className={`h-10 w-10 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center mb-4`}>
                        <tool.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-black text-sm text-slate-900 mb-1">{tool.label}</h4>
                      <p className="text-xs text-slate-500 font-bold mb-3">{tool.time}</p>
                      <button className="text-xs font-black text-primary uppercase flex items-center gap-1 hover:gap-2 transition-all">
                        Start <ChevronRight className="h-3 w-3" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Downloadable Resources */}
          {(activeCategory === 'All Resources' || activeCategory === 'Downloadables') && (
            <div className="mb-12">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Downloadable Worksheets & Guides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {downloadables.map((resource) => (
                  <Card key={resource.title} className="border-none shadow-lg hover:shadow-xl transition-all group">
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
                        <span>{resource.fileSize}</span>
                      </div>
                      <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" /> Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* CTA Card */}
          <Card className="border-none shadow-xl bg-gradient-to-r from-primary/10 to-emerald-500/10 p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Need Immediate Support?</h3>
                <p className="text-sm text-slate-600 font-medium">If you're experiencing a crisis, please reach out to the USPF Counseling Center or call the Mental Health Crisis Hotline immediately.</p>
              </div>
              <Button className="bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl px-8 py-6 h-auto flex items-center gap-2 shrink-0">
                <Phone className="h-5 w-5" /> Call Now
              </Button>
            </div>
          </Card>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

