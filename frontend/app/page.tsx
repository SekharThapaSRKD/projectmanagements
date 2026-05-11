'use client';

import { AppShell } from '@/components/app-shell';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, mounted, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/5 px-6 py-4 text-sm text-[hsl(var(--muted))]">
          Loading TeamFlow workspace...
        </div>
      </div>
    );
  }

  return <AppShell />;
}