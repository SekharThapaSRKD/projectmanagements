'use client';

import { Mail, Check, UserPlus, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { inviteUserToTeamFlow } from '@/lib/teamflow-api';

type InviteDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
};

export function InviteDialog({ isOpen, onClose, projectId }: InviteDialogProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !project) return;

    setLoading(true);
    setError(null);
    try {
      await inviteUserToTeamFlow(project.workspaceId, normalizedEmail, 'developer', project.id);
      setSuccess(true);
      setEmail('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))] p-8 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-6 top-6 text-[hsl(var(--muted))] hover:text-white transition">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]">
          <UserPlus className="h-7 w-7" />
        </div>

        <h2 className="text-2xl font-bold text-white">Invite to {project?.name || 'Project'}</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">Invite team members via email to collaborate on this project.</p>

        <form onSubmit={handleInvite} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Email Address</label>
            <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-2 pl-4">
              <Mail className="h-4 w-4 text-[hsl(var(--muted))]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
              <button 
                type="submit"
                disabled={loading || !email}
                className={`flex h-10 px-4 shrink-0 items-center justify-center rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${success ? 'bg-emerald-500 text-white' : 'bg-[hsl(var(--accent))] text-black hover:opacity-90'}`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : 'Invite'}
              </button>
            </div>
            {error && <p className="text-xs text-[hsl(var(--danger))] mt-1 ml-1">{error}</p>}
            {success && <p className="text-xs text-emerald-500 mt-1 ml-1">Invitation sent successfully!</p>}
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.5] p-4">
            <p className="text-xs text-[hsl(var(--muted))] leading-relaxed">
              <span className="font-bold text-white">Note:</span> They will receive an email with a secure link to join as a developer. They will only see this specific project.
            </p>
          </div>
        </form>

        <button 
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-[hsl(var(--bg-soft))] py-4 font-bold text-white transition hover:bg-[hsl(var(--border))]"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}
