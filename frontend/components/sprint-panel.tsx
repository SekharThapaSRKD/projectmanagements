'use client';

import { CheckCircle2, CirclePlus, Play, SquareCheckBig, LayoutGrid, Calendar, Target, Clock, ArrowRight, CalendarRange, TimerReset, Edit3, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Sprint } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const formatSprintDate = (isoString: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(isoString));

const addDays = (isoString: string, days: number) => {
  const date = new Date(isoString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export function SprintPanel() {
  const { sprints, tasks, activeProjectId, addSprint, updateSprint, startSprint, completeSprint, activeSprintId, setActiveSprint, deleteSprint, deleteSprintWithTasks, addToast } = useAppStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => addDays(new Date().toISOString(), 14));
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [deleteModalSprint, setDeleteModalSprint] = useState<Sprint | null>(null);
  const [deleteMode, setDeleteMode] = useState<'unlink' | 'delete'>('unlink');
  const [optionMenuSprintId, setOptionMenuSprintId] = useState<string | null>(null);
  const [startMenuSprintId, setStartMenuSprintId] = useState<string | null>(null);

  const projectSprints = useMemo(() => sprints.filter(sprint => sprint.projectId === activeProjectId), [activeProjectId, sprints]);

  const handleCreateSprint = () => {
    if (!activeProjectId) {
      addToast({
        type: 'error',
        title: 'Project Required',
        description: 'Please select a workspace and a project first to create a sprint.'
      });
      return;
    }

    if (!name.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Sprint name is required.'
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Sprint end date must be after the start date.'
      });
      return;
    }

    addSprint({
      name: name.trim(),
      projectId: activeProjectId,
      goal: goal.trim() || 'Deliver the next milestone',
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString()
    });
    setName('');
    setGoal('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(addDays(new Date().toISOString(), 14));

    addToast({
      type: 'success',
      title: 'Sprint Created',
      description: `Successfully created ${name.trim()}.`
    });
  };

  const progressFor = (sprint: Sprint) => {
    const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
    const completed = sprintTasks.filter(task => task.status === 'done').length;
    return sprintTasks.length ? Math.round((completed / sprintTasks.length) * 100) : 0;
  };

  const openEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setEditName(sprint.name);
    setEditGoal(sprint.goal);
    setEditStartDate(sprint.startDate.slice(0, 10));
    setEditEndDate(sprint.endDate.slice(0, 10));
  };

  const saveEditSprint = () => {
    if (!editingSprint) return;

    if (!editName.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Sprint name is required.'
      });
      return;
    }

    if (new Date(editEndDate) < new Date(editStartDate)) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        description: 'Sprint end date must be after the start date.'
      });
      return;
    }

    updateSprint(editingSprint.id, {
      name: editName.trim(),
      goal: editGoal.trim() || 'Deliver the next milestone',
      startDate: new Date(editStartDate).toISOString(),
      endDate: new Date(editEndDate).toISOString()
    });
    setEditingSprint(null);

    addToast({
      type: 'success',
      title: 'Sprint Updated',
      description: 'Changes have been saved successfully.'
    });
  };

  if (!activeProjectId) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-[32px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.3] p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))]">
          <LayoutGrid className="h-8 w-8 opacity-40" />
        </div>
        <h3 className="text-xl font-bold text-[hsl(var(--text))]">No Project Selected</h3>
        <p className="mt-2 max-w-xs text-[hsl(var(--muted))]">
          Select a project from the sidebar or dashboard to view and manage sprints.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Sprints</p>
            <h1 className="text-3xl font-bold text-[hsl(var(--text))]">Sprint Planning</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">Plan your work in a Jira-style timebox with start and end dates.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[hsl(var(--muted))] md:min-w-[280px]">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3">
            <div className="flex items-center gap-2 text-[hsl(var(--accent))]"><CalendarRange className="h-4 w-4" /> Timeline</div>
            <div className="mt-1 text-sm text-[hsl(var(--text))]">Set sprint dates</div>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3">
            <div className="flex items-center gap-2 text-[hsl(var(--accent))]"><TimerReset className="h-4 w-4" /> Cadence</div>
            <div className="mt-1 text-sm text-[hsl(var(--text))]">Default 2 weeks</div>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.2fr_1fr_auto] items-end">
          <div className="flex-1 w-full relative">
            <Target className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <input 
              value={name} 
              onChange={event => setName(event.target.value)} 
              placeholder="E.g. Sprint 42" 
              className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all" 
            />
          </div>
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-1">
            <div className="relative">
              <CalendarRange className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
              <input 
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all" 
              />
            </div>
            <div className="relative">
              <CalendarRange className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
              <input 
                type="date"
                min={startDate}
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all" 
              />
            </div>
          </div>
          <div className="flex-[2] w-full relative lg:col-span-1">
            <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <input 
              value={goal} 
              onChange={event => setGoal(event.target.value)} 
              placeholder="What is the main goal for this sprint?" 
              className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] transition-all" 
            />
          </div>
          <button 
            type="button" 
            onClick={handleCreateSprint} 
            className="w-full md:w-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-6 py-3.5 text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-[hsl(var(--accent)/0.2)] lg:self-stretch"
          >
            <CirclePlus className="h-4 w-4" /> Start Planning
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnimatePresence>
          {projectSprints.map(sprint => {
            const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
            const progress = progressFor(sprint);
            const isDone = progress === 100 && sprintTasks.length > 0;

            return (
              <motion.article 
                key={sprint.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative overflow-hidden rounded-[32px] border p-6 transition-all ${
                  activeSprintId === sprint.id 
                    ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--bg-elevated))] shadow-lg shadow-[hsl(var(--accent)/0.05)]' 
                    : 'border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.4)]'
                }`}
              >
                {activeSprintId === sprint.id && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--accent))] to-transparent" />
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        sprint.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                        sprint.status === 'completed' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                        'bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] border border-[hsl(var(--border))]'
                      }`}>
                        {sprint.status}
                      </span>
                      {activeSprintId === sprint.id && <span className="rounded-full bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.3)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--accent))]">Focused</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[hsl(var(--text))]">{sprint.name}</h2>
                      {isDone && <Sparkles className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted))]">{sprint.goal}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[hsl(var(--muted))]">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-3 py-1">
                        <CalendarRange className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                        {formatSprintDate(sprint.startDate)} → {formatSprintDate(sprint.endDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-3 py-1">
                        <TimerReset className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                        {Math.max(1, Math.ceil((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24)))} days
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setActiveSprint(sprint.id)} 
                    className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                      activeSprintId === sprint.id 
                        ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-black' 
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] hover:border-[hsl(var(--border-strong))]'
                    }`}
                  >
                    Focus
                  </button>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <span>Progress</span>
                    <span className={progress === 100 ? 'text-emerald-500' : 'text-[hsl(var(--text))]'}>{progress}% • {sprintTasks.length} Tasks</span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-[hsl(var(--bg-soft))] shadow-inner ring-1 ring-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', stiffness: 70, damping: 18 }}
                      className={`relative h-full rounded-full ${
                        progress === 100
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400'
                          : 'bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(var(--accent)/0.85)] to-cyan-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: ['-40%', '140%'] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-y-0 left-0 w-1/3 bg-white/20 blur-sm"
                      />
                      {progress > 0 && (
                        <div className="absolute inset-0 rounded-full shadow-[0_0_24px_hsl(var(--accent)/0.25)]" />
                      )}
                    </motion.div>
                    {isDone && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                      />
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[hsl(var(--muted))]">
                    <span>{isDone ? 'Sprint complete' : 'In progress'}</span>
                    <span>{formatSprintDate(sprint.startDate)} → {formatSprintDate(sprint.endDate)}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openEditSprint(sprint)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-xs font-bold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))]"
                  >
                    <Edit3 className="h-4 w-4 text-[hsl(var(--accent))]" /> Edit
                  </button>
                  {sprint.status === 'planning' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStartMenuSprintId(startMenuSprintId === sprint.id ? null : sprint.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent)/0.1)] px-4 py-2 text-xs font-bold text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent)/0.2)] border border-[hsl(var(--accent)/0.2)]"
                      >
                        <Play className="h-4 w-4" /> Start Sprint
                      </button>

                      {startMenuSprintId === sprint.id && (
                        <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-2 shadow-lg">
                          <button
                            onClick={() => {
                              setStartMenuSprintId(null);
                              openEditSprint(sprint);
                            }}
                            className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))]"
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => {
                              setStartMenuSprintId(null);
                              const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
                              if (sprintTasks.length === 0) {
                                // eslint-disable-next-line no-restricted-globals
                                const ok = confirm('This sprint has no tasks. Start anyway?');
                                if (!ok) return;
                              }
                              startSprint(sprint.id);
                              addToast({ type: 'success', title: 'Sprint Started', description: `${sprint.name} is now active.` });
                            }}
                            className="w-full text-left rounded-md px-3 py-2 text-sm text-[hsl(var(--accent))] hover:bg-[hsl(var(--bg-soft))]"
                          >
                            Start
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {sprint.status !== 'completed' && (
                    <button type="button" onClick={() => completeSprint(sprint.id)} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-xs font-bold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))]">
                      <SquareCheckBig className="h-4 w-4 text-emerald-500" /> Complete
                    </button>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOptionMenuSprintId(optionMenuSprintId === sprint.id ? null : sprint.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500 bg-[rgba(255,0,0,0.03)] px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-[rgba(255,0,0,0.06)]"
                    >
                      <X className="h-4 w-4" /> Delete
                    </button>

                    {optionMenuSprintId === sprint.id && (
                      <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-2 shadow-lg">
                        <button
                          onClick={() => {
                            setOptionMenuSprintId(null);
                            openEditSprint(sprint);
                          }}
                          className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))]"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => {
                            setOptionMenuSprintId(null);
                            setDeleteModalSprint(sprint);
                          }}
                          className="w-full text-left rounded-md px-3 py-2 text-sm text-red-500 hover:bg-[hsl(var(--bg-soft))]"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {sprintTasks.length > 0 && (
                  <div className="mt-6 space-y-2 border-t border-[hsl(var(--border-soft))] pt-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))] mb-3">Sprint Scope</p>
                    {sprintTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 group hover:border-[hsl(var(--accent)/0.5)] transition-colors">
                        <span className="text-sm font-medium text-[hsl(var(--text))] truncate pr-4">{task.title}</span>
                        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted))]">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                          )}
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                    {sprintTasks.length > 3 && (
                      <p className="text-center text-xs font-bold text-[hsl(var(--muted))] mt-3">
                        + {sprintTasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
        
        {projectSprints.length === 0 && (
          <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-[32px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))/0.5] text-center text-[hsl(var(--muted))]">
            <Calendar className="mb-4 h-12 w-12 opacity-20" />
            <h3 className="text-lg font-bold text-[hsl(var(--text))]">No Sprints Found</h3>
            <p className="mt-1 text-sm">Create your first sprint using the form above.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingSprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
            onClick={() => setEditingSprint(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.96 }}
              onClick={event => event.stopPropagation()}
              className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl sm:rounded-[32px]"
            >
              <div className="flex items-center justify-between border-b border-[hsl(var(--border-soft))] px-6 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Edit Sprint</p>
                  <h3 className="text-xl font-bold text-[hsl(var(--text))]">Update sprint timeline</h3>
                </div>
                <button type="button" onClick={() => setEditingSprint(null)} className="rounded-full p-2 text-[hsl(var(--muted))] transition hover:bg-[hsl(var(--bg-soft))] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-2">
                <div className="md:col-span-2 relative">
                  <Target className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
                  <input
                    value={editName}
                    onChange={event => setEditName(event.target.value)}
                    placeholder="Sprint name"
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
                  />
                </div>
                <div className="relative">
                  <CalendarRange className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={event => setEditStartDate(event.target.value)}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
                  />
                </div>
                <div className="relative">
                  <CalendarRange className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
                  <input
                    type="date"
                    min={editStartDate}
                    value={editEndDate}
                    onChange={event => setEditEndDate(event.target.value)}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
                  />
                </div>
                <div className="md:col-span-2 relative">
                  <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--muted))]" />
                  <textarea
                    value={editGoal}
                    onChange={event => setEditGoal(event.target.value)}
                    placeholder="Sprint goal"
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-[hsl(var(--accent)/0.5)] focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border-soft))] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditingSprint(null)}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-3 text-sm font-semibold text-[hsl(var(--text))] transition hover:bg-[hsl(var(--bg-panel))]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditSprint}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-black transition hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        <AnimatePresence>
          {deleteModalSprint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
              onClick={() => setDeleteModalSprint(null)}
            >
              <motion.div
                initial={{ y: 24, opacity: 0, scale: 0.96 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 16, opacity: 0, scale: 0.96 }}
                onClick={event => event.stopPropagation()}
                className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-[20px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl sm:rounded-[24px]"
              >
                <div className="p-6">
                  <h3 className="text-lg font-bold">Delete Sprint</h3>
                  <p className="mt-2 text-sm text-[hsl(var(--muted))]">Choose how to handle tasks in this sprint.</p>

                  <div className="mt-4 space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="radio" name="deleteMode" checked={deleteMode === 'unlink'} onChange={() => setDeleteMode('unlink')} />
                      <div>
                        <div className="font-semibold">Unlink tasks (default)</div>
                        <div className="text-xs text-[hsl(var(--muted))]">Remove the sprint and keep tasks, tasks will be unassigned from the sprint.</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="radio" name="deleteMode" checked={deleteMode === 'delete'} onChange={() => setDeleteMode('delete')} />
                      <div>
                        <div className="font-semibold">Delete tasks permanently</div>
                        <div className="text-xs text-[hsl(var(--muted))]">Remove the sprint and permanently delete all tasks that belong to it.</div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button onClick={() => setDeleteModalSprint(null)} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2">Cancel</button>
                    <button
                      onClick={() => {
                        if (!deleteModalSprint) return;
                        if (deleteMode === 'unlink') {
                          deleteSprint(deleteModalSprint.id);
                          addToast({ type: 'success', title: 'Sprint Deleted', description: `${deleteModalSprint.name} removed (tasks unlinked).` });
                        } else {
                          deleteSprintWithTasks(deleteModalSprint.id);
                          addToast({ type: 'success', title: 'Sprint and tasks Deleted', description: `${deleteModalSprint.name} and its tasks have been removed.` });
                        }
                        setDeleteModalSprint(null);
                      }}
                      className="rounded-2xl bg-red-600 px-4 py-2 text-white"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}