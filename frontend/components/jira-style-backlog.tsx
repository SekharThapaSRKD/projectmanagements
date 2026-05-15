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
  GripVertical,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Flame,
  Clock,
  Circle,
  MoreVertical,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Sprint {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
}

interface JiraBacklogProps {
  tasks: Task[];
  sprints: Sprint[];
  members: Array<{ id: string; name: string; avatar?: string }>;
  onTaskMove: (taskId: string, toSprintId: string | null, index?: number) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onCreateTask: (sprintId: string | null) => void;
  onCreateSprint?: (sprintName: string, startDate?: string, endDate?: string) => void;
  onSprintAction?: (sprintId: string, action: 'start' | 'complete' | 'configure' | 'delete') => void;
}

/**
 * Task row component - displays a single task in Jira style
 */
function TaskRow({
  task,
  sprint,
  members,
  onTaskClick,
  onTaskDelete,
  onTaskStatusChange,
  isDragging
}: {
  task: Task;
  sprint: Sprint | null;
  members: Array<{ id: string; name: string; avatar?: string }>;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  isDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const assignee = members.find(m => m.id === task.assigneeId);
  const priorityIcon = {
    urgent: <Flame className="h-4 w-4" style={{ color: 'hsl(var(--destructive))' }} />,
    high: <Flame className="h-4 w-4" style={{ color: 'hsl(var(--accent))' }} />,
    medium: <Clock className="h-4 w-4" style={{ color: 'hsl(var(--accent)/0.7)' }} />,
    low: <Circle className="h-4 w-4" style={{ color: 'hsl(var(--muted))' }} />
  };

  const statusColor = {
    todo: 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]',
    in_progress: 'bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]',
    in_review: 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]',
    done: 'bg-green-100/30 text-green-600 dark:text-green-400'
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    onTaskStatusChange(task.id, newStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border))] rounded-lg hover:shadow-md transition-all group',
        isDragging && 'shadow-lg rotate-2'
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]" style={{ opacity: 0.6 }}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Task Checkbox */}
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={handleCheckboxChange}
        className="shrink-0 w-4 h-4 cursor-pointer"
      />

      {/* Task Key and Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[hsl(var(--accent))] shrink-0">
            {task.id.substring(0, 8).toUpperCase()}
          </span>
          <span
            onClick={() => onTaskClick(task)}
            className="text-sm font-medium text-[hsl(var(--text))] truncate hover:text-[hsl(var(--accent))] cursor-pointer"
          >
            {task.title}
          </span>
        </div>
      </div>

      {/* Priority Icon */}
      <div className="shrink-0 flex items-center justify-center">
        {priorityIcon[task.priority as keyof typeof priorityIcon] || (
          <Circle className="h-4 w-4" style={{ color: 'hsl(var(--muted)/0.4)' }} />
        )}
      </div>

      {/* Status Badge */}
      <div
        className={cn(
          'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full',
          statusColor[task.status as keyof typeof statusColor] || statusColor.todo
        )}
      >
        {task.status?.replace('_', ' ').toUpperCase()}
      </div>

      {/* Due Date */}
      {task.dueDate && (
        <div className="shrink-0 flex items-center gap-1 text-xs text-[hsl(var(--muted))]">
          <Calendar className="h-4 w-4" />
          {task.dueDate}
        </div>
      )}

      {/* Story Points */}
      {task.storyPoints && (
        <div className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))] text-xs font-bold">
          {task.storyPoints}
        </div>
      )}

      {/* Assignee Avatar */}
      {assignee && (
        <div
          className="shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold flex items-center justify-center"
          title={assignee.name}
        >
          {assignee.name?.[0] || '?'}
        </div>
      )}

      {/* More Actions */}
      <button
        onClick={() => onTaskDelete(task.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
        title="Delete task"
        style={{ color: 'hsl(var(--destructive))' }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Sprint section - collapsible sprint with tasks
 */
function SprintSection({
  sprint,
  tasks,
  members,
  isCollapsed,
  onToggleCollapse,
  onTaskClick,
  onTaskDelete,
  onTaskStatusChange,
  onCreateTask,
  onSprintAction
}: {
  sprint: Sprint;
  tasks: Task[];
  members: Array<{ id: string; name: string; avatar?: string }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onCreateTask: () => void;
  onSprintAction?: (action: 'start' | 'complete' | 'configure' | 'delete') => void;
}) {
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const taskIds = tasks.map(t => t.id);

  const sprintStatusColor = {
    planning: 'bg-[hsl(var(--bg-soft))]',
    active: 'bg-[hsl(var(--accent)/0.05)] border-l-4 border-l-[hsl(var(--accent))]',
    completed: 'bg-green-50/30 dark:bg-green-900/10'
  };

  const [optionOpen, setOptionOpen] = useState(false);

  return (
    <div className={cn('rounded-lg border border-[hsl(var(--border))] overflow-hidden', sprintStatusColor[sprint.status])}>
      {/* Sprint Header - Non-button container for proper nesting */}
      <div className="flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--bg-soft))] transition-colors group">
        {/* Collapsible Section */}
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse();
            }
          }}
          className="flex-1 flex items-center gap-3 text-left cursor-pointer"
        >
          <ChevronDown
            className={cn(
              'h-5 w-5 text-[hsl(var(--muted))] transition-transform',
              isCollapsed && '-rotate-90'
            )}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[hsl(var(--text))]">{sprint.name}</h3>
              <button className="flex items-center gap-1 text-xs text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] px-2 py-1 rounded transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                <Edit2 className="h-3 w-3" /> Add dates
              </button>
              <span className="text-xs text-[hsl(var(--muted))]">({tasks.length} work items)</span>
            </div>
          </div>

          {/* Sprint Stats */}
          <div className="shrink-0 flex items-center gap-2 text-sm mr-2">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
            <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
            <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
          </div>
        </div>

        {/* Sprint Actions - Separate buttons */}
        <div className="shrink-0 ml-2 flex items-center gap-2 relative">
          {sprint.status === 'planning' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (tasks.length > 0) onSprintAction?.('start');
              }}
              disabled={tasks.length === 0}
              className="px-3 py-1.5 bg-[hsl(var(--bg-soft))] hover:bg-[hsl(var(--border))] text-[hsl(var(--text))] text-xs font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start sprint
            </button>
          )}
          {sprint.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSprintAction?.('complete');
              }}
              className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:opacity-90 transition-opacity"
            >
              Complete sprint
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOptionOpen(!optionOpen); }}
            className="p-1.5 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] rounded transition-colors"
            title="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {optionOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-2 shadow-lg">
              <button
                onClick={() => { setOptionOpen(false); onSprintAction?.('configure'); }}
                className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--bg-soft))]"
              >
                Configure
              </button>
              <button
                onClick={() => { setOptionOpen(false); onSprintAction?.('delete'); }}
                className="w-full text-left rounded-md px-3 py-2 text-sm text-red-500 hover:bg-[hsl(var(--bg-soft))]"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sprint Tasks */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[hsl(var(--border))]"
          >
            <div className="px-4 py-3 space-y-2">
              {tasks.length > 0 ? (
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  {tasks.map((task, idx) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      sprint={sprint}
                      members={members}
                      onTaskClick={onTaskClick}
                      onTaskDelete={onTaskDelete}
                      onTaskStatusChange={onTaskStatusChange}
                      isDragging={false}
                    />
                  ))}
                </SortableContext>
              ) : (
                <div className="py-4 rounded-lg border border-dashed border-[hsl(var(--border))] text-center text-[hsl(var(--muted))] bg-[hsl(var(--bg-soft))/0.3]">
                  <p className="text-xs">Plan a sprint by dragging work items into it, or by dragging the sprint footer.</p>
                </div>
              )}

              {/* Create Task Button */}
              <button
                onClick={onCreateTask}
                className="w-full flex items-center gap-2 px-4 py-2 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] rounded transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create issue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Backlog section - unscheduled tasks
 */
function BacklogSection({
  tasks,
  members,
  isCollapsed,
  onToggleCollapse,
  onTaskClick,
  onTaskDelete,
  onTaskStatusChange,
  onCreateTask,
  onCreateSprint
}: {
  tasks: Task[];
  members: Array<{ id: string; name: string; avatar?: string }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: string) => void;
  onCreateTask: () => void;
  onCreateSprint: () => void;
}) {
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      {/* Backlog Header - Future work always visible on board */}
      <div className="w-full flex items-center px-4 py-3 bg-[hsl(var(--bg-soft))] transition-colors text-left group">
        <button
          onClick={onToggleCollapse}
          className="flex-1 flex items-center gap-3 text-left"
        >
        <ChevronDown
          className={cn(
            'h-5 w-5 text-[hsl(var(--muted))] transition-transform',
            isCollapsed && '-rotate-90'
          )}
        />

        <div className="flex-1 flex items-center gap-2">
          <h3 className="font-bold text-[hsl(var(--text))]">Backlog</h3>
          <span className="text-xs text-[hsl(var(--muted))]">({tasks.length} work items)</span>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-sm mr-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
          <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-1.5 py-0.5 rounded font-semibold">0</div>
        </div>
        </button>
        <button 
          onClick={onCreateSprint}
          className="shrink-0 ml-4 px-3 py-1.5 bg-[hsl(var(--bg-soft))] hover:bg-[hsl(var(--border))] text-[hsl(var(--text))] text-xs font-semibold rounded transition-colors"
        >
          Create sprint
        </button>
      </div>

      {/* Backlog Tasks */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[hsl(var(--border))]"
          >
            <div className="px-4 py-3 space-y-2" id="backlog-drop-zone">
              {tasks.length > 0 ? (
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      sprint={null}
                      members={members}
                      onTaskClick={onTaskClick}
                      onTaskDelete={onTaskDelete}
                      onTaskStatusChange={onTaskStatusChange}
                      isDragging={false}
                    />
                  ))}
                </SortableContext>
              ) : (
                <div className="py-8 text-center text-[hsl(var(--muted))]">
                  <p className="text-sm">No backlog items - drag sprint tasks here or create new</p>
                </div>
              )}

              {/* Create Task Button */}
              <button
                onClick={onCreateTask}
                className="w-full flex items-center gap-2 px-4 py-2 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] rounded transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create issue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Jira-style backlog view with sprints and backlog
 */
export function JiraStyleBacklog({
  tasks,
  sprints,
  members,
  onTaskMove,
  onTaskDelete,
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  onCreateSprint,
  onSprintAction
}: JiraBacklogProps) {
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set());
  const [collapsedBacklog, setCollapsedBacklog] = useState(false);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintStartDate, setSprintStartDate] = useState('');
  const [sprintEndDate, setSprintEndDate] = useState('');

  // Group tasks by sprint
  const tasksBySprintAndBacklog = useMemo(() => {
    const result: Record<string, Task[]> = {};
    
    sprints.forEach(sprint => {
      result[sprint.id] = tasks.filter(t => t.sprintId === sprint.id);
    });
    
    result['backlog'] = tasks.filter(t => !t.sprintId);

    return result;
  }, [tasks, sprints]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const currentTask = tasks.find(t => t.id === taskId);
    
    if (!currentTask) return;

    let toSprintId: string | null = null;

    // Check if dropping on backlog (empty area or backlog tasks)
    const isBacklogDrop = tasksBySprintAndBacklog['backlog']?.some(t => t.id === overId) || 
                          overId === 'backlog' ||
                          !sprints.some(sprint => tasksBySprintAndBacklog[sprint.id]?.some(t => t.id === overId));
    
    if (isBacklogDrop) {
      toSprintId = null;
    } else {
      // Find which sprint this task is being dropped into
      const targetSprint = sprints.find(sprint => 
        tasksBySprintAndBacklog[sprint.id]?.some(t => t.id === overId)
      );
      
      if (targetSprint) {
        toSprintId = targetSprint.id;
      } else {
        return; // Invalid drop target
      }
    }

    // Only move if actually changing sprint
    if (currentTask.sprintId === toSprintId) {
      return;
    }

    onTaskMove(taskId, toSprintId);
  };

  const handleCreateSprint = () => {
    if (sprintName.trim()) {
      onCreateSprint?.(sprintName, sprintStartDate, sprintEndDate);
      setSprintName('');
      setSprintStartDate('');
      setSprintEndDate('');
      setShowCreateSprintModal(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--bg-soft))] rounded-lg border border-[hsl(var(--border))]">
          <input
            type="text"
            placeholder="Search backlog"
            className="flex-1 outline-none text-sm bg-transparent text-[hsl(var(--text))] placeholder-[hsl(var(--muted))]"
          />
          <button className="text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] text-sm font-medium transition-colors">
            Filter
          </button>
        </div>

        {/* Sprints */}
        <div className="space-y-3">
          {sprints.map(sprint => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              tasks={tasksBySprintAndBacklog[sprint.id] || []}
              members={members}
              isCollapsed={collapsedSprints.has(sprint.id)}
              onToggleCollapse={() => {
                const newSet = new Set(collapsedSprints);
                if (newSet.has(sprint.id)) {
                  newSet.delete(sprint.id);
                } else {
                  newSet.add(sprint.id);
                }
                setCollapsedSprints(newSet);
              }}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
              onTaskStatusChange={onTaskStatusChange}
              onCreateTask={() => onCreateTask(sprint.id)}
              onSprintAction={(action: 'start' | 'complete' | 'configure' | 'delete') => onSprintAction?.(sprint.id, action)}
            />
          ))}
        </div>

        {/* Backlog */}
        <BacklogSection
          tasks={tasksBySprintAndBacklog['backlog'] || []}
          members={members}
          isCollapsed={collapsedBacklog}
          onToggleCollapse={() => setCollapsedBacklog(!collapsedBacklog)}
          onTaskClick={onTaskClick}
          onTaskDelete={onTaskDelete}
          onTaskStatusChange={onTaskStatusChange}
          onCreateTask={() => onCreateTask(null)}
          onCreateSprint={() => setShowCreateSprintModal(true)}
        />

        {/* Create Sprint Modal */}
        <AnimatePresence>
          {showCreateSprintModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowCreateSprintModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[hsl(var(--bg-elevated))] rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[hsl(var(--text))]">Create Sprint</h2>
                  <button
                    onClick={() => setShowCreateSprintModal(false)}
                    className="text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Sprint Name */}
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--text))] mb-1">
                      Sprint Name
                    </label>
                    <input
                      type="text"
                      value={sprintName}
                      onChange={(e) => setSprintName(e.target.value)}
                      placeholder="e.g., Sprint 1"
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--muted))]"
                      autoFocus
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--text))] mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={sprintStartDate}
                      onChange={(e) => setSprintStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))]"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--text))] mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={sprintEndDate}
                      onChange={(e) => setSprintEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateSprintModal(false)}
                    className="flex-1 px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--text))] font-medium hover:bg-[hsl(var(--bg-soft))] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSprint}
                    disabled={!sprintName.trim()}
                    className="flex-1 px-4 py-2 bg-[hsl(var(--accent))] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DndContext>
  );
}

export type { JiraBacklogProps };
