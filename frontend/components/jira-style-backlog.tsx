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
  X,
  Inbox,
  Zap,
  Target,
  TrendingUp
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
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border))] rounded-xl hover:shadow-lg hover:border-[hsl(var(--accent))] transition-all duration-200 group',
        isDragging && 'shadow-xl scale-102 border-[hsl(var(--accent))]'
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
    </motion.div>
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
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = tasks
    .filter(t => t.status === 'done')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const taskIds = tasks.map(t => t.id);

  const sprintStatusColor = {
    planning: 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border))]',
    active: 'bg-[hsl(var(--accent)/0.03)] border-l-4 border-l-[hsl(var(--accent))] border-[hsl(var(--border))]',
    completed: 'bg-green-50/30 dark:bg-green-900/10 border-l-4 border-l-green-500 border-[hsl(var(--border))]'
  };

  const [optionOpen, setOptionOpen] = useState(false);

  return (
    <motion.div 
      layout
      className={cn(
        'rounded-xl border transition-all', 
        sprintStatusColor[sprint.status],
        optionOpen ? 'overflow-visible z-40 relative' : 'overflow-hidden relative z-10'
      )}
    >
      {/* Sprint Header */}
      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[hsl(var(--bg-soft))] transition-colors group">
        {/* Left Section: Collapse and Info */}
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
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-[hsl(var(--muted))]" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Sprint Status Indicator */}
              <div className={cn(
                'h-2.5 w-2.5 rounded-full',
                sprint.status === 'planning' && 'bg-gray-400',
                sprint.status === 'active' && 'bg-blue-500 animate-pulse',
                sprint.status === 'completed' && 'bg-green-500'
              )} />
              
              <h3 className="font-bold text-[hsl(var(--text))]">{sprint.name}</h3>
              
              {sprint.status === 'active' && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  Active
                </span>
              )}
              {sprint.status === 'completed' && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Completed
                </span>
              )}
              
              <span className="text-xs text-[hsl(var(--muted))]">
                {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
              </span>

              {sprint.startDate && (
                <span className="text-xs text-[hsl(var(--muted))] flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Stats */}
        <div className="shrink-0 flex items-center gap-3 mr-3">
          {/* Completion Progress */}
          <div className="flex items-center gap-2 text-xs">
            {totalPoints > 0 && (
              <>
                <div className="w-20 h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedPoints / totalPoints) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-green-400 to-green-500"
                  />
                </div>
                <span className="text-[hsl(var(--muted))] font-medium">{completedPoints}/{totalPoints}pts</span>
              </>
            )}
          </div>

          {/* Task Stats */}
          <div className="flex items-center gap-1.5">
            {completedCount > 0 && (
              <div className="flex items-center justify-center h-6 px-1.5 rounded-full bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {completedCount}
              </div>
            )}
            {inProgressCount > 0 && (
              <div className="flex items-center justify-center h-6 px-1.5 rounded-full bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                <Zap className="h-3 w-3 mr-1" />
                {inProgressCount}
              </div>
            )}
          </div>
        </div>

        {/* Sprint Actions */}
        <div className="shrink-0 ml-2 flex items-center gap-2 relative">{optionOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))] shadow-xl overflow-hidden"
            >
              <button
                onClick={() => { setOptionOpen(false); onSprintAction?.('configure'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors flex items-center gap-2 text-[hsl(var(--text))]"
              >
                <Edit2 className="h-4 w-4" />
                Configure
              </button>
              <button
                onClick={() => { setOptionOpen(false); onSprintAction?.('delete'); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[hsl(var(--bg-soft))] transition-colors flex items-center gap-2 text-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </motion.div>
          )}
          
          {sprint.status === 'planning' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                if (tasks.length > 0) onSprintAction?.('start');
              }}
              disabled={tasks.length === 0}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              Start sprint
            </motion.button>
          )}
          {sprint.status === 'active' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onSprintAction?.('complete');
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Complete
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={(e) => { e.stopPropagation(); setOptionOpen(!optionOpen); }}
            className="p-1.5 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))] rounded-lg transition-all duration-200"
            title="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Sprint Tasks */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[hsl(var(--border))]"
          >
            <div className="px-4 py-3 space-y-2">
              {tasks.length > 0 ? (
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  {tasks.map((task) => (
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
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6 rounded-lg border-2 border-dashed border-[hsl(var(--border))] text-center text-[hsl(var(--muted))] bg-[hsl(var(--bg-soft))/0.3]"
                >
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No work items yet</p>
                  <p className="text-xs opacity-75 mt-1">Drag items from backlog or create new</p>
                </motion.div>
              )}

              {/* Create Task Button */}
              <motion.button
                whileHover={{ x: 4 }}
                onClick={onCreateTask}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))] rounded-lg transition-all duration-200 text-sm font-medium group"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                Create issue
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const todoCount = tasks.filter(t => t.status === 'todo' || !t.status).length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

  return (
    <motion.div layout className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
      {/* Backlog Header */}
      <div className="w-full flex items-center px-4 py-3.5 bg-[hsl(var(--bg-soft))] hover:bg-[hsl(var(--border))] transition-colors text-left group">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={onToggleCollapse}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-[hsl(var(--muted))]" />
          </motion.div>

          <div className="flex-1 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <h3 className="font-bold text-[hsl(var(--text))]">Backlog</h3>
            <span className="text-xs text-[hsl(var(--muted))]">
              {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Backlog Stats */}
          <div className="shrink-0 flex items-center gap-1.5 mr-3">
            {inProgressCount > 0 && (
              <div className="flex items-center justify-center h-6 px-1.5 rounded-full bg-blue-100/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                <Zap className="h-3 w-3 mr-1" />
                {inProgressCount}
              </div>
            )}
            <div className="flex items-center justify-center h-6 px-1.5 rounded-full bg-gray-100/50 dark:bg-gray-800/20 text-gray-700 dark:text-gray-400 text-xs font-semibold">
              <Inbox className="h-3 w-3 mr-1" />
              {todoCount}
            </div>
          </div>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateSprint}
          className="shrink-0 ml-3 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Create sprint
        </motion.button>
      </div>

      {/* Backlog Tasks */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
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
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 rounded-lg border-2 border-dashed border-[hsl(var(--border))] text-center text-[hsl(var(--muted))] bg-[hsl(var(--bg-soft))/0.3]"
                >
                  <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold">Your backlog is empty</p>
                  <p className="text-xs opacity-70 mt-1">Start by creating a new issue or sprint</p>
                </motion.div>
              )}

              {/* Create Task Button */}
              <motion.button
                whileHover={{ x: 4 }}
                onClick={onCreateTask}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[hsl(var(--muted))] hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--text))] rounded-lg transition-all duration-200 text-sm font-medium group"
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                Create issue
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const [searchQuery, setSearchQuery] = useState('');

  // Group tasks by sprint
  const tasksBySprintAndBacklog = useMemo(() => {
    const result: Record<string, Task[]> = {};
    
    sprints.forEach(sprint => {
      result[sprint.id] = tasks.filter(t => t.sprintId === sprint.id);
    });
    
    result['backlog'] = tasks.filter(t => !t.sprintId);

    return result;
  }, [tasks, sprints]);

  // Filter tasks based on search query
  const filteredTasksBySprintAndBacklog = useMemo(() => {
    if (!searchQuery.trim()) return tasksBySprintAndBacklog;
    
    const query = searchQuery.toLowerCase();
    const result: Record<string, Task[]> = {};
    
    Object.entries(tasksBySprintAndBacklog).forEach(([sprintId, sprintTasks]) => {
      result[sprintId] = sprintTasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query)
      );
    });
    
    return result;
  }, [tasksBySprintAndBacklog, searchQuery]);

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

  // Calculate totals
  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === 'done').length;
  const activeSprints = sprints.filter(s => s.status === 'active').length;

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-5">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Backlog</h2>
              <p className="text-sm text-[hsl(var(--muted))] mt-1">
                {totalCompleted} of {totalTasks} items completed
                {activeSprints > 0 && ` • ${activeSprints} active sprint${activeSprints !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--bg-soft))] rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--accent))] transition-all duration-200"
          >
            <svg className="h-5 w-5 text-[hsl(var(--muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, description, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent text-[hsl(var(--text))] placeholder-[hsl(var(--muted))]"
            />
            {searchQuery && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSearchQuery('')}
                className="text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </motion.div>

          {/* Progress Bar */}
          {totalTasks > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(totalCompleted / totalTasks) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
            </motion.div>
          )}
        </div>

        {/* Sprints */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sprints.map((sprint, index) => (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <SprintSection
                  sprint={sprint}
                  tasks={filteredTasksBySprintAndBacklog[sprint.id] || []}
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Backlog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BacklogSection
            tasks={filteredTasksBySprintAndBacklog['backlog'] || []}
            members={members}
            isCollapsed={collapsedBacklog}
            onToggleCollapse={() => setCollapsedBacklog(!collapsedBacklog)}
            onTaskClick={onTaskClick}
            onTaskDelete={onTaskDelete}
            onTaskStatusChange={onTaskStatusChange}
            onCreateTask={() => onCreateTask(null)}
            onCreateSprint={() => setShowCreateSprintModal(true)}
          />
        </motion.div>

        {/* Create Sprint Modal */}
        <AnimatePresence>
          {showCreateSprintModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
              onClick={() => setShowCreateSprintModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[hsl(var(--bg-elevated))] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-[hsl(var(--border))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Create new</p>
                    <h2 className="text-xl font-bold text-[hsl(var(--text))]">Sprint</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateSprintModal(false)}
                    className="text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                <div className="space-y-4">
                  {/* Sprint Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[hsl(var(--text))] mb-2">
                      Sprint Name
                    </label>
                    <input
                      type="text"
                      value={sprintName}
                      onChange={(e) => setSprintName(e.target.value)}
                      placeholder="e.g., Sprint 1"
                      className="w-full px-4 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--muted))] transition-all duration-200"
                      autoFocus
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-semibold text-[hsl(var(--text))] mb-2">
                      Start Date <span className="text-xs font-normal text-[hsl(var(--muted))]">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={sprintStartDate}
                      onChange={(e) => setSprintStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))] transition-all duration-200"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-semibold text-[hsl(var(--text))] mb-2">
                      End Date <span className="text-xs font-normal text-[hsl(var(--muted))]">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={sprintEndDate}
                      onChange={(e) => setSprintEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent outline-none text-sm text-[hsl(var(--text))] transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateSprintModal(false)}
                    className="flex-1 px-4 py-2.5 border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--text))] font-semibold hover:bg-[hsl(var(--bg-soft))] transition-all duration-200"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateSprint}
                    disabled={!sprintName.trim()}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-semibold disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Create Sprint
                  </motion.button>
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
