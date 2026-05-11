'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { acceptTeamFlowInvite } from '@/lib/teamflow-api';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      // User must be logged in to accept an invite. In a real app, you might want to
      // redirect them to a signup page and pass the token, but for now we'll just redirect to login.
      router.replace(`/login?redirect=/join/${token}`);
      return;
    }

    const processInvite = async () => {
      try {
        await acceptTeamFlowInvite(token);
        // Successfully accepted, go to the dashboard
        router.replace('/');
      } catch (err: any) {
        setError(err.message || 'Failed to accept invitation.');
        setLoading(false);
      }
    };

    processInvite();
  }, [mounted, isAuthenticated, token, router]);

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))] p-8 text-center shadow-2xl">
        {loading && !error ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
            <p className="text-sm font-medium text-[hsl(var(--text))]">Processing your invitation...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
            <p className="text-sm text-[hsl(var(--muted))]">{error}</p>
            <button
              onClick={() => router.replace('/')}
              className="mt-4 rounded-xl bg-[hsl(var(--bg-soft))] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[hsl(var(--border))]"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
