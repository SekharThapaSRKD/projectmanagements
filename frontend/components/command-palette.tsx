'use client';

import { 
  Search, 
  Command, 
  Layout, 
  SquareKanban, 
  CheckSquare, 
  Users, 
  Settings, 
  Bell, 
  X, 
  MessageSquare, 
  FileText, 
  ChevronRight,
  Globe,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { projects, tasks, documents, messages, setActiveView, setActiveProject, setActiveWorkspace } = useAppStore();
  const { t, setLocale } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filteredItems = useMemo(() => {
    const search = query.toLowerCase().trim();
    
    // Command Processing (e.g. "> language")
    if (search.startsWith('>')) {
      const cmd = search.slice(1).trim();
      if (cmd.startsWith('lang')) {
        return [
          { id: 'l-en', title: 'Switch to English', category: 'Language', icon: Globe, action: () => { setLocale('en'); setIsOpen(false); } },
          { id: 'l-es', title: 'Switch to Spanish (Español)', category: 'Language', icon: Globe, action: () => { setLocale('es'); setIsOpen(false); } },
          { id: 'l-hi', title: 'Switch to Hindi (हिन्दी)', category: 'Language', icon: Globe, action: () => { setLocale('hi'); setIsOpen(false); } },
        ];
      }
    }

    if (!search) return [];
    
    const results = [
      ...projects.filter(p => (p.name || '').toLowerCase().includes(search)).map(p => ({
        id: p.id,
        title: p.name || 'Unnamed Project',
        category: 'Projects',
        icon: Layout,
        action: () => { setActiveProject(p.id); setActiveView('board'); setIsOpen(false); }
      })),
      ...tasks.filter(t => (t.title || '').toLowerCase().includes(search)).map(t => ({
        id: t.id,
        title: t.title || 'Untitled Task',
        category: 'Tasks',
        icon: CheckSquare,
        action: () => { setActiveProject(t.projectId); setActiveView('board'); setIsOpen(false); }
      })),
      ...documents.filter(d => d.title.toLowerCase().includes(search)).map(d => ({
        id: d.id,
        title: d.title,
        category: 'Documents',
        icon: FileText,
        action: () => { setActiveView('docs'); setIsOpen(false); }
      })),
      {
        id: 'nav-dashboard',
        title: t('common.dashboard'),
        category: 'Navigation',
        icon: SquareKanban,
        action: () => { setActiveView('dashboard'); setIsOpen(false); }
      },
      {
        id: 'nav-settings',
        title: t('common.settings'),
        category: 'Navigation',
        icon: Settings,
        action: () => { setActiveView('settings'); setIsOpen(false); }
      }
    ];

    return results.slice(0, 10);
  }, [query, projects, tasks, documents, setActiveProject, setActiveView, setLocale, t]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-[12vh]">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0A0A0A]/90 shadow-[0_32px_128px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
          >
            <div className="flex items-center border-b border-white/5 px-6 py-5">
              <Search className="mr-4 h-5 w-5 text-[hsl(var(--accent))]" />
              <input
                ref={inputRef}
                autoFocus
                onKeyDown={handleKeyDown}
                placeholder="Search projects, tasks, or type '>' for commands..."
                className="flex-1 bg-transparent text-xl font-medium text-white outline-none placeholder:text-white/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/40">
                <span className="text-xs">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {filteredItems.length > 0 ? (
                <div className="p-3">
                  {Array.from(new Set(filteredItems.map(i => i.category))).map(category => (
                    <div key={category} className="mb-4">
                      <p className="mb-2 px-4 text-[9px] font-black uppercase tracking-[0.3em] text-[hsl(var(--muted))] opacity-50">{category}</p>
                      <div className="space-y-1">
                        {filteredItems.filter(i => i.category === category).map((item, idx) => {
                          const globalIdx = filteredItems.indexOf(item);
                          const isSelected = globalIdx === selectedIndex;
                          
                          return (
                            <button
                              key={item.id}
                              onClick={item.action}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={cn(
                                "group relative flex w-full items-center gap-4 rounded-[20px] px-4 py-3.5 text-left transition-all duration-200",
                                isSelected ? "bg-white/10 translate-x-1" : "hover:bg-white/5"
                              )}
                            >
                              <div className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-[14px] transition-all duration-300",
                                isSelected ? "bg-white text-black scale-110" : "bg-white/5 text-white/40"
                              )}>
                                <item.icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className={cn(
                                  "truncate text-sm font-bold transition-colors",
                                  isSelected ? "text-white" : "text-white/70"
                                )}>{item.title}</p>
                                {isSelected && (
                                  <p className="text-[10px] font-medium text-[hsl(var(--accent))] animate-in fade-in slide-in-from-left-2">
                                    Press Enter to activate
                                  </p>
                                )}
                              </div>
                              {isSelected && <ArrowRight className="h-4 w-4 text-[hsl(var(--accent))] animate-pulse" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : query ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-white/20">
                    <Zap className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">No signals found</h3>
                  <p className="mt-2 text-sm text-[hsl(var(--muted))]">The entity "{query}" does not exist in the current stream.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
                  {[
                    { label: 'Create New Task', cmd: '⌘T', icon: CheckSquare },
                    { label: 'Switch Language', cmd: '> lang', icon: Globe },
                    { label: 'System Settings', cmd: '⌘S', icon: Settings },
                    { label: 'View Alerts', cmd: '⌘N', icon: Bell },
                  ].map((hint) => (
                    <div key={hint.label} className="group flex items-center justify-between rounded-[24px] border border-white/5 bg-white/[0.02] p-5 transition-all hover:bg-white/5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/40 group-hover:text-white transition-colors">
                           <hint.icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-white/60">{hint.label}</span>
                      </div>
                      <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">{hint.cmd}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] px-6 py-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  <span className="rounded border border-white/10 px-1 py-0.5">↑↓</span>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                  <span className="rounded border border-white/10 px-1 py-0.5">ENTER</span>
                  <span>Activate</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))]">
                <Command className="h-3.5 w-3.5" />
                <span>Console active</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
