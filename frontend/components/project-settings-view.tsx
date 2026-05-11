'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { 
  Settings, 
  Trash2, 
  ShieldAlert, 
  Save, 
  Globe, 
  Lock, 
  Layout, 
  Users, 
  Layers,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import type { ProjectType } from '@/lib/types';

export function ProjectSettingsView() {
  const { 
    projects, 
    activeProjectId, 
    updateProject, 
    deleteProject, 
    setActiveView,
    addNotification
  } = useAppStore();
  
  const project = projects.find(p => p.id === activeProjectId);
  
  const [name, setName] = useState(project?.name || '');
  const [key, setKey] = useState(project?.key || '');
  const [description, setDescription] = useState(project?.description || '');
  const [type, setType] = useState<ProjectType>(project?.type || 'kanban');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setKey(project.key);
      setDescription(project.description || '');
      setType(project.type);
    }
  }, [project]);

  if (!project) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-[32px] border border-dashed border-white/10 bg-white/5">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-sm text-[hsl(var(--muted))]">No project selected.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name.trim() || !key.trim()) {
      addNotification({
        type: 'system',
        title: 'Validation Error',
        message: 'Name and Key are required fields.'
      });
      return;
    }

    setIsSaving(true);
    try {
      updateProject(project.id, {
        name,
        key: key.toUpperCase(),
        description,
        type
      });
      
      addNotification({
        type: 'system',
        title: 'Project Updated',
        message: `Successfully saved settings for ${name}.`
      });
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Update Failed',
        message: 'There was an error saving project settings.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    deleteProject(project.id);
    setActiveView('dashboard');
    addNotification({
      type: 'system',
      title: 'Project Terminated',
      message: `${project.name} has been moved to workspace history.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
            <Settings className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Settings</p>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveView('board')}
            className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/5 active:scale-95"
          >
            Back to Board
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-8 py-3 text-sm font-bold text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Basic Details */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
              <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" />
              Basic Details
            </h2>
            
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Project Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all"
                    placeholder="e.g. Website Redesign"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Project Key</label>
                  <input
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase().slice(0, 5))}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all"
                    placeholder="e.g. WEB"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[hsl(var(--muted))] px-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all"
                  placeholder="What is this project about?"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
              <Layout className="h-5 w-5 text-[hsl(var(--accent))]" />
              Project Framework
            </h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { id: 'kanban', title: 'Kanban', desc: 'Continuous flow with visual stages', icon: Layout },
                { id: 'scrum', title: 'Scrum', desc: 'Fixed-length iterations (Sprints)', icon: Layers }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setType(opt.id as ProjectType)}
                  className={cn(
                    "flex items-start gap-4 rounded-[24px] border p-5 text-left transition-all duration-300",
                    type === opt.id 
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.05)] ring-1 ring-[hsl(var(--accent)/0.3)] shadow-lg shadow-[hsl(var(--accent)/0.05)]" 
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300",
                    type === opt.id ? "bg-[hsl(var(--accent))] text-black" : "bg-white/5 text-white/40"
                  )}>
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm", type === opt.id ? "text-white" : "text-white/70")}>{opt.title}</p>
                    <p className="text-[11px] text-[hsl(var(--muted))] mt-1">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[hsl(var(--muted))]">Project Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-3 text-[hsl(var(--muted))]">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Team Size</span>
                </div>
                <span className="text-lg font-bold text-white">{project.memberIds?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                <div className="flex items-center gap-3 text-[hsl(var(--muted))]">
                  <Layout className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Active Sprint</span>
                </div>
                <span className="text-xs font-bold text-[hsl(var(--accent))]">LIVE</span>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-red-500/20 bg-red-500/5 p-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-400">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </h3>
            <p className="text-xs text-red-200/50 leading-relaxed mb-6">
              Once you delete a project, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 px-6 py-4 text-xs font-black uppercase tracking-widest text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              Delete Project
            </button>
          </section>
        </div>
      </div>

      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Terminate Project Node?"
        description={`Are you sure you want to move ${project.name} to the workspace history? You can restore it later from the Trash tab.`}
        confirmLabel="Deactivate Node"
      />
    </div>
  );
}
