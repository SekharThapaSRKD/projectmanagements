'use client';

import { Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { notificationService } from '@/lib/notification-service';

export function NotificationCenter() {
  const { notifications, setActiveView, activeView } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = () => {
    setActiveView('notifications');
    // Ensure browser notification permission is requested if they haven't been
    notificationService.requestPermission();
  };

  const isActive = activeView === 'notifications';

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 ${isActive ? 'ring-2 ring-[hsl(var(--accent))] border-transparent bg-[hsl(var(--accent)/0.1)]' : ''}`}
        aria-label="View notifications"
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-[hsl(var(--accent))] animate-pulse' : 'text-[hsl(var(--muted))]'} ${isActive ? 'text-[hsl(var(--accent))]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[10px] font-bold text-black ring-2 ring-[#121212]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
