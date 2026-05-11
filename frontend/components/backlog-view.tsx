'use client';

import { ArrowRight, Plus, LayoutGrid, CheckCircle2, Circle, Clock, Flame, Calendar, Info } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

type BacklogViewProps = {
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
};

export function BacklogView({ onTaskClick, onNewTask }: BacklogViewProps) {
  const { tasks, activeProjectId, activeSprintId, sprints, addTaskToSprint, removeTaskFromSprint } = useAppStore();

  const projectTasks = useMemo(() => tasks.filter(task => task.projectId === activeProjectId), [activeProjectId, tasks]);
  const backlogTasks = useMemo(() => projectTasks.filter(task => !task.sprintId), [projectTasks]);
  const sprintTasks = useMemo(() => projectTasks.filter(task => task.sprintId), [projectTasks]);
  const activeSprint = sprints.find(sprint => sprint.id === activeSprintId) ?? sprints.find(sprint => sprint.projectId === activeProjectId) ?? null;

  if (!activeProjectId) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.3] p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))]">
          <LayoutGrid className="h-8 w-8 opacity-40" />
        </div>
        <h3 className="text-xl font-bold text-[hsl(var(--text))]">No Project Selected</h3>
        <p className="mt-2 max-w-xs text-[hsl(var(--muted))]">
          Select a project from the sidebar or dashboard to view the backlog and manage sprints.
        </p>
      </div>
    );
  }

  const renderPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flame className="h-3 w-3 text-rose-500" />;
      case 'high': return <Flame className="h-3 w-3 text-orange-500" />;
      case 'medium': return <Clock className="h-3 w-3 text-amber-500" />;
      default: return <Circle className="h-3 w-3 text-[hsl(var(--muted))]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Scrum Process</p>
            <h1 className="text-3xl font-bold text-[hsl(var(--text))]">Product Backlog</h1>
          </div>
        </div>
        <button type="button" onClick={onNewTask} className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-5 py-2.5 text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-[hsl(var(--accent)/0.2)]">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {!activeSprint && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500">
          <Info className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">No active sprint selected. Head over to the Sprints tab to create or focus on a sprint to start planning.</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Active/Selected Sprint Column */}
        <section className="flex flex-col rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--bg-soft))]">
                <Calendar className="h-5 w-5 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[hsl(var(--text))]">{activeSprint ? activeSprint.name : 'Current Sprint'}</h2>
                <p className="text-xs text-[hsl(var(--muted))]">{sprintTasks.length} planned items</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            <AnimatePresence>
              {sprintTasks.length > 0 ? sprintTasks.map(task => (
                <motion.article 
                  key={task.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-4 transition-all hover:border-[hsl(var(--accent)/0.5)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        {task.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-[hsl(var(--muted))]" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">{task.id.slice(0, 8)}</span>
                      </div>
                      <button type="button" onClick={() => onTaskClick(task)} className="text-left text-sm font-bold text-[hsl(var(--text))] hover:text-[hsl(var(--accent))] transition-colors">{task.title}</button>
                      {task.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[hsl(var(--muted))]">{task.description}</p>}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="flex items-center gap-1 rounded-full bg-[hsl(var(--bg-panel))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted))]">
                          {renderPriorityIcon(task.priority)} {task.priority}
                        </span>
                        <span className="rounded-full bg-[hsl(var(--bg-panel))] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted))]">{task.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeTaskFromSprint(task.id)} 
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[hsl(var(--bg-panel))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--text))] opacity-0 transition-all group-hover:opacity-100 hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] border border-[hsl(var(--border))]"
                      title="Move to Backlog"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.article>
              )) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.5] text-[hsl(var(--muted))]">
                  <LayoutGrid className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-sm font-medium">No tasks assigned to sprint yet.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Backlog Column */}
        <section className="flex flex-col rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[hsl(var(--text))]">Product Backlog</h2>
            <span className="rounded-full bg-[hsl(var(--bg-soft))] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">{backlogTasks.length} items</span>
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">
            <AnimatePresence>
              {backlogTasks.length > 0 ? backlogTasks.map(task => (
                <motion.article 
                  key={task.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-4 transition-all hover:border-[hsl(var(--accent)/0.5)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">{task.id.slice(0, 8)}</span>
                      </div>
                      <button type="button" onClick={() => onTaskClick(task)} className="text-left text-sm font-bold text-[hsl(var(--text))] hover:text-[hsl(var(--accent))] transition-colors">{task.title}</button>
                      {task.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[hsl(var(--muted))]">{task.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => activeSprint && addTaskToSprint(task.id, activeSprint.id)}
                      disabled={!activeSprint}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[hsl(var(--accent)/0.1)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent)/0.2)] disabled:cursor-not-allowed disabled:opacity-40 border border-[hsl(var(--accent)/0.2)]"
                      title="Add to active sprint"
                    >
                      <Plus className="h-3.5 w-3.5" /> Sprint
                    </button>
                  </div>
                </motion.article>
              )) : (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.5] text-[hsl(var(--muted))]">
                  <p className="text-sm font-medium">Backlog is empty. Add a task to start planning.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}