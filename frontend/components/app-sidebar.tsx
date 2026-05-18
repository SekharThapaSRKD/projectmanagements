'use client';

import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, MessageSquareText, MoonStar, PanelLeft, Settings2, SquareKanban, SunMedium, Home, Plus, Users2, Shield, ShoppingBag, Crown, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/hooks/use-translation';
import { ROLE_PERMISSIONS, type ViewType } from '@/lib/types';
import { cn } from '@/lib/utils';

type AppSidebarProps = {
  onCreateTask: () => void;
  onCreateProject: () => void;
  onCreateBoard: () => void;
  onCreateWorkspace: () => void;
  onNavClick?: () => void;
};

export function AppSidebar({ onCreateTask, onCreateProject, onCreateBoard, onCreateWorkspace, onNavClick }: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [workspacesExpanded, setWorkspacesExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const apply = () => setIsMobile(window.innerWidth < 768);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  
  const viewLabels: Array<{ view: ViewType; label: string; icon: typeof Home }> = [
    { view: 'dashboard', label: t('common.dashboard'), icon: Home },
    { view: 'board', label: t('common.projects'), icon: SquareKanban },
    { view: 'backlog', label: 'Backlog', icon: LayoutGrid },
    { view: 'meetings', label: 'Meetings', icon: CalendarDays },
    { view: 'chat', label: 'Chat', icon: MessageSquareText },
    { view: 'analytics', label: 'Analytics', icon: LayoutGrid },
    { view: 'docs', label: 'Docs', icon: Settings2 },
    { view: 'admin', label: t('common.admin'), icon: Shield }
  ];
  const {
    workspaces,
    projects,
    members,
    activeWorkspaceId,
    activeProjectId,
    activeView,
    sidebarOpen,
    setActiveWorkspace,
    setActiveProject,
    setActiveView,
    setActiveAdminTab,
    toggleSidebar
  } = useAppStore();
  const user = useAuthStore(state => state.user);

  const activeWorkspace = workspaces.find(workspace => workspace.id === activeWorkspaceId) ?? workspaces[0];
  const workspaceProjects = useMemo(() => projects.filter(project => project.workspaceId === activeWorkspaceId && !project.isDeleted), [activeWorkspaceId, projects]);

  const canManageProjects = user ? ROLE_PERMISSIONS[user.role].canManageProjects : false;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? '100%' : (sidebarOpen ? 292 : 84) }}
      className="glass-panel soft-border flex h-[100dvh] flex-col rounded-none p-3 shadow-2xl shadow-black/20 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:rounded-[32px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-2 pb-4 pt-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.6)] text-black shadow-lg shadow-[hsl(var(--accent)/0.2)]">
            <SquareKanban className="h-5 w-5" />
          </div>
          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[hsl(var(--muted))]">Platform</p>
                <h1 className="text-xl font-bold text-[hsl(var(--text))]">TeamFlow</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-[hsl(var(--muted))] transition hover:border-[hsl(var(--accent))/0.3] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-1 custom-scrollbar">
        {/* Workspace Context Switcher */}
        {sidebarOpen ? (
          <div className="space-y-2">
            <div
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 transition-all hover:border-[hsl(var(--accent))/0.3] ${workspacesExpanded ? 'ring-1 ring-[hsl(var(--accent))/0.3]' : ''}`}
            >
              <button
                onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[hsl(var(--accent))] shadow-inner">
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted))]">Active Workspace</p>
                  <p className="truncate text-sm font-bold text-[hsl(var(--text))]">{activeWorkspace?.name}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-[hsl(var(--muted))] transition-transform duration-300 ${workspacesExpanded ? 'rotate-180 text-[hsl(var(--text))]' : ''}`} />
              </button>

              <AnimatePresence>
                {workspacesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 space-y-1 border-t border-white/5 pt-3"
                  >
                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setActiveWorkspace(ws.id);
                          setWorkspacesExpanded(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition ${activeWorkspaceId === ws.id ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted))] hover:bg-white/5 hover:text-[hsl(var(--text))]'}`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${activeWorkspaceId === ws.id ? 'bg-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent))]' : 'bg-transparent'}`} />
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={onCreateWorkspace}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent)/0.1)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Workspace</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onCreateWorkspace}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-[hsl(var(--muted))] transition hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Navigation Views */}
        <div className="space-y-1">
          {sidebarOpen && <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted))]">Navigation</p>}
          {viewLabels.filter(item => {
            if (item.view === 'admin') return user && ROLE_PERMISSIONS[user.role].canAccessAdmin;
            return true;
          }).map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => { setActiveView(view); onNavClick?.(); }}
              className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200 ${
                activeView === view
                  ? 'bg-gradient-to-r from-[hsl(var(--accent)/0.15)] to-transparent text-[hsl(var(--text))] shadow-sm'
                  : 'text-[hsl(var(--muted))] hover:bg-white/5 hover:text-[hsl(var(--text))]'
              }`}
            >
              {activeView === view && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 h-6 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_12px_hsl(var(--accent))]"
                />
              )}
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110 ${activeView === view ? 'text-[hsl(var(--accent))]' : ''}`} />
              {sidebarOpen && <span className={`text-sm font-medium ${activeView === view ? 'font-bold' : ''}`}>{label}</span>}
            </button>
          ))}
        </div>

        {/* Projects Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            {sidebarOpen && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted))]">Projects</p>}
            {sidebarOpen && canManageProjects && (
              <div className="flex gap-1">
                <button
                  onClick={onCreateProject}
                  className="rounded-lg p-1 text-[hsl(var(--muted))] transition hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]"
                  title="Create Project"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {workspaceProjects.map(project => (
              <div
                key={project.id}
                onClick={() => { setActiveProject(project.id); onNavClick?.(); setActiveView('board'); }}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-all ${
                  activeProjectId === project.id
                    ? 'border-white/10 bg-white/5 shadow-inner ring-1 ring-white/5'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all duration-300",
                  activeProjectId === project.id
                    ? "bg-[hsl(var(--accent))] text-black shadow-lg shadow-[hsl(var(--accent)/0.4)] scale-110"
                    : "bg-white/5 text-[hsl(var(--muted))] group-hover:bg-white/15 group-hover:text-[hsl(var(--text))] group-hover:scale-105"
                )}>
                  {project.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                {sidebarOpen && (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm transition-colors ${activeProjectId === project.id ? 'font-bold text-[hsl(var(--text))]' : 'font-medium text-[hsl(var(--muted))] group-hover:text-[hsl(var(--text))]'}`}>
                        {project.name}
                      </span>
                      {activeProjectId === project.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveView('project-settings');
                          }}
                          className="rounded-lg p-1 text-[hsl(var(--muted))] transition hover:bg-white/10 hover:text-[hsl(var(--text))]"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted))] font-medium">
                        <Users2 className="h-3 w-3" />
                        <span>{members.filter(m => project.memberIds?.includes(m.id)).length}</span>
                      </div>
                      <span className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">{project.type}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {workspaceProjects.length === 0 && sidebarOpen && (
              <div className="px-3 py-4 text-center rounded-2xl border border-dashed border-white/10 bg-white/2">
                <p className="text-xs text-[hsl(var(--muted))]">No projects yet</p>
                <button
                  onClick={onCreateProject}
                  className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--accent))] hover:underline"
                >
                  Create First
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto space-y-2 pt-4">
        {user?.subscriptionTier === 'free' && (
          <button
            onClick={() => { setActiveAdminTab('billing'); }}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-white/10 blur-xl transition-transform group-hover:scale-150" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Limited Access</p>
                <p className="truncate text-sm font-bold">Go Premium</p>
              </div>
            )}
            {sidebarOpen && <Crown className="h-4 w-4 text-white/50 animate-pulse" />}
          </button>
        )}

        {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
          <button
            onClick={() => { setActiveAdminTab('billing'); }}
            className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300 shadow-lg transition hover:scale-[1.01] active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 backdrop-blur-md">
              <Crown className="h-4 w-4 text-emerald-200" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Unlocked</p>
                <p className="truncate text-sm font-bold capitalize">{user.subscriptionTier} Plan Active</p>
              </div>
            )}
            {sidebarOpen && <CheckCircle2 className="h-4 w-4 text-emerald-200" />}
          </button>
        )}

        <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/5 p-1.5 shadow-inner ring-1 ring-white/5">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-1 items-center justify-center rounded-xl py-2 transition ${theme === 'light' ? 'bg-white text-black shadow-md' : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'}`}
          >
            <SunMedium className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-1 items-center justify-center rounded-xl py-2 transition ${theme === 'dark' ? 'bg-[hsl(var(--accent))] text-black shadow-md' : 'text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'}`}
          >
            <MoonStar className="h-4 w-4" />
          </button>
        </div>

        <button 
          onClick={() => setActiveView('settings')}
          className="group flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-gradient-to-br from-white/10 to-transparent p-2 transition hover:border-[hsl(var(--accent))/0.3] hover:from-white/15"
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-black font-bold shadow-lg shadow-[hsl(var(--accent)/0.2)]">
              {user?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#121212] bg-emerald-500" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold text-[hsl(var(--text))] group-hover:text-[hsl(var(--accent))] transition-colors">{user?.name || 'User'}</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted))]">{user?.role || 'Member'}</p>
            </div>
          )}
          {sidebarOpen && <Settings2 className="h-4 w-4 text-[hsl(var(--muted))] group-hover:text-[hsl(var(--text))] transition-colors" />}
        </button>
      </div>
    </motion.aside>
  );
}