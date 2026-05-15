'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  GripVertical,
  ChevronRight,
  Flame,
  Clock,
  Users,
  Zap,
  Search,
  Filter,
  BarChart3
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BacklogEnhancedProps {
  tasks: Task[];
  sprints: Array<{ id: string; name: string; status: string; startDate?: string; endDate?: string }>;
  onTaskMove: (taskId: string, toSprintId: string | null) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onCreateTask: (title: string) => void;
  members: Array<{ id: string; name: string }>;
};








/**
 * Individual task item in backlog with drag handle
 */
function BacklogTaskItem({
  task,
  onTaskClick,
  onTaskMove,
  sprints
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, toSprintId: string | null) => void;
  sprints: Array<{ id: string; name: string }>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const [showSprintMenu, setShowSprintMenu] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-rose-500 bg-rose-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4 }}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] transition-all hover:border-[hsl(var(--accent)/0.5)] hover:shadow-md',
        isDragging && 'rotate-2 scale-[1.02] shadow-lg opacity-90'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))]"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(task)}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-semibold text-[hsl(var(--text))] truncate hover:text-[hsl(var(--accent))] transition-colors flex-1">
            {task.title}
          </h4>
          {task.storyPoints && (
            <div className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-[hsl(var(--accent)/0.15)] text-[10px] font-bold text-[hsl(var(--accent))]">
              {task.storyPoints}
            </div>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-[hsl(var(--muted))] truncate mt-1">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full', getPriorityColor(task.priority))}>
            {task.priority}
          </span>
          {task.labels?.slice(0, 1).map(label => (
            <span key={label} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={() => setShowSprintMenu(!showSprintMenu)}
            className="p-1.5 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {showSprintMenu && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-full mr-2 top-0 z-50 bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg min-w-max overflow-hidden"
            >
              <button
                onClick={() => {
                  onTaskMove(task.id, null);
                  setShowSprintMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors text-[hsl(var(--text))]"
              >
                Remove from Sprint
              </button>
              {sprints.map(sprint => (
                <button
                  key={sprint.id}
                  onClick={() => {
                    onTaskMove(task.id, sprint.id);
                    setShowSprintMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors text-[hsl(var(--text))]"
                >
                  {sprint.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <button
          className="p-1.5 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-rose-500/10 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Sprint section in backlog
 */
function SprintSection({
  sprint,
  tasks,
  onTaskClick,
  onTaskMove,
  sprints,
  isCollapsed,
  onToggleCollapse
}: {
  sprint: any;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, toSprintId: string | null) => void;
  sprints: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const taskIds = tasks.map(t => t.id);
  const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft)/0.5)] p-4 hover:border-[hsl(var(--border))] transition-colors"
    >
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-3 w-full group hover:bg-[hsl(var(--bg-soft)/0.5)] p-2 -m-2 rounded-lg transition-colors"
      >
        <ChevronDown
          className={cn(
            'h-5 w-5 text-[hsl(var(--muted))] transition-transform group-hover:text-[hsl(var(--accent))]',
            isCollapsed && '-rotate-90'
          )}
        />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[hsl(var(--text))]">{sprint.name}</h3>
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
              sprint.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
              sprint.status === 'completed' ? 'bg-indigo-500/10 text-indigo-500' :
              'bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))]'
            )}>
              {sprint.status}
            </span>
          </div>
          <p className="text-xs text-[hsl(var(--muted))] mt-1">
            {sprint.startDate && `${sprint.startDate} • `}
            {tasks.length} tasks {totalStoryPoints > 0 && `• ${totalStoryPoints} points`}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-bold text-[hsl(var(--text))]">{completionPercentage}%</div>
            <div className="text-xs text-[hsl(var(--muted))]">{completedTasks}/{tasks.length}</div>
          </div>
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[hsl(var(--accent)/0.1)] text-sm font-bold text-[hsl(var(--accent))]">
            {tasks.length}
          </span>
        </div>
      </button>

      {!isCollapsed && tasks.length > 0 && (
        <div className="w-full h-1.5 bg-[hsl(var(--bg-soft))] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ type: 'spring', stiffness: 70, damping: 18 }}
            className={cn(
              'h-full rounded-full transition-colors',
              completionPercentage === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
              'bg-gradient-to-r from-[hsl(var(--accent))] to-cyan-400'
            )}
          />
        </div>
      )}

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.map(task => (
                <BacklogTaskItem
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onTaskMove={onTaskMove}
                  sprints={sprints}
                />
              ))}
            </SortableContext>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length === 0 && !isCollapsed && (
        <div className="py-8 text-center text-[hsl(var(--muted))]">
          <Circle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks in this sprint</p>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Enhanced backlog with nested subtasks, collapsible epics, and better UX
 */
export function BacklogEnhanced({
  tasks,
  sprints,
  onTaskMove,
  onTaskDelete,
  onTaskClick,
  onCreateTask,
  members
}: BacklogEnhancedProps) {
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string[]>(['urgent', 'high', 'medium', 'low']);
  const [filterStatus, setFilterStatus] = useState<string[]>(['todo', 'in_progress', 'in_review', 'done']);

  // Group tasks by sprint
  const groupedTasks = useMemo(() => {
    // First, filter tasks based on search and filters
    let filteredTasks = tasks;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }

    filteredTasks = filteredTasks.filter(task =>
      filterPriority.includes(task.priority) && 
      filterStatus.includes(task.status)
    );

    const result: Record<string, Task[]> = {};

    // Group by sprint
    const bySprint = new Map<string | null, Task[]>();
    filteredTasks.forEach(task => {
      const sprintId = task.sprintId || 'backlog';
      if (!bySprint.has(sprintId)) bySprint.set(sprintId, []);
      bySprint.get(sprintId)!.push(task);
    });

    // Convert to object
    bySprint.forEach((sprintTasks, sprintId) => {
      result[sprintId || 'backlog'] = sprintTasks;
    });

    return result;
  }, [tasks, searchQuery, filterPriority, filterStatus]);

  const handleToggleSprintCollapse = useCallback((sprintId: string) => {
    setCollapsedSprints(prev => {
      const next = new Set(prev);
      if (next.has(sprintId)) next.delete(sprintId);
      else next.add(sprintId);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors} onDragEnd={(event: DragEndEvent) => {
      // Handle drag end for sprint moving
    }}>
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-3 rounded-[20px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] p-4 backdrop-blur-sm"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border-soft))] text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border shrink-0',
              showFilters
                ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] transition-all shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            Metrics
          </button>
        </motion.div>

        {/* Expanded Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-[20px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] p-4 backdrop-blur-sm space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-semibold text-[hsl(var(--text))] mb-2">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {['urgent', 'high', 'medium', 'low'].map(priority => (
                      <button
                        key={priority}
                        onClick={() => {
                          if (filterPriority.includes(priority)) {
                            setFilterPriority(filterPriority.filter(p => p !== priority));
                          } else {
                            setFilterPriority([...filterPriority, priority]);
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border flex items-center gap-1',
                          filterPriority.includes(priority)
                            ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                            : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))]'
                        )}
                      >
                        {priority === 'urgent' || priority === 'high' ? <Flame className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-semibold text-[hsl(var(--text))] mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['todo', 'in_progress', 'in_review', 'done'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          if (filterStatus.includes(status)) {
                            setFilterStatus(filterStatus.filter(s => s !== status));
                          } else {
                            setFilterStatus([...filterStatus, status]);
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border',
                          filterStatus.includes(status)
                            ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                            : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))]'
                        )}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick create row */}
        <div className="flex gap-3 p-4 rounded-lg bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border-soft))]">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskTitle.trim()) {
                onCreateTask(newTaskTitle);
                setNewTaskTitle('');
              }
            }}
            placeholder="Add a new issue..."
            className="flex-1 bg-transparent text-[hsl(var(--text))] placeholder:text-[hsl(var(--muted))] outline-none"
          />
          <button
            onClick={() => {
              if (newTaskTitle.trim()) {
                onCreateTask(newTaskTitle);
                setNewTaskTitle('');
              }
            }}
            className="px-4 py-2 bg-[hsl(var(--accent))] text-black font-semibold rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Issue
          </button>
        </div>

        {/* Sprints */}
        {sprints.map(sprint => {
          const sprintTasks = groupedTasks[sprint.id] || [];

          return (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={sprintTasks}
              onTaskClick={onTaskClick}
              onTaskMove={onTaskMove}
              sprints={sprints}
              isCollapsed={collapsedSprints.has(sprint.id)}
              onToggleCollapse={() => handleToggleSprintCollapse(sprint.id)}
            />
          );
        })}

        {/* Backlog section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft)/0.5)] p-4 hover:border-[hsl(var(--border))] transition-colors"
        >
          <h2 className="font-bold text-lg text-[hsl(var(--text))]">📦 Backlog</h2>
          {(groupedTasks['backlog'] || []).length === 0 ? (
            <div className="py-8 text-center text-[hsl(var(--muted))]">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No backlog items</p>
            </div>
          ) : (
            <div className="space-y-2">
              <SortableContext items={(groupedTasks['backlog'] || []).map(t => t.id)} strategy={verticalListSortingStrategy}>
                {(groupedTasks['backlog'] || []).map(task => (
                  <BacklogTaskItem
                    key={task.id}
                    task={task}
                    onTaskClick={onTaskClick}
                    onTaskMove={onTaskMove}
                    sprints={sprints}
                  />
                ))}
              </SortableContext>
            </div>
          )}
        </motion.div>
      </div>
    </DndContext>
  );
}

export type { BacklogEnhancedProps };
