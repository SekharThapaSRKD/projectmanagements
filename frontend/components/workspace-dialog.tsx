'use client';

import { X, Zap, Crown, Rocket, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { motion, AnimatePresence } from 'framer-motion';

type WorkspaceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function WorkspaceDialog({ isOpen, onClose }: WorkspaceDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addWorkspace, workspaces, members, addMember, addNotification, setActiveAdminTab } = useAppStore();
  const { user } = useAuthStore();

  // Count ONLY the workspaces owned by the current user (Demo workspaces won't have ownerId set)
  // This should be: 0 workspaces initially, 1 after creating first, 2 after creating second
  const ownedWorkspacesCount = user?.id 
    ? workspaces.filter(w => w.ownerId === user.id).length 
    : 0;
  
  // Free plan allows creating exactly 2 workspaces
  // isLimitReached = true means user has already created 2 and cannot create a 3rd
  // isLimitReached = false means user can still create (has 0 or 1)
  const isFreeUser = user?.subscriptionTier === 'free' || (user && !user.subscriptionTier);
  const isLimitReached = isFreeUser && ownedWorkspacesCount >= 2;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!user) {
      setError('You must be logged in to create a workspace');
      return;
    }

    // Check if workspace limit is reached for free plan
    if (isLimitReached) {
      setError('Workspace limit reached for free plan');
      addNotification({
        type: 'system',
        title: 'Upgrade Required',
        message: `You have reached the limit for the free plan (${ownedWorkspacesCount}/1). Upgrade to Premium to create more workspaces.`
      });
      // Optionally open the billing page
      setTimeout(() => {
        setActiveAdminTab('billing');
        onClose();
      }, 500);
      return;
    }

    const userEmail = user.email?.toLowerCase();
    let memberId = user.memberId || members.find((m) => m.email?.toLowerCase() === userEmail)?.id;
    
    if (!memberId) {
      memberId = addMember({
        name: user.name,
        email: user.email,
        role: user.role
      });
    }

    setIsSubmitting(true);

    try {
      await addWorkspace({
        name: name.trim(),
        description: description.trim(),
        memberIds: [memberId]
      });

      addNotification({
        type: 'system',
        title: 'Workspace Created',
        message: `You successfully created the "${name.trim()}" workspace.`
      });

      // Reset form and close
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create workspace';
      setError(errorMsg);

      if (errorMsg.toLowerCase().includes('limit reached')) {
        addNotification({
          type: 'system',
          title: 'Upgrade Required',
          message: 'You have reached the limit for the free plan. Upgrade to Premium to create more workspaces.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
      <div className="glass-panel soft-border w-full max-w-md rounded-[24px] p-5 sm:rounded-3xl sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Workspace</h2>
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
          {isLimitReached ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-5 text-center shadow-xl sm:p-6"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl" />
              
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                <Crown className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="mb-2 text-lg font-bold text-white">Unlock Unlimited Workspaces</h3>
              <p className="mb-2 text-sm text-blue-100/70">
                You've reached the limit for the Free plan. You currently have <span className="font-semibold text-white">{ownedWorkspacesCount}/1</span> workspaces.
              </p>
              <p className="mb-6 text-sm text-blue-100/70">
                Upgrade to Premium for unlimited growth and advanced collaboration tools.
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
              
              <h3 className="mb-2 text-lg font-bold text-white">Unlock Unlimited Workspaces</h3>
              <p className="mb-6 text-sm text-blue-100/70">
                You've reached the limit for the Free plan. Upgrade to Premium for unlimited growth and advanced collaboration tools.
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
                <label htmlFor="workspaceName" className="block text-sm font-medium text-white">
                  Workspace Name
                </label>
                <input
                  id="workspaceName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="workspaceDescription" className="block text-sm font-medium text-white">
                  Description (optional)
                </label>
                <textarea
                  id="workspaceDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this workspace for?"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
                  disabled={isSubmitting}
                />
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
