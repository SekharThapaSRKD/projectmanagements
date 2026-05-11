'use client';

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, closestCorners, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, SquareKanban, MessageCircle, Code2, Hash, Clock, Flame, Circle, Settings, Paperclip } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { motion } from 'framer-motion';
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

function DroppableColumn({ columnId, title, tasks, onTaskClick, onCreateTask }: { columnId: string; title: string; tasks: Task[]; onTaskClick: (task: Task) => void; onCreateTask: () => void }) {
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
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border-soft))] p-8 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">No tasks</p>
            </div>
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
    return tasks.filter(task => {
      if (task.projectId !== activeProjectId) return false;
      
      if (filterSprintId != null) {
        return task.sprintId === filterSprintId;
      }
      
      if (project?.type === 'scrum') {
        // For scrum projects: only show backlog + active sprint tasks
        // Hide tasks from planning sprints (they're not on the board yet)
        if (!task.sprintId) {
          // Backlog task - always visible
          return true;
        }
        
        // Check sprint status - only show active sprints
        const sprint = sprints.find(s => s.id === task.sprintId);
        if (!sprint) return true; // If sprint not found, show task (fallback)
        
        // Only show tasks from active or completed sprints
        // Hide tasks from planning sprints
        return sprint.status === 'active' || sprint.status === 'completed';
      }
      
      return true;
    });
  }, [activeProjectId, filterSprintId, tasks, project?.type, sprints]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
            {columns.map(column => (
              <DroppableColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={boardTasks.filter(task => task.status === column.id)}
                onTaskClick={onTaskClick}
                onCreateTask={onCreateTask}
              />
            ))}
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