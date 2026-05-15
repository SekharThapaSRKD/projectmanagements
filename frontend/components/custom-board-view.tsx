'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Settings, MoreVertical } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Task, Board } from '@/lib/types';
import { motion } from 'framer-motion';

type CustomBoardViewProps = {
  board: Board;
  onEditBoard?: (board: Board) => void;
  onDeleteBoard?: (boardId: string) => void;
};

function CustomTaskCard({ task, columnColor }: { task: Task; columnColor?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layoutId={task.id}
      className={cn(
        'group cursor-move rounded-xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-3 shadow-sm transition-all hover:border-[hsl(var(--accent)/0.5)] hover:shadow-md active:scale-[0.98]',
        isDragging && 'rotate-1 scale-[1.02] border-[hsl(var(--accent))] bg-[hsl(var(--bg-elevated))] shadow-lg z-50'
      )}
    >
      <div className={cn(
        'h-1 rounded-full mb-2',
        columnColor ? '' : 'bg-[hsl(var(--accent))]'
      )} style={columnColor ? { backgroundColor: columnColor } : {}} />
      <h4 className="font-medium text-white text-sm line-clamp-2">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-[hsl(var(--muted))] line-clamp-1 mt-1">{task.description}</p>
      )}
      {task.assigneeId && (
        <div className="mt-2 flex items-center gap-1">
          <div className="h-5 w-5 rounded-full bg-[hsl(var(--accent))] text-xs font-bold flex items-center justify-center text-white">
            {task.assigneeId.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </motion.article>
  );
}

function CustomBoardColumn({ 
  column, 
  tasks, 
  onCreateTask 
}: { 
  column: any;
  tasks: Task[];
  onCreateTask: () => void;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col rounded-xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] p-4 w-full min-w-[280px] sm:min-w-[320px] max-h-[600px] overflow-hidden flex-shrink-0"
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[hsl(var(--border-soft))]">
        <div
          className="h-3 w-3 rounded"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="font-semibold text-white flex-1">{column.name}</h3>
        <span className="text-xs text-[hsl(var(--muted))] bg-[hsl(var(--bg))] px-2 py-1 rounded">
          {tasks.length}
        </span>
      </div>

      {/* Tasks Container */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[hsl(var(--muted))] text-sm">
              No tasks yet
            </div>
          ) : (
            tasks.map(task => (
              <CustomTaskCard
                key={task.id}
                task={task}
                columnColor={column.color}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      <button
        onClick={onCreateTask}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--border-soft))] bg-transparent px-3 py-2 text-sm text-[hsl(var(--muted))] transition-all hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.05)]"
      >
        <Plus className="h-4 w-4" />
        Add Task
      </button>
    </div>
  );
}

export function CustomBoardView({ 
  board, 
  onEditBoard, 
  onDeleteBoard 
}: CustomBoardViewProps) {
  const { tasks } = useAppStore();
  const [showMenu, setShowMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const boardTasks = tasks.filter(t => t.projectId === board.projectId);

  const handleDragEnd = (event: DragEndEvent) => {
    // TODO: Handle task movement to different columns
  };

  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{board.name}</h1>
          {board.description && (
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">{board.description}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-[hsl(var(--muted))] hover:text-white transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] shadow-lg z-20">
              <button
                onClick={() => {
                  onEditBoard?.(board);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-white hover:bg-[hsl(var(--bg-input))] first:rounded-t-lg"
              >
                <Settings className="h-4 w-4" />
                Edit Board
              </button>
              <button
                onClick={() => {
                  onDeleteBoard?.(board.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-[hsl(var(--bg-input))] last:rounded-b-lg"
              >
                <Settings className="h-4 w-4" />
                Delete Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Board Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
          {board.columns.map(column => (
            <CustomBoardColumn
              key={column.id}
              column={column}
              tasks={boardTasks.filter(t => {
                // Filter tasks for this column based on custom board structure
                return true; // TODO: Filter based on board-specific task mapping
              })}
              onCreateTask={() => {
                // TODO: Create task in this column
              }}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
