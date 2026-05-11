'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';

type JoinProjectDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function JoinProjectDialog({ isOpen, onClose }: JoinProjectDialogProps) {
  const [projectKey, setProjectKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { joinProject, members, addMember } = useAppStore();
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectKey.trim()) {
      setError('Project key is required');
      return;
    }

    if (!user) {
      setError('You must be logged in');
      return;
    }

    const currentMember = members.find((m) => m.email.toLowerCase() === user.email.toLowerCase());
    let memberId = currentMember?.id;

    if (!memberId) {
      memberId = addMember({
        name: user.name,
        email: user.email,
        role: user.role
      });
    }

    setIsSubmitting(true);

    try {
      joinProject(projectKey.trim(), memberId);

      // Reset form and close
      setProjectKey('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-panel soft-border w-full max-w-md rounded-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Join Project</h2>
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
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="projectKey" className="block text-sm font-medium text-white">
              Project Key
            </label>
            <input
              id="projectKey"
              type="text"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g., LP or SC"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/20"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-[hsl(var(--muted))]">
              Enter the short project key (e.g. LP for Launchpad)
            </p>
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
              {isSubmitting ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
