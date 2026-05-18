'use client';

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, SquareKanban, MessageCircle, Code2, Hash, Clock, Flame, Circle, Settings, Paperclip, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomColumnsDialog } from './custom-columns-dialog';

type KanbanBoardProps = {
  onTaskClick: (task: Task) => void;
  filterSprintId?: string | null;
  onCreateTask: () => void;
};

const defaultStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

function TaskCard({ task, onTaskClick }: { task: Task; onTaskClick: (task: Task) => void }) {
  const { members } = useAppStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const assignee = members.find(m => m.id === task.assigneeId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const renderPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flame className="h-3 w-3 text-rose-500" />;
      case 'high': return <Flame className="h-3 w-3 text-orange-500" />;
      case 'medium': return <Clock className="h-3 w-3 text-amber-500" />;
      default: return <Circle className="h-3 w-3 text-[hsl(var(--muted))]" />;
    }
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
      className={cn(
        'group cursor-pointer rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-4 shadow-sm transition-all hover:border-[hsl(var(--accent)/0.5)] hover:shadow-lg hover:shadow-[hsl(var(--accent)/0.05)] active:scale-[0.98]',
        isDragging && 'rotate-2 scale-[1.03] border-[hsl(var(--accent))] bg-[hsl(var(--bg-elevated))] shadow-2xl z-50 opacity-90'
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
             <span className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--bg-soft))] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
               {renderPriorityIcon(task.priority)} {task.priority}
             </span>
             {task.labels?.slice(0, 2).map(label => (
               <span key={label} className="rounded-full bg-[hsl(var(--accent)/0.1)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
                 {label}
               </span>
             ))}
          </div>
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted))] opacity-0 transition group-hover:opacity-100" />
        </div>

        <h3 className="text-sm font-bold leading-snug text-[hsl(var(--text))] group-hover:text-[hsl(var(--accent))] transition-colors">{task.title}</h3>

        {task.description && (
          <p className="line-clamp-2 text-[11px] text-[hsl(var(--muted))] leading-relaxed">{task.description}</p>
        )}

        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[hsl(var(--border-soft))/0.5]">
          <div className="flex items-center gap-3">
            {(task.comments?.length || 0) > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--muted))]">
                <MessageCircle className="h-3 w-3" />
                {task.comments?.length}
              </div>
            )}
            {(task.codeSnippets?.length || 0) > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--muted))]">
                <Code2 className="h-3 w-3" />
                {task.codeSnippets?.length}
              </div>
            )}
            {(task.attachments?.length || 0) > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-[hsl(var(--muted))]">
                <Paperclip className="h-3 w-3" />
                {task.attachments?.length}
              </div>
            )}
          </div>
          
          <div className="shrink-0">
            {assignee ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.6)] text-[10px] font-black text-black shadow-sm" title={assignee.name || 'Unknown'}>
                {assignee.name?.[0] || '?'}
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted))]" title="Unassigned">
                ?
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DroppableColumn({ 
  columnId, 
  title, 
  tasks, 
  onTaskClick, 
  onCreateTask,
  customEmptyState
}: { 
  columnId: string; 
  title: string; 
  tasks: Task[]; 
  onTaskClick: (task: Task) => void; 
  onCreateTask: () => void;
  customEmptyState?: React.ReactNode;
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: columnId });
  const {
    setNodeRef: setSortableRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    isOver: isOverSortable,
  } = useSortable({ id: columnId });

  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex min-h-[600px] flex-col rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))/0.5] p-3 transition-all',
        isOver && 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.03)] shadow-inner',
        isDragging && 'opacity-75 border-[hsl(var(--accent))] scale-[0.98] shadow-2xl shadow-[hsl(var(--accent)/0.3)]',
        isOverSortable && !isDragging && 'ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-[hsl(var(--bg))]'
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3 px-3 pt-2">
        <div className="flex items-center gap-2 flex-1 group">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab active:cursor-grabbing p-1 transition-all duration-200',
              'text-[hsl(var(--muted))] group-hover:text-[hsl(var(--accent))]',
              'hover:bg-[hsl(var(--accent)/0.1)] rounded-lg',
              isDragging && 'text-[hsl(var(--accent))] scale-125'
            )}
            title="Drag to reorder columns"
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
               <h2 className="text-sm font-bold text-[hsl(var(--text))]">{title}</h2>
               <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[hsl(var(--bg-soft))] px-1.5 text-[10px] font-black text-[hsl(var(--muted))]">
                 {tasks.length}
               </span>
            </div>
          </div>
        </div>
        <button 
          type="button" 
          onClick={onCreateTask} 
          className="flex h-8 w-8 items-center justify-center rounded-xl text-[hsl(var(--muted))] transition-all hover:bg-[hsl(var(--bg-soft))] hover:text-[hsl(var(--accent))] hover:scale-110"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3">
          {tasks.map(task => <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />)}
          
          {tasks.length === 0 && (
            customEmptyState || (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border-soft))] p-8 text-center hover:border-[hsl(var(--border))] transition-colors"
            >
              <Circle className="h-8 w-8 mb-3 text-[hsl(var(--muted))] opacity-40" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">No tasks yet</p>
              <p className="text-[10px] text-[hsl(var(--muted))] mt-1">Create a new task or move from other columns</p>
            </motion.div>
            )
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanBoard({ onTaskClick, filterSprintId = null, onCreateTask }: KanbanBoardProps) {
  const { tasks, activeProjectId, sprints, moveTask, projects, updateProject } = useAppStore();
  const project = projects.find(item => item.id === activeProjectId);
  const [isCustomColumnsDialogOpen, setIsCustomColumnsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(['urgent', 'high', 'medium', 'low']);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get columns from project, fallback to default
  const [columns, setColumns] = useState(
    project?.columns || [
      { id: 'todo', title: 'Todo' },
      { id: 'in_progress', title: 'In Progress' },
      { id: 'in_review', title: 'In Review' },
      { id: 'done', title: 'Done' }
    ]
  );

  const boardTasks = useMemo(() => {
    let filteredTasks = tasks.filter(task => {
      if (task.projectId !== activeProjectId) return false;
      
      if (filterSprintId != null) {
        return task.sprintId === filterSprintId;
      }

      const projectSprints = sprints.filter(sprint => sprint.projectId === activeProjectId);
      const activeSprint = projectSprints.find(sprint => sprint.status === 'active');

      if (projectSprints.length > 0) {
        // Unscheduled backlog tasks (no sprintId) are always shown on the board
        if (!task.sprintId) return true;

        // Tasks in sprints are only shown if that sprint is active
        if (!activeSprint) return false;
        return task.sprintId === activeSprint.id;
      }
      
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.labels?.some(label => label.toLowerCase().includes(query))
      );
    }

    // Apply priority filter
    filteredTasks = filteredTasks.filter(task => selectedPriorities.includes(task.priority));

    // Apply assignee filter
    if (selectedAssignees.length > 0) {
      filteredTasks = filteredTasks.filter(task => 
        task.assigneeId ? selectedAssignees.includes(task.assigneeId) : false
      );
    }

    return filteredTasks;
  }, [activeProjectId, filterSprintId, tasks, project?.type, sprints, searchQuery, selectedPriorities, selectedAssignees]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    // Check if this is a column reorder
    const columnIds = columns.map(col => col.id);
    if (columnIds.includes(active.id as string) && columnIds.includes(over.id as string)) {
      const oldIndex = columns.findIndex(col => col.id === active.id);
      const newIndex = columns.findIndex(col => col.id === over.id);
      
      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        setColumns(newColumns);
        
        // Update project with new column order
        if (project) {
          updateProject(activeProjectId || '', {
            ...project,
            columns: newColumns
          });
        }
      }
      return;
    }

    // Otherwise, it's a task movement
    const nextStatus = over.id as string;
    
    if (!columnIds.includes(nextStatus)) {
      return;
    }

    const task = boardTasks.find(item => item.id === active.id);
    if (task && task.status !== nextStatus) {
      moveTask(task.id, nextStatus as TaskStatus);
    }
  };

  if (!project) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-[32px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--bg-elevated))/0.5] p-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] shadow-inner">
          <SquareKanban className="h-10 w-10 opacity-20" />
        </div>
        <h3 className="text-2xl font-bold text-[hsl(var(--text))]">No Project Selected</h3>
        <p className="mt-2 max-w-xs text-sm text-[hsl(var(--muted))] leading-relaxed">
          Select a project from the sidebar to visualize your workflow and manage team velocity.
        </p>
      </div>
    );
  }

  const activeSprint = sprints.find(s => s.projectId === activeProjectId && s.status === 'active');
  const isScrumWithoutActiveSprint = project?.type === 'scrum' && !activeSprint;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] shadow-inner">
            <SquareKanban className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Kanban Board</p>
            <h1 className="text-3xl font-bold text-[hsl(var(--text))]">{project?.name}</h1>
            <p className="text-xs text-[hsl(var(--muted))] mt-1">💡 Tip: Drag columns by their handle to rearrange your workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setIsCustomColumnsDialogOpen(true)}
            className="rounded-2xl border border-[hsl(var(--border-soft))] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/5 active:scale-95 flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Customize Columns
          </button>
        </div>
      </div>

      <DndContext collisionDetection={closestCorners} sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Search and Filter Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row gap-3 rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] p-4 backdrop-blur-sm"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks by title, description, or labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border-soft))] text-sm text-[hsl(var(--text))] placeholder-[hsl(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.5)] transition-all"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border',
              showFilters
                ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button
            onClick={() => setHideEmptyColumns(!hideEmptyColumns)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border',
              hideEmptyColumns
                ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'
            )}
          >
            {hideEmptyColumns ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </motion.div>

        {/* Expanded Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] p-4 backdrop-blur-sm space-y-4"
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
                          if (selectedPriorities.includes(priority)) {
                            setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
                          } else {
                            setSelectedPriorities([...selectedPriorities, priority]);
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all border',
                          selectedPriorities.includes(priority)
                            ? 'bg-[hsl(var(--accent)/0.15)] border-[hsl(var(--accent)/0.3)] text-[hsl(var(--accent))]'
                            : 'bg-[hsl(var(--bg-soft))] border-[hsl(var(--border-soft))] text-[hsl(var(--muted))]'
                        )}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
            {columns.map((column, index) => {
              const columnTasks = boardTasks.filter(task => {
                const hasBacklogColumn = columns.some(col => col.id === 'backlog');
                if (column.id === 'todo' && !hasBacklogColumn) {
                  return task.status === 'todo' || task.status === 'backlog' || !task.status;
                }
                return task.status === column.id;
              });
              const shouldHide = hideEmptyColumns && columnTasks.length === 0;
              
              return !shouldHide ? (
                <DroppableColumn
                  key={column.id}
                  columnId={column.id}
                  title={column.title}
                  tasks={columnTasks}
                  onTaskClick={onTaskClick}
                  onCreateTask={onCreateTask}
                  customEmptyState={
                    isScrumWithoutActiveSprint && index === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/20 bg-blue-500/5 p-6 text-center hover:border-blue-500/40 transition-colors"
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mb-4 shadow-sm">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-[hsl(var(--text))]">Get started in the backlog</h3>
                        <p className="text-xs text-[hsl(var(--muted))] mt-1 mb-5">Plan and start a sprint to see work here.</p>
                        <button 
                          onClick={() => useAppStore.getState().setActiveView('backlog')}
                          className="px-4 py-2 bg-[hsl(var(--bg-panel))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          Go to Backlog
                        </button>
                      </motion.div>
                    ) : undefined
                  }
                />
              ) : null;
            })}
          </SortableContext>
        </div>
      </DndContext>

      <CustomColumnsDialog 
        isOpen={isCustomColumnsDialogOpen} 
        onClose={() => setIsCustomColumnsDialogOpen(false)} 
        projectId={activeProjectId || ''}
      />
    </div>
  );
}