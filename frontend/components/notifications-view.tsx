'use client';

import { Bell, Check, Trash2, X, Circle, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';

export function NotificationsView() {
  const { notifications, markNotificationRead, clearNotifications } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === 'all' || !n.read;
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                          n.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-[hsl(var(--muted))]">Stay updated with your latest team activity.</p>
        </div>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-[hsl(var(--muted))] transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex rounded-xl bg-white/5 p-1 shadow-inner ring-1 ring-white/5">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${filter === 'all' ? 'bg-[hsl(var(--accent))] text-black shadow-lg' : 'text-[hsl(var(--muted))] hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`relative rounded-lg px-4 py-1.5 text-sm font-bold transition ${filter === 'unread' ? 'bg-[hsl(var(--accent))] text-black shadow-lg' : 'text-[hsl(var(--muted))] hover:text-white'}`}
              >
                Unread
                {unreadCount > 0 && filter !== 'unread' && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[hsl(var(--accent))] ring-2 ring-[#121212]" />
                )}
              </button>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-[hsl(var(--muted))] transition focus:border-[hsl(var(--accent))] focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="glass-panel soft-border overflow-hidden rounded-[32px]">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/5 text-[hsl(var(--muted))]">
                  <Bell className="h-8 w-8 opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-white">No notifications found</h3>
                <p className="text-[hsl(var(--muted))] mt-2 max-w-xs mx-auto">
                  {search ? "We couldn't find anything matching your search." : "You're all caught up! New updates will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`group relative flex gap-4 p-6 transition hover:bg-white/5 ${!notif.read ? 'bg-[hsl(var(--accent)/0.02)]' : ''}`}
                  >
                    <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      notif.type === 'task_assigned' ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' :
                      notif.type === 'mention' ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] shadow-lg shadow-[hsl(var(--accent)/0.1)]' :
                      'bg-white/10 text-white shadow-lg shadow-black/20'
                    }`}>
                      {notif.read ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5 animate-pulse" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className={`text-base transition-colors ${notif.read ? 'text-[hsl(var(--muted))]' : 'font-bold text-white'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-xs font-medium text-[hsl(var(--muted))] whitespace-nowrap">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm leading-relaxed ${notif.read ? 'text-[hsl(var(--muted))]' : 'text-white/80'}`}>
                        {notif.message}
                      </p>
                      
                      {!notif.read && (
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            className="rounded-lg bg-[hsl(var(--accent))] px-3 py-1 text-xs font-bold text-black transition hover:opacity-90"
                          >
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <div className="glass-panel soft-border rounded-[32px] p-6 bg-gradient-to-br from-[hsl(var(--accent)/0.1)] to-transparent">
            <h3 className="text-lg font-bold text-white">Activity Overview</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted))]">Total</span>
                <span className="text-sm font-bold text-white">{notifications.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted))]">Unread</span>
                <span className="text-sm font-bold text-[hsl(var(--accent))]">{unreadCount}</span>
              </div>
              <div className="h-px bg-white/10" />
              <p className="text-xs leading-relaxed text-[hsl(var(--muted))] italic">
                Tip: Use browser push notifications to get alerted even when TeamFlow is in the background.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
