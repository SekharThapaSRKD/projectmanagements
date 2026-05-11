'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Task, TaskStatus } from '@/lib/types';
import { ChevronDown, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SwimlaneModeType = 'none' | 'assignee' | 'epic' | 'priority' | 'status';

interface SwimLane {
  id: string;
  name: string;
  type: SwimlaneModeType;
  tasks: Task[];
  isCollapsed?: boolean;
}

interface SwimlanesProps {
  tasks: Task[];
  columns: TaskStatus[];
  swimlaneMode: SwimlaneModeType;
  members: Array<{ id: string; name: string; avatar?: string }>;
  onTaskClick: (task: Task) => void;
  renderCard: (task: Task, swimlaneId: string) => React.ReactNode;
  renderColumnHeader?: (column: TaskStatus) => React.ReactNode;
}

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { todo: 0, in_progress: 1, in_review: 2, done: 3 };

/**
 * Groups tasks into swimlanes based on the grouping mode
 */
export function groupTasksIntoSwimlanes(
  tasks: Task[],
  mode: SwimlaneModeType,
  members: Array<{ id: string; name: string; avatar?: string }>
): SwimLane[] {
  if (mode === 'none') {
    return [{
      id: 'default',
      name: 'Tasks',
      type: 'none',
      tasks,
      isCollapsed: false
    }];
  }

  const grouped = new Map<string, { id: string; name: string; tasks: Task[] }>();

  tasks.forEach(task => {
    let key = '';
    let name = '';

    switch (mode) {
      case 'assignee': {
        const assignee = members.find(m => m.id === task.assigneeId);
        key = task.assigneeId || 'unassigned';
        name = assignee?.name || 'Unassigned';
        break;
      }
      case 'epic': {
        key = task.epic || 'no-epic';
        name = task.epic || 'No Epic';
        break;
      }
      case 'priority': {
        key = task.priority || 'low';
        name = (task.priority || 'low').charAt(0).toUpperCase() + (task.priority || 'low').slice(1);
        break;
      }
      case 'status': {
        key = task.status || 'todo';
        name = (task.status || 'todo').replace('_', ' ').charAt(0).toUpperCase() + (task.status || 'todo').slice(1);
        break;
      }
    }

    if (!grouped.has(key)) {
      grouped.set(key, { id: key, name, tasks: [] });
    }
    grouped.get(key)!.tasks.push(task);
  });

  let swimlanes = Array.from(grouped.values()).map(lane => ({
    ...lane,
    type: mode,
    isCollapsed: false
  }));

  // Sort swimlanes based on mode
  if (mode === 'priority') {
    swimlanes.sort((a, b) => {
      const aOrder = PRIORITY_ORDER[a.id as keyof typeof PRIORITY_ORDER] ?? 999;
      const bOrder = PRIORITY_ORDER[b.id as keyof typeof PRIORITY_ORDER] ?? 999;
      return aOrder - bOrder;
    });
  } else if (mode === 'status') {
    swimlanes.sort((a, b) => {
      const aOrder = STATUS_ORDER[a.id as keyof typeof STATUS_ORDER] ?? 999;
      const bOrder = STATUS_ORDER[b.id as keyof typeof STATUS_ORDER] ?? 999;
      return aOrder - bOrder;
    });
  } else {
    swimlanes.sort((a, b) => a.name.localeCompare(b.name));
  }

  return swimlanes;
}

/**
 * Swimlane header component
 */
function SwimlaneHeader({
  lane,
  isCollapsed,
  onToggleCollapse,
  taskCount
}: {
  lane: SwimLane;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  taskCount: number;
}) {
  const getIcon = () => {
    switch (lane.type) {
      case 'assignee':
        return <User className="h-4 w-4" />;
      case 'priority':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-[hsl(var(--bg-soft))] rounded-lg border border-[hsl(var(--border-soft))] cursor-pointer hover:bg-[hsl(var(--bg-elevated))] transition-colors group"
      onClick={onToggleCollapse}
    >
      <ChevronDown
        className={cn(
          'h-4 w-4 text-[hsl(var(--muted))] transition-transform',
          isCollapsed && '-rotate-90'
        )}
      />

      {getIcon()}

      <div className="flex-1">
        <h4 className="text-sm font-semibold text-[hsl(var(--text))]">{lane.name}</h4>
      </div>

      <span className="text-xs font-medium px-2 py-1 bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] rounded-full">
        {taskCount}
      </span>
    </div>
  );
}

/**
 * Swimlane group component
 */
function SwimlaneGroup({
  lane,
  columns,
  isCollapsed,
  onToggleCollapse,
  renderCard,
  renderColumnHeader
}: {
  lane: SwimLane;
  columns: TaskStatus[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  renderCard: (task: Task, swimlaneId: string) => React.ReactNode;
  renderColumnHeader?: (column: TaskStatus) => React.ReactNode;
}) {
  const tasksByColumn = useMemo(() => {
    const grouped = new Map<TaskStatus, Task[]>();
    columns.forEach(col => grouped.set(col, []));
    lane.tasks.forEach(task => {
      const col = grouped.get(task.status as TaskStatus) || [];
      grouped.set(task.status as TaskStatus, [...col, task]);
    });
    return grouped;
  }, [lane.tasks, columns]);

  return (
    <div className="space-y-2">
      <SwimlaneHeader
        lane={lane}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        taskCount={lane.tasks.length}
      />

      {!isCollapsed && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map(column => (
            <div key={column} className="space-y-2">
              {renderColumnHeader?.(column)}
              <div className="min-h-[400px] p-3 rounded-lg bg-[hsl(var(--bg-soft)/0.5)] border border-dashed border-[hsl(var(--border))] space-y-2">
                {(tasksByColumn.get(column) || []).map(task => (
                  <div key={task.id}>
                    {renderCard(task, lane.id)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main swimlanes component
 */
export function Swimlanes({
  tasks,
  columns,
  swimlaneMode,
  members,
  onTaskClick,
  renderCard,
  renderColumnHeader
}: SwimlanesProps) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  const swimlanes = useMemo(
    () => groupTasksIntoSwimlanes(tasks, swimlaneMode, members),
    [tasks, swimlaneMode, members]
  );

  const handleToggleCollapse = useCallback((laneId: string) => {
    setCollapsedLanes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(laneId)) {
        newSet.delete(laneId);
      } else {
        newSet.add(laneId);
      }
      return newSet;
    });
  }, []);

  if (swimlaneMode === 'none') {
    return (
      <div className="space-y-4">
        {swimlanes.map(lane => (
          <SwimlaneGroup
            key={lane.id}
            lane={lane}
            columns={columns}
            isCollapsed={false}
            onToggleCollapse={() => {}}
            renderCard={renderCard}
            renderColumnHeader={renderColumnHeader}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {swimlanes.map(lane => (
        <SwimlaneGroup
          key={lane.id}
          lane={lane}
          columns={columns}
          isCollapsed={collapsedLanes.has(lane.id)}
          onToggleCollapse={() => handleToggleCollapse(lane.id)}
          renderCard={renderCard}
          renderColumnHeader={renderColumnHeader}
        />
      ))}
    </div>
  );
}

export type { SwimLane };
