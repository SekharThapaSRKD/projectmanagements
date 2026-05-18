'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, PointerSensor, KeyboardSensor, useSensors, useSensor } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VirtualizedBoardProps {
  tasks: Task[];
  columns: TaskStatus[];
  containerHeight: number;
  columnWidth: number;
  itemHeight: number;
  onTaskMove: (taskId: string, toStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
  renderCard: (task: Task, index: number) => React.ReactNode;
  renderColumn: (column: TaskStatus, tasks: Task[], index: number) => React.ReactNode;
  enableAutoScroll?: boolean;
  autoScrollMargin?: number;
}

interface ColumnVirtualState {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
}

/**
 * Hook for managing virtualization state in a column
 */
function useColumnVirtualization(
  items: Task[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
): ColumnVirtualState {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // +2 for buffer
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      visibleCount
    };
  }, [containerHeight, itemHeight, scrollTop, items.length]);
}

/**
 * Memoized task card wrapper for performance
 */
const VirtualTaskCard = React.memo(
  ({ task, index, renderCard }: { task: Task; index: number; renderCard: (task: Task, index: number) => React.ReactNode }) => (
    <div key={task.id} data-task-id={task.id}>
      {renderCard(task, index)}
    </div>
  ),
  (prev, next) => prev.task.id === next.task.id && prev.index === next.index
);
VirtualTaskCard.displayName = 'VirtualTaskCard';

/**
 * Memoized column component
 */
const VirtualColumn = React.memo(
  ({
    column,
    tasks,
    columnIndex,
    containerHeight,
    itemHeight,
    renderCard,
    renderColumn,
    onTaskClick,
    scrollTop,
    autoScroll
  }: {
    column: TaskStatus;
    tasks: Task[];
    columnIndex: number;
    containerHeight: number;
    itemHeight: number;
    renderCard: (task: Task, index: number) => React.ReactNode;
    renderColumn: (column: TaskStatus, tasks: Task[], index: number) => React.ReactNode;
    onTaskClick: (task: Task) => void;
    scrollTop: number;
    autoScroll?: number;
  }) => {
    const virtualState = useColumnVirtualization(tasks, containerHeight, itemHeight, scrollTop);
    const virtualTasks = tasks.slice(virtualState.startIndex, virtualState.endIndex);
    const offsetY = virtualState.startIndex * itemHeight;

    return (
      <div className="flex-1 flex flex-col gap-2">
        {renderColumn(column, tasks, columnIndex)}
        <div
          className="flex-1 overflow-hidden relative"
          style={{ height: containerHeight }}
        >
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              transition: autoScroll ? 'none' : undefined
            }}
          >
            {virtualTasks.map((task, idx) => (
              <VirtualTaskCard
                key={task.id}
                task={task}
                index={virtualState.startIndex + idx}
                renderCard={renderCard}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.column === next.column &&
    prev.tasks === next.tasks &&
    prev.scrollTop === next.scrollTop &&
    prev.containerHeight === next.containerHeight
);
VirtualColumn.displayName = 'VirtualColumn';

/**
 * Main virtualized board component
 */
export function VirtualizedBoard({
  tasks,
  columns,
  containerHeight,
  columnWidth,
  itemHeight,
  onTaskMove,
  onTaskClick,
  renderCard,
  renderColumn,
  enableAutoScroll = true,
  autoScrollMargin = 50
}: VirtualizedBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [autoScrollVelocity, setAutoScrollVelocity] = useState(0);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped = new Map<TaskStatus, Task[]>();
    columns.forEach(col => grouped.set(col, []));
    tasks.forEach(task => {
      const col = grouped.get(task.status as TaskStatus) || [];
      grouped.set(task.status as TaskStatus, [...col, task]);
    });
    return grouped;
  }, [tasks, columns]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Handle auto-scroll
  useEffect(() => {
    if (autoScrollVelocity === 0) {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
      return;
    }

    autoScrollRef.current = setInterval(() => {
      if (boardRef.current) {
        boardRef.current.scrollTop += autoScrollVelocity;
      }
    }, 16); // ~60fps

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [autoScrollVelocity]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext sensors={sensors} onDragOver={(event) => {
      if (!enableAutoScroll || !boardRef.current) return;

      const { active, over } = event;
      if (!over) return;

      const rect = boardRef.current.getBoundingClientRect();
      const cursorY = (event as any).delta.y;

      const topDistance = cursorY - rect.top;
      const bottomDistance = rect.bottom - cursorY;

      if (topDistance < autoScrollMargin) {
        setAutoScrollVelocity(-10);
      } else if (bottomDistance < autoScrollMargin) {
        setAutoScrollVelocity(10);
      } else {
        setAutoScrollVelocity(0);
      }
    }}>
      <div
        ref={boardRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto overflow-x-hidden"
      >
        <div className="flex gap-4 p-4 w-full">
          {columns.map((column, idx) => (
            <div key={column} style={{ width: columnWidth }} className="shrink-0">
              <VirtualColumn
                column={column}
                tasks={tasksByColumn.get(column) || []}
                columnIndex={idx}
                containerHeight={containerHeight}
                itemHeight={itemHeight}
                renderCard={renderCard}
                renderColumn={renderColumn}
                onTaskClick={onTaskClick}
                scrollTop={scrollTop}
                autoScroll={autoScrollVelocity}
              />
            </div>
          ))}
        </div>
      </div>
    </DndContext>
  );
}

export type { VirtualizedBoardProps };
