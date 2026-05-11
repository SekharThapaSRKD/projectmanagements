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
  ChevronRight
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
}

/**
 * Collapsible epic group for backlog
 */
function EpicGroup({
  epic,
  tasks,
  onTaskClick,
  onTaskMove,
  sprints,
  isCollapsed,
  onToggleCollapse
}: {
  epic: string | null;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, toSprintId: string | null) => void;
  sprints: Array<{ id: string; name: string }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="space-y-2">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[hsl(var(--bg-soft))] transition-colors group w-full"
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[hsl(var(--muted))] transition-transform',
            isCollapsed && '-rotate-90'
          )}
        />
        <h3 className="font-semibold text-[hsl(var(--text))]">
          {epic || 'No Epic'}
        </h3>
        <span className="ml-auto text-xs font-medium px-2 py-1 bg-[hsl(var(--bg-soft))] rounded-full text-[hsl(var(--muted))]">
          {tasks.length}
        </span>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pl-4"
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
    </div>
  );
}

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] transition-all hover:border-[hsl(var(--accent)/0.5)]',
        isDragging && 'rotate-2 scale-[1.02] shadow-lg opacity-90'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[hsl(var(--muted))]"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick(task)}>
        <h4 className="text-sm font-semibold text-[hsl(var(--text))] truncate hover:text-[hsl(var(--accent))]">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-[hsl(var(--muted))] truncate mt-1">
            {task.description}
          </p>
        )}
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
            <div className="absolute right-full mr-2 top-0 z-50 bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg min-w-max">
              <button
                onClick={() => {
                  onTaskMove(task.id, null);
                  setShowSprintMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors"
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
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors"
                >
                  {sprint.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="p-1.5 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-rose-500/10 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
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

  return (
    <div className="space-y-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft)/0.5)] p-4">
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-3 w-full group"
      >
        <ChevronDown
          className={cn(
            'h-5 w-5 text-[hsl(var(--muted))] transition-transform',
            isCollapsed && '-rotate-90'
          )}
        />
        <div className="flex-1 text-left">
          <h3 className="font-bold text-[hsl(var(--text))]">{sprint.name}</h3>
          <p className="text-xs text-[hsl(var(--muted))]">
            {sprint.startDate && `${sprint.startDate} • `}
            {tasks.length} tasks • {totalStoryPoints} points
          </p>
        </div>
        <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]">
          {tasks.length}
        </span>
      </button>

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
    </div>
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
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set());
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Group tasks by sprint and epic
  const groupedTasks = useMemo(() => {
    const result: Record<string, Record<string, Task[]>> = {};

    // Group by sprint first
    const bySprint = new Map<string | null, Task[]>();
    tasks.forEach(task => {
      const sprintId = task.sprintId || 'backlog';
      if (!bySprint.has(sprintId)) bySprint.set(sprintId, []);
      bySprint.get(sprintId)!.push(task);
    });

    // Then group by epic within each sprint
    bySprint.forEach((sprintTasks, sprintId) => {
      result[sprintId || 'backlog'] = {};
      sprintTasks.forEach(task => {
        const epic = task.epic || 'no-epic';
        if (!result[sprintId || 'backlog'][epic]) {
          result[sprintId || 'backlog'][epic] = [];
        }
        result[sprintId || 'backlog'][epic].push(task);
      });
    });

    return result;
  }, [tasks]);

  const handleToggleEpicCollapse = useCallback((epic: string) => {
    setCollapsedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epic)) next.delete(epic);
      else next.add(epic);
      return next;
    });
  }, []);

  const handleToggleSprintCollapse = useCallback((sprintId: string) => {
    setCollapsedSprints(prev => {
      const next = new Set(prev);
      if (next.has(sprintId)) next.delete(sprintId);
      else next.add(sprintId);
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors} onDragEnd={(event: DragEndEvent) => {
      // Handle drag end for sprint moving
    }}>
      <div className="space-y-6">
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
          const sprintTasks = groupedTasks[sprint.id] || {};
          const allSprintTasks = Object.values(sprintTasks).flat();

          return (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={allSprintTasks}
              onTaskClick={onTaskClick}
              onTaskMove={onTaskMove}
              sprints={sprints}
              isCollapsed={collapsedSprints.has(sprint.id)}
              onToggleCollapse={() => handleToggleSprintCollapse(sprint.id)}
            />
          );
        })}

        {/* Backlog section */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg text-[hsl(var(--text))]">Backlog</h2>

          {Object.entries(groupedTasks['backlog'] || {}).map(([epic, epicTasks]) => (
            <EpicGroup
              key={epic}
              epic={epic === 'no-epic' ? null : epic}
              tasks={epicTasks}
              onTaskClick={onTaskClick}
              onTaskMove={onTaskMove}
              sprints={sprints}
              isCollapsed={collapsedEpics.has(epic)}
              onToggleCollapse={() => handleToggleEpicCollapse(epic)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

export type { BacklogEnhancedProps };
