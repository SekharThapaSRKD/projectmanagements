'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useAppStore } from '@/lib/store';
import { ROLE_PERMISSIONS, TIER_LIMITS } from '@/lib/types';
import { AppSidebar } from './app-sidebar';
import { TaskDialog } from './task-dialog';
import { ProjectDialog } from './project-dialog';
import { BoardDialog } from './board-dialog';
import { JoinProjectDialog } from './join-project-dialog';
import { WorkspaceDialog } from './workspace-dialog';
import { KanbanBoard } from './kanban-board';
import { BacklogView } from './backlog-view';
import { SprintPanel } from './sprint-panel';
import { ChatWorkspace } from './chat-workspace';
import { AnalyticsDashboard } from './analytics-dashboard';
import { DocsView } from './docs-view';
import { DashboardView } from './dashboard-view';
import { NotificationCenter } from './notification-center';
import { NotificationsView } from './notifications-view';
import { SettingsView } from './settings-view';
import { TaskFormView } from './task-form-view';
import { ProjectSettingsView } from './project-settings-view';
import { CommandPalette } from './command-palette';
import { InviteDialog } from './invite-dialog';
import { AdminPanel } from './admin-panel';
import { HistoryView } from './history-view';
import { Toaster } from './toaster';
import { MeetingsView } from './meetings-view';
import { UserPlus, Menu, X, SquareKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationTimeNavbar } from './LocationTimeNavbar';

export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const handledCheckoutRef = useRef<string | null>(null);
  const bootstrapStartedRef = useRef(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const authUser = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const authMode = useAuthStore(state => state.authMode);
  const { tasks, activeView, sidebarOpen, activeProjectId, activeWorkspaceId, projects, workspaces, addNotification, addToast, setActiveView, setActiveAdminTab } = useAppStore();
  const hydrateFromBackend = useAppStore(state => state.hydrateFromBackend);
  const startRealtimeSync = useAppStore(state => state.startRealtimeSync);
  const logout = useAuthStore(state => state.logout);
  const refreshCurrentUser = useAuthStore(state => state.refreshCurrentUser);
  const setSubscriptionTier = useAuthStore(state => state.setSubscriptionTier);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, ready, router]);

  useEffect(() => {
    if (!ready || !isAuthenticated || authMode !== 'real') {
      return;
    }

    if (bootstrapStartedRef.current) {
      return;
    }
    bootstrapStartedRef.current = true;

    const bootstrapSessionKey = `teamflow-bootstrap:${authUser?.id ?? 'anonymous'}`;
    const shouldSkipBootstrap = typeof window !== 'undefined' && sessionStorage.getItem(bootstrapSessionKey) === '1';

    const bootstrap = async () => {
      if (shouldSkipBootstrap) {
        return;
      }

      await refreshCurrentUser();
      await hydrateFromBackend();

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(bootstrapSessionKey, '1');
      }
    };

    void bootstrap();
    const stopRealtimeSync = startRealtimeSync();

    return () => {
      stopRealtimeSync();
    };
  }, [authMode, authUser?.id, hydrateFromBackend, isAuthenticated, ready, refreshCurrentUser, startRealtimeSync]);

  useEffect(() => {
    if (!ready || !isAuthenticated || authMode !== 'real') {
      return;
    }

    const checkoutStatus = searchParams.get('checkout');
    const checkoutPlan = searchParams.get('plan');
    const checkoutKey = `${checkoutStatus ?? ''}:${checkoutPlan ?? ''}`;

    if (checkoutStatus !== 'success' || !checkoutPlan || handledCheckoutRef.current === checkoutKey) {
      return;
    }

    handledCheckoutRef.current = checkoutKey;

    let cancelled = false;

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const activatePlan = async () => {
      setSubscriptionTier(checkoutPlan as 'pro' | 'enterprise');
      addNotification({
        type: 'system',
        title: 'Payment Received',
        message: `Stripe confirmed your ${checkoutPlan} purchase. Activating your account now...`
      });

      const maxAttempts = 5;

      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt += 1) {
        await refreshCurrentUser();
        await hydrateFromBackend();

        const currentTier = useAuthStore.getState().user?.subscriptionTier;
        if (currentTier === checkoutPlan) {
          addToast({
            type: 'success',
            title: 'Purchase Successful',
            description: `${checkoutPlan.toUpperCase()} is now active. Premium limits are unlocked.`
          });
          router.replace(pathname, { scroll: false });
          return;
        }

        if (attempt < maxAttempts - 1) {
          await wait(1000);
        }
      }

      addToast({
        type: 'info',
        title: 'Payment Confirmed',
        description: 'Your plan is being synchronized. Refreshing the account profile in the background.'
      });
      router.replace(pathname, { scroll: false });
    };

    void activatePlan();

    return () => {
      cancelled = true;
    };
  }, [addNotification, addToast, authMode, hydrateFromBackend, isAuthenticated, pathname, ready, refreshCurrentUser, router, searchParams, setSubscriptionTier]);

  if (!ready || !isAuthenticated || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        Loading TeamFlow...
      </div>
    );
  }

  const activeTask = tasks.find(task => task.id === selectedTaskId) ?? null;
  const activeProject = projects.find(project => project.id === activeProjectId);
  const activeWorkspace = workspaces.find(workspace => workspace.id === activeProject?.workspaceId);

  const openTaskDialog = (taskId?: string) => {
    if (!taskId && !activeProjectId) {
      addNotification({
        type: 'system',
        title: 'Project Required',
        message: 'Please select a workspace and a project first to create a task.'
      });
      return;
    }
    setSelectedTaskId(taskId ?? null);
    setActiveView('create-task');
  };

  const closeTaskDialog = () => {
    setSelectedTaskId(null);
    setIsCreatingTask(false);
  };

  const openProjectDialog = () => {
    // Check if user has an active workspace
    if (!activeWorkspaceId) {
      addNotification({
        type: 'system',
        title: 'Workspace Required',
        message: 'Please select a workspace first to create a project.'
      });
      return;
    }
    
    // Count projects in active workspace
    const workspaceProjects = projects.filter(p => p.workspaceId === activeWorkspaceId);
    
    // Get the limit for the user's subscription tier
    const subscriptionTier = authUser?.subscriptionTier || 'free';
    const limit = TIER_LIMITS[subscriptionTier]?.projectsPerWorkspace || 2;
    
    // Check if limit is reached
    if (workspaceProjects.length >= limit) {
      addNotification({
        type: 'system',
        title: 'Upgrade Required',
        message: `You have reached the project limit for this workspace (${workspaceProjects.length}/${limit}). Upgrade to Premium to create more projects.`
      });
      setActiveAdminTab('billing');
      setActiveView('admin');
      return;
    }
    
    setIsCreatingProject(true);
  };

  const closeProjectDialog = () => {
    setIsCreatingProject(false);
  };

  const handleCreateWorkspace = () => {
    // Count only workspaces owned by current user
    const ownedWorkspacesCount = workspaces.filter(w => w.ownerId === authUser?.id).length;
    
    // Get the limit for the user's subscription tier
    const subscriptionTier = authUser?.subscriptionTier || 'free';
    const limit = TIER_LIMITS[subscriptionTier]?.workspaces || 1;
    
    // Check if limit is reached
    if (ownedWorkspacesCount >= limit) {
      addNotification({
        type: 'system',
        title: 'Upgrade Required',
        message: `You have reached the workspace limit for the ${subscriptionTier} plan (${ownedWorkspacesCount}/${limit}). Upgrade to Premium to create more workspaces.`
      });
      setActiveAdminTab('billing');
      setActiveView('admin');
      return;
    }
    
    setIsCreatingWorkspace(true);
  };

  return (
    <div className="min-h-screen app-grid flex flex-col md:flex-row px-2 py-2 sm:px-3 sm:py-3 md:px-4 lg:px-5 relative overflow-x-hidden">
      {/* Mobile Top Bar */}
      <header className="md:hidden glass-panel soft-border mb-4 flex items-center justify-between rounded-[24px] px-5 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-black">
            <SquareKanban className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold">TeamFlow</h1>
        </div>
        <div className="hidden sm:block md:hidden">
          <LocationTimeNavbar />
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))]"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1800px] min-w-0 flex-1 flex-col md:flex-row gap-3 md:gap-4 h-full relative">
        <div className={cn(
          "fixed inset-y-0 left-0 z-[100] w-[min(88vw,320px)] sm:w-[min(80vw,360px)] md:w-auto md:relative md:inset-0 transition-transform duration-300 md:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
        )}>
          <AppSidebar 
            onCreateTask={() => openTaskDialog()} 
            onCreateProject={() => openProjectDialog()} 
            onCreateBoard={() => setIsCreatingBoard(true)}
            onCreateWorkspace={handleCreateWorkspace}
            onNavClick={() => setMobileMenuOpen(false)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="min-w-0 flex-1 flex flex-col h-full">
          <header className="glass-panel soft-border mb-4 flex flex-col gap-3 rounded-[28px] px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted))]">{activeWorkspace?.name ?? 'Workspace'}</p>
              <h2 className="truncate text-xl font-semibold sm:text-2xl">{activeProject?.name ?? 'Project'} <span className="text-[hsl(var(--muted))]">/{activeView}</span></h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
              <div className="hidden xl:block">
                <LocationTimeNavbar />
              </div>
              {activeProjectId && (
                <button 
                  onClick={() => setIsInviting(true)}
                  className="flex items-center gap-2 rounded-full border border-[hsl(var(--accent))/0.3] bg-[hsl(var(--accent)/0.05)] px-3 py-2 text-xs font-semibold text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent)/0.1)] sm:px-4 sm:text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </button>
              )}
              <NotificationCenter />
              <button type="button" onClick={() => { logout(); router.replace('/login'); }} className="rounded-full border border-white/10 px-3 py-2 text-xs text-[hsl(var(--muted))] transition hover:text-[hsl(var(--text))] sm:px-4 sm:text-sm">
                Logout
              </button>
            </div>
          </header>

          <section className="min-w-0 pb-4">
            {activeView === 'dashboard' && <DashboardView onCreateProject={openProjectDialog} onJoinProject={() => setIsJoiningProject(true)} />}
            {activeView === 'board' && <KanbanBoard onTaskClick={task => openTaskDialog(task.id)} onCreateTask={() => openTaskDialog()} />}
            {activeView === 'backlog' && <BacklogView onTaskClick={task => openTaskDialog(task.id)} onNewTask={() => openTaskDialog()} />}
            {activeView === 'sprints' && <SprintPanel />}
            {activeView === 'meetings' && <MeetingsView />}
            {activeView === 'chat' && <ChatWorkspace />}
            {activeView === 'analytics' && <AnalyticsDashboard />}
            {activeView === 'docs' && <DocsView />}
            {activeView === 'notifications' && <NotificationsView />}
            {activeView === 'settings' && <SettingsView />}
            {activeView === 'admin' && <AdminPanel />}
            {activeView === 'project-settings' && <ProjectSettingsView />}
            {activeView === 'history' && <HistoryView />}
            {activeView === 'create-task' && (
              <TaskFormView 
                task={activeTask} 
                onClose={() => {
                  setSelectedTaskId(null);
                  setActiveView('board'); // Go back to board after save/cancel
                }} 
              />
            )}
          </section>
        </main>
      </div>

      <ProjectDialog isOpen={isCreatingProject} onClose={closeProjectDialog} />
      <BoardDialog isOpen={isCreatingBoard} onClose={() => setIsCreatingBoard(false)} projectId={activeProjectId || ''} />
      <JoinProjectDialog isOpen={isJoiningProject} onClose={() => setIsJoiningProject(false)} />
      <WorkspaceDialog isOpen={isCreatingWorkspace} onClose={() => setIsCreatingWorkspace(false)} />
      <InviteDialog isOpen={isInviting} onClose={() => setIsInviting(false)} projectId={activeProjectId || ''} />
      <CommandPalette />
      <Toaster />
    </div>
  );
}