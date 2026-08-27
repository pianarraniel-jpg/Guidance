"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Trash2, Heart, FileText, Wind, BookOpen, Anchor, Music, Brain, Plus, Download, Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function AdminResources() {
  const { toast } = useToast();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('self-care');

  // Self-Care States
  const [globalSelfCare, setGlobalSelfCare] = useState<any[]>([]);
  const [newToolLabel, setNewToolLabel] = useState('');
  const [newToolTime, setNewToolTime] = useState('');
  const [newToolType, setNewToolType] = useState('wellness');
  const [isAddingTool, setIsAddingTool] = useState(false);

  // Worksheets States
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [wsTitle, setWsTitle] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsCategory, setWsCategory] = useState('Self-Care');
  const [wsPages, setWsPages] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAddingWs, setIsAddingWs] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      // Fetch global self care tools
      const { data: gData, error: gError } = await supabase
        .from('global_self_care_tools')
        .select('*')
        .order('created_at', { ascending: false });
      if (!gError && gData) setGlobalSelfCare(gData);

      // Fetch worksheets
      const { data: wData, error: wError } = await supabase
        .from('worksheets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!wError && wData) setWorksheets(wData);
    } catch (err) {
      console.error("Error fetching admin resources data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Self-Care Tool Actions
  const handleAddSelfCare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToolLabel || !newToolTime) return;
    setIsAddingTool(true);
    const newTool = {
      label: newToolLabel.trim(),
      time: newToolTime.trim(),
      type: newToolType
    };

    try {
      const { data, error } = await supabase
        .from('global_self_care_tools')
        .insert(newTool)
        .select()
        .single();

      if (error) throw error;

      setGlobalSelfCare(prev => [data, ...prev]);
      setNewToolLabel('');
      setNewToolTime('');
      toast({ title: 'Success', description: `Added global self-care tool "${newTool.label}".` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create self-care tool.' });
    } finally {
      setIsAddingTool(false);
    }
  };

  const handleRemoveSelfCare = async (id: string) => {
    try {
      const { error } = await supabase
        .from('global_self_care_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGlobalSelfCare(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Success', description: 'Removed self-care tool.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove self-care tool.' });
    }
  };

  // Worksheet Actions
  const handleAddWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsTitle || !wsDesc || !file) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields and select a file.' });
      return;
    }
    setIsAddingWs(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `worksheets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('worksheets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('worksheets')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      const formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const pageCount = wsPages.trim() || '1 page';

      const { data: wsRecord, error: dbError } = await supabase
        .from('worksheets')
        .insert({
          title: wsTitle.trim(),
          description: wsDesc.trim(),
          category: wsCategory,
          pages: pageCount,
          file_size: formattedSize,
          file_url: fileUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setWorksheets(prev => [wsRecord, ...prev]);
      setWsTitle('');
      setWsDesc('');
      setWsPages('');
      setFile(null);
      const fileInput = document.getElementById('ws-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast({ title: 'Success', description: `Worksheet "${wsRecord.title}" uploaded successfully.` });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload worksheet.' });
    } finally {
      setIsAddingWs(false);
    }
  };

  const handleRemoveWorksheet = async (id: string, fileUrl: string) => {
    try {
      // 1. Delete DB record
      const { error: dbError } = await supabase
        .from('worksheets')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Delete file from storage (extract file path from URL)
      try {
        const urlParts = fileUrl.split('/storage/v1/object/public/worksheets/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage
            .from('worksheets')
            .remove([filePath]);
        }
      } catch (storageErr) {
        console.error("Storage delete warning:", storageErr);
      }

      setWorksheets(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Success', description: 'Worksheet deleted.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete worksheet.' });
    }
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'breathing': return Wind;
      case 'journaling': return BookOpen;
      case 'grounding': return Anchor;
      case 'meditation': return Music;
      default: return Heart;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Resources Management</h1>
            <p className="text-slate-500 font-medium">Manage student self-care items and worksheet downloadable guides.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
              <TabsTrigger value="self-care" className="rounded-xl px-5 py-2.5 font-bold text-xs">
                <Heart className="h-4 w-4 mr-2" /> Global Self-Care Tools
              </TabsTrigger>
              <TabsTrigger value="worksheets" className="rounded-xl px-5 py-2.5 font-bold text-xs">
                <FileText className="h-4 w-4 mr-2" /> Downloadable Worksheets
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Global Self-Care Tools */}
            <TabsContent value="self-care" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Active Global Self-Care Tools
                </h2>
                
                {globalSelfCare.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {globalSelfCare.map((tool) => {
                      const IconComponent = getToolIcon(tool.type);
                      return (
                        <Card key={tool.id} className="border-none shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-900">{tool.label}</h4>
                                <p className="text-[10px] text-slate-400 font-bold capitalize">{tool.time} • {tool.type}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSelfCare(tool.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Heart className="h-8 w-8 opacity-40" />
                      <p className="text-xs font-bold italic">No global self-care tools defined yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Form Card */}
              <div>
                <Card className="border-slate-100 shadow-xl rounded-[2rem] overflow-hidden sticky top-24">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-black text-slate-900">Add New Global Tool</h3>
                    <form onSubmit={handleAddSelfCare} className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Tool Name</Label>
                        <Input
                          placeholder="e.g. Guided Muscle Relaxation"
                          value={newToolLabel}
                          onChange={e => setNewToolLabel(e.target.value)}
                          className="h-10 text-xs bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Duration</Label>
                        <Input
                          placeholder="e.g. 5 min"
                          value={newToolTime}
                          onChange={e => setNewToolTime(e.target.value)}
                          className="h-10 text-xs bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Category</Label>
                        <Select value={newToolType} onValueChange={setNewToolType}>
                          <SelectTrigger className="h-10 text-xs bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="breathing">Breathing</SelectItem>
                            <SelectItem value="journaling">Journaling</SelectItem>
                            <SelectItem value="grounding">Grounding</SelectItem>
                            <SelectItem value="meditation">Meditation</SelectItem>
                            <SelectItem value="wellness">Other / General Wellness</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="submit"
                        disabled={isAddingTool || !newToolLabel || !newToolTime}
                        className="w-full h-10 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Global Tool
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 2: Downloadable Worksheets */}
            <TabsContent value="worksheets" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Active Downloadable Guides
                </h2>

                {worksheets.length > 0 ? (
                  <div className="space-y-3">
                    {worksheets.map((ws) => (
                      <Card key={ws.id} className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 truncate">{ws.title}</h4>
                              <p className="text-xs text-slate-500 font-medium mb-1 line-clamp-1">{ws.description}</p>
                              <div className="flex gap-3 text-[10px] text-slate-400 font-bold">
                                <span className="text-primary">{ws.category}</span>
                                <span>•</span>
                                <span>{ws.pages}</span>
                                <span>•</span>
                                <span>{ws.file_size}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl"
                            >
                              <a href={ws.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveWorksheet(ws.id, ws.file_url)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="h-8 w-8 opacity-40" />
                      <p className="text-xs font-bold italic">No downloadable worksheets uploaded yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Upload Card */}
              <div>
                <Card className="border-slate-100 shadow-xl rounded-[2rem] overflow-hidden sticky top-24">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-black text-slate-900">Upload Worksheet</h3>
                    <form onSubmit={handleAddWorksheet} className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Worksheet Title</Label>
                        <Input
                          placeholder="e.g. Cognitive Reframing Guide"
                          value={wsTitle}
                          onChange={e => setWsTitle(e.target.value)}
                          className="h-10 text-xs bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Description</Label>
                        <Input
                          placeholder="Short description of pages content..."
                          value={wsDesc}
                          onChange={e => setWsDesc(e.target.value)}
                          className="h-10 text-xs bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black text-slate-400 uppercase">Category</Label>
                          <Input
                            placeholder="e.g. Academic"
                            value={wsCategory}
                            onChange={e => setWsCategory(e.target.value)}
                            className="h-10 text-xs bg-slate-50 border-slate-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black text-slate-400 uppercase">Pages</Label>
                          <Input
                            placeholder="e.g. 5 pages"
                            value={wsPages}
                            onChange={e => setWsPages(e.target.value)}
                            className="h-10 text-xs bg-slate-50 border-slate-200"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-400 uppercase">Select File (PDF)</Label>
                        <Input
                          id="ws-file"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={e => setFile(e.target.files?.[0] || null)}
                          className="h-10 text-xs bg-slate-50 border-slate-200 cursor-pointer pt-2"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isAddingWs || !wsTitle || !wsDesc || !file}
                        className="w-full h-10 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Upload Worksheet
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
