'use client';

import { X, Crown, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { motion } from 'framer-motion';
import type { ProjectType } from '@/lib/types';
import { TIER_LIMITS } from '@/lib/types';

type ProjectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProjectDialog({ isOpen, onClose }: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('kanban');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addProject, activeWorkspaceId, projects, workspaces, addNotification, setActiveAdminTab } = useAppStore();
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const targetWorkspaceId = activeWorkspaceId || workspaces[0]?.id;
  const workspaceProjects = targetWorkspaceId 
    ? projects.filter(p => p.workspaceId === targetWorkspaceId) 
    : [];
  
  const isFreeUser = user?.subscriptionTier === 'free' || (user && !user.subscriptionTier);
  const limit = isFreeUser ? TIER_LIMITS.free.projectsPerWorkspace : (TIER_LIMITS[user?.subscriptionTier || 'pro']?.projectsPerWorkspace || 50);
  const isProjectLimitReached = isFreeUser && workspaceProjects.length >= limit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!targetWorkspaceId) {
      setError('No active workspace selected or found');
      return;
    }

    // Check project limit
    if (isProjectLimitReached) {
      setError('Project limit reached for free plan');
      addNotification({
        type: 'system',
        title: 'Upgrade Required',
        message: `You have reached the project limit for this workspace (${workspaceProjects.length}/${limit}). Upgrade to Premium to create more projects.`
      });
      setTimeout(() => {
        setActiveAdminTab('billing');
        onClose();
      }, 500);
      return;
    }

    setIsSubmitting(true);

    try {
      addProject({
        name: name.trim(),
        description: description.trim(),
        type,
        workspaceId: targetWorkspaceId,
        memberIds: []
      });

      addNotification({
        type: 'system',
        title: 'Project Created',
        message: `Project "${name.trim()}" created successfully.`
      });

      // Reset form and close
      setName('');
      setDescription('');
      setType('kanban');
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMsg);

      if (errorMsg.toLowerCase().includes('limit reached')) {
        addNotification({
          type: 'system',
          title: 'Upgrade Required',
          message: 'You have reached the project limit for this workspace. Upgrade to Premium to create more projects.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-panel soft-border w-full max-w-md rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg text-[hsl(var(--muted))] transition hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isProjectLimitReached ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 text-center shadow-xl"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
              
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                <Crown className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-white">Unlock More Projects</h3>
              <p className="mb-2 text-sm text-blue-100/70">
                You've reached the limit for the Free plan. You currently have <span className="font-semibold text-white">{workspaceProjects.length}/{limit}</span> projects in this workspace.
              </p>
              <p className="mb-6 text-sm text-blue-100/70">
                Upgrade to Premium for unlimited projects and advanced collaboration tools.
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  setActiveAdminTab('billing');
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-600 shadow-lg transition hover:bg-blue-50 active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                Upgrade to Premium
              </button>
              
              <button 
                type="button"
                onClick={onClose}
                className="mt-3 text-xs font-medium text-blue-200/50 hover:text-white"
              >
                Maybe later
              </button>
            </motion.div>
          ) : error && error.toLowerCase().includes('limit reached') ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6 text-center shadow-xl"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
              
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                <Crown className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-white">Unlock More Projects</h3>
              <p className="mb-6 text-sm text-blue-100/70">
                You've reached the project limit for the Free plan. Upgrade to Premium for unlimited projects.
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  setActiveAdminTab('billing');
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-600 shadow-lg transition hover:bg-blue-50 active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                Upgrade to Premium
              </button>
              
              <button 
                type="button"
                onClick={onClose}
                className="mt-3 text-xs font-medium text-blue-200/50 hover:text-white"
              >
                Maybe later
              </button>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white">
                  Project Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Website Redesign"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add project details..."
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-white">
                  Project Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={e => setType(e.target.value as ProjectType)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
                  disabled={isSubmitting}
                >
                  <option value="kanban">Kanban</option>
                  <option value="scrum">Scrum</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
