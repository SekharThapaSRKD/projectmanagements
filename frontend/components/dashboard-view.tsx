'use client';

import { useAppStore } from '@/lib/store';
import { Plus, Users, FolderPlus, Activity, CheckCircle2, ListTodo, UsersRound, ChevronRight } from 'lucide-react';

type DashboardViewProps = {
  onCreateProject: () => void;
  onJoinProject: () => void;
};

export function DashboardView({ onCreateProject, onJoinProject }: DashboardViewProps) {
  const { projects, tasks, members, workspaces, activeWorkspaceId, activeProjectId, setActiveProject, setActiveView } = useAppStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceProjects = projects.filter((p) => p.workspaceId === activeWorkspaceId);
  const myTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  const stats = [
    { label: 'Total Projects', value: workspaceProjects.length, icon: FolderPlus, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Active Tasks', value: myTasks.length, icon: ListTodo, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Completed Tasks', value: completedTasks.length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Team Members', value: members.length, icon: UsersRound, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const quickActions = [
    { title: 'Create Project', description: 'Start a new project from scratch', icon: Plus, action: onCreateProject },
    { title: 'Join Project', description: 'Join an existing project with an invite code', icon: Users, action: onJoinProject },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Welcome back, {activeWorkspace?.name || 'User'}!</h1>
        <p className="text-[hsl(var(--muted))]">Here's what's happening in your workspace today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-panel soft-border group relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 transition-all hover:bg-white/5">
            <div className={`absolute -right-2 -top-2 h-16 w-16 opacity-10 transition-transform group-hover:scale-125 ${stat.color}`}>
              <stat.icon className="h-full w-full" />
            </div>
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="mb-4 text-lg font-bold">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={action.action}
                className="glass-panel soft-border group flex items-center gap-4 rounded-[28px] p-5 text-left transition hover:bg-white/5 active:scale-[0.98]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] transition group-hover:bg-[hsl(var(--accent)/0.2)]">
                  <action.icon className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="font-bold">{action.title}</h4>
                  <p className="text-sm text-[hsl(var(--muted))]">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 px-2">
            <h3 className="text-2xl font-black tracking-tighter uppercase text-white">Active Projects</h3>
            <p className="text-xs text-[hsl(var(--muted))] mt-1 font-medium">Continue your work on these active nodes.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaceProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setActiveProject(project.id);
                  setActiveView('board');
                }}
                className="glass-panel group relative flex h-full flex-col justify-between overflow-hidden rounded-[40px] border border-white/5 bg-gradient-to-br from-white/[0.05] to-transparent p-8 text-left transition-all hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-[hsl(var(--accent)/0.1)] active:scale-[0.98]"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[hsl(var(--accent)/0.03)] blur-3xl transition-colors group-hover:bg-[hsl(var(--accent)/0.1)]" />
                
                <div className="relative space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--accent))] opacity-60">{project.key}</span>
                      <h4 className="text-xl font-black text-white tracking-tight mt-1">{project.name}</h4>
                    </div>
                    <span className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--muted))]">
                      {project.type}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-[hsl(var(--muted))] leading-relaxed font-medium">
                    {project.description || 'Executing core development sprint and infrastructure optimization.'}
                  </p>
                </div>

                <div className="relative mt-10">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">
                    <span>Node Progress</span>
                    <span className="text-[hsl(var(--accent))]">33%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.5)] shadow-[0_0_15px_hsl(var(--accent)/0.3)]" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
