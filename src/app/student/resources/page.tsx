"use client";

import React, { useState } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wind, 
  BookOpen, 
  Anchor, 
  Music, 
  ChevronRight, 
  Phone, 
  MessageCircle, 
  Clock, 
  Heart
} from 'lucide-react';
import Image from 'next/image';

export default function StudentResources() {
  const [activeCategory, setActiveCategory] = useState('All Resources');

  const categories = ['All Resources', 'Stress Management', 'Daily Tips', 'Mindfulness', 'Personal Growth'];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <DashboardLayout>
        <main className="p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-4xl font-bold font-headline text-[#1E293B] mb-2">Resources & Self-Care</h1>
            <p className="text-muted-foreground">Tools and guides to help you navigate your university journey.</p>
          </div>

          <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <Button 
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-6 whitespace-nowrap text-sm font-bold ${
                  activeCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-white border'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
            <Card className="lg:col-span-8 border-none shadow-md overflow-hidden relative min-h-[320px] group">
              <Image 
                src="https://picsum.photos/seed/study77/1200/600"
                alt="Managing Midterm Anxiety"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                data-ai-hint="desk lamp"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full max-w-xl text-white">
                <Badge className="bg-[#F4AF25] text-black font-black uppercase text-[10px] mb-4 border-none px-3">Featured Guide</Badge>
                <h2 className="text-3xl font-black mb-3 leading-tight">Managing Midterm Anxiety</h2>
                <Button className="bg-white text-black hover:bg-white/90 font-black rounded-xl px-8 py-6 shadow-xl mt-4">
                  Read Guide
                </Button>
              </div>
            </Card>

            <div className="lg:col-span-4 flex flex-col gap-4">
              <Card className="flex-1 bg-[#8B5CF6] border-none text-white p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <Heart className="h-10 w-10 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Quick Mood Check</h3>
                  <Button variant="secondary" className="bg-white text-[#8B5CF6] w-full rounded-xl mt-4">Start Now</Button>
                </div>
              </Card>
              <Card className="flex-1 bg-[#F97316] border-none text-white p-6 relative overflow-hidden">
                <div className="relative z-10">
                  <MessageCircle className="h-10 w-10 mb-4" />
                  <h3 className="font-bold text-lg mb-2">Talk to Guidi</h3>
                  <Button variant="secondary" className="bg-white text-[#F97316] w-full rounded-xl mt-4">Open Chat</Button>
                </div>
              </Card>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xl font-bold text-[#1E293B] mb-6">Interactive Toolkit</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Wind, label: 'Box Breathing', bg: 'bg-blue-50', color: 'text-blue-500' },
                { icon: BookOpen, label: 'Journaling', bg: 'bg-purple-50', color: 'text-purple-500' },
                { icon: Anchor, label: '5-Min Grounding', bg: 'bg-emerald-50', color: 'text-emerald-500' },
                { icon: Music, label: 'Deep Calm', bg: 'bg-indigo-50', color: 'text-indigo-500' },
              ].map((tool) => (
                <Card key={tool.label} className="border-none shadow-sm hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-6">
                    <div className={`h-10 w-10 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center mb-4`}>
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <h4 className="font-bold text-sm mb-2">{tool.label}</h4>
                    <button className="text-[11px] font-black text-primary uppercase flex items-center gap-1">
                      Start <ChevronRight className="h-3 w-3" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
