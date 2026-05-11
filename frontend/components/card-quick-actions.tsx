'use client';

import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Flag,
  ArrowRight,
  Tag,
  Clock,
  MoreVertical,
  X,
  Check
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

type QuickActionType = 'assign' | 'priority' | 'status' | 'labels' | 'time';

interface QuickAction {
  type: QuickActionType;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

interface CardQuickActionsProps {
  task: Task;
  members: Array<{ id: string; name: string; avatar?: string }>;
  onAssign: (taskId: string, memberId: string) => void;
  onChangePriority: (taskId: string, priority: string) => void;
  onChangeStatus: (taskId: string, status: string) => void;
  onAddLabel: (taskId: string, label: string) => void;
  onLogTime: (taskId: string, hours: number) => void;
  compact?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { type: 'assign', label: 'Assign', icon: <UserPlus className="h-4 w-4" /> },
  { type: 'priority', label: 'Priority', icon: <Flag className="h-4 w-4" /> },
  { type: 'status', label: 'Status', icon: <ArrowRight className="h-4 w-4" /> },
  { type: 'labels', label: 'Labels', icon: <Tag className="h-4 w-4" /> },
  { type: 'time', label: 'Log Time', icon: <Clock className="h-4 w-4" /> }
];

/**
 * Quick action button in card hover state
 */
function QuickActionButton({
  action,
  onClick,
  isActive = false
}: {
  action: QuickAction;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-lg transition-colors flex items-center justify-center',
        isActive
          ? 'bg-[hsl(var(--accent))] text-black'
          : 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]'
      )}
      title={action.label}
    >
      {action.icon}
    </button>
  );
}

/**
 * Assign user quick action menu
 */
function AssignQuickAction({
  task,
  members,
  onAssign,
  onClose
}: {
  task: Task;
  members: Array<{ id: string; name: string; avatar?: string }>;
  onAssign: (taskId: string, memberId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full mt-2 left-0 z-50 min-w-max bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--muted))] uppercase">
        Assign to
      </div>

      <button
        onClick={() => {
          onAssign(task.id, '');
          onClose();
        }}
        className={cn(
          'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
          !task.assigneeId
            ? 'bg-[hsl(var(--accent))] text-black'
            : 'hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]'
        )}
      >
        Unassigned
      </button>

      {members.map(member => (
        <button
          key={member.id}
          onClick={() => {
            onAssign(task.id, member.id);
            onClose();
          }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
            task.assigneeId === member.id
              ? 'bg-[hsl(var(--accent))] text-black'
              : 'hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]'
          )}
        >
          {task.assigneeId === member.id && <Check className="h-3 w-3" />}
          {member.name}
        </button>
      ))}
    </div>
  );
}

/**
 * Priority quick action menu
 */
function PriorityQuickAction({
  task,
  onChangePriority,
  onClose
}: {
  task: Task;
  onChangePriority: (taskId: string, priority: string) => void;
  onClose: () => void;
}) {
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-500/10 text-rose-600',
    high: 'bg-orange-500/10 text-orange-600',
    medium: 'bg-amber-500/10 text-amber-600',
    low: 'bg-slate-500/10 text-slate-600'
  };

  return (
    <div className="absolute top-full mt-2 left-0 z-50 min-w-max bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--muted))] uppercase">
        Priority
      </div>

      {priorities.map(priority => (
        <button
          key={priority}
          onClick={() => {
            onChangePriority(task.id, priority);
            onClose();
          }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 capitalize',
            task.priority === priority
              ? 'bg-[hsl(var(--accent))] text-black'
              : `${priorityColors[priority] || 'hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]'}`
          )}
        >
          {task.priority === priority && <Check className="h-3 w-3" />}
          {priority}
        </button>
      ))}
    </div>
  );
}

/**
 * Status quick action menu
 */
function StatusQuickAction({
  task,
  onChangeStatus,
  onClose
}: {
  task: Task;
  onChangeStatus: (taskId: string, status: string) => void;
  onClose: () => void;
}) {
  const statuses = ['todo', 'in_progress', 'in_review', 'done'];

  return (
    <div className="absolute top-full mt-2 left-0 z-50 min-w-max bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--muted))] uppercase">
        Status
      </div>

      {statuses.map(status => (
        <button
          key={status}
          onClick={() => {
            onChangeStatus(task.id, status);
            onClose();
          }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 capitalize',
            task.status === status
              ? 'bg-[hsl(var(--accent))] text-black'
              : 'hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]'
          )}
        >
          {task.status === status && <Check className="h-3 w-3" />}
          {status.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}

/**
 * Labels quick action
 */
function LabelsQuickAction({
  task,
  onAddLabel,
  onClose
}: {
  task: Task;
  onAddLabel: (taskId: string, label: string) => void;
  onClose: () => void;
}) {
  const commonLabels = ['bug', 'feature', 'enhancement', 'documentation', 'chore'];

  return (
    <div className="absolute top-full mt-2 left-0 z-50 min-w-max bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--muted))] uppercase">
        Labels
      </div>

      {commonLabels.map(label => (
        <button
          key={label}
          onClick={() => {
            onAddLabel(task.id, label);
            onClose();
          }}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 capitalize',
            task.labels?.includes(label)
              ? 'bg-[hsl(var(--accent))] text-black'
              : 'hover:bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]'
          )}
        >
          {task.labels?.includes(label) && <Check className="h-3 w-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Time logging quick action
 */
function TimeLogQuickAction({
  task,
  onLogTime,
  onClose
}: {
  task: Task;
  onLogTime: (taskId: string, hours: number) => void;
  onClose: () => void;
}) {
  const [hours, setHours] = React.useState(0.5);

  return (
    <div className="absolute top-full mt-2 left-0 z-50 min-w-max bg-[hsl(var(--bg-elevated))] rounded-lg border border-[hsl(var(--border))] shadow-lg p-3 space-y-3 w-48">
      <div className="text-xs font-semibold text-[hsl(var(--muted))] uppercase">
        Log Time
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0.25"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value) || 0.25)}
          className="flex-1 px-2 py-1 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]"
        />
        <span className="text-sm font-medium text-[hsl(var(--muted))]">hours</span>
      </div>

      <button
        onClick={() => {
          onLogTime(task.id, hours);
          onClose();
        }}
        className="w-full px-3 py-2 bg-[hsl(var(--accent))] text-black font-semibold rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors text-sm"
      >
        Log
      </button>
    </div>
  );
}

/**
 * Quick actions toolbar for cards
 */
export function CardQuickActions({
  task,
  members,
  onAssign,
  onChangePriority,
  onChangeStatus,
  onAddLabel,
  onLogTime,
  compact = false
}: CardQuickActionsProps) {
  const [activeMenu, setActiveMenu] = useState<QuickActionType | null>(null);

  if (compact) {
    return (
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {QUICK_ACTIONS.slice(0, 3).map(action => (
          <QuickActionButton
            key={action.type}
            action={action}
            onClick={() => {
              if (action.type === 'assign') onAssign(task.id, members[0]?.id || '');
              else if (action.type === 'priority') onChangePriority(task.id, 'high');
              else if (action.type === 'status') onChangeStatus(task.id, 'in_progress');
            }}
          />
        ))}
        <button
          onClick={() => setActiveMenu(activeMenu ? null : 'assign')}
          className="p-1.5 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      {QUICK_ACTIONS.map(action => (
        <div key={action.type} className="relative">
          <QuickActionButton
            action={action}
            isActive={activeMenu === action.type}
            onClick={() => setActiveMenu(activeMenu === action.type ? null : action.type)}
          />

          {activeMenu === action.type && (
            <>
              {action.type === 'assign' && (
                <AssignQuickAction
                  task={task}
                  members={members}
                  onAssign={onAssign}
                  onClose={() => setActiveMenu(null)}
                />
              )}
              {action.type === 'priority' && (
                <PriorityQuickAction
                  task={task}
                  onChangePriority={onChangePriority}
                  onClose={() => setActiveMenu(null)}
                />
              )}
              {action.type === 'status' && (
                <StatusQuickAction
                  task={task}
                  onChangeStatus={onChangeStatus}
                  onClose={() => setActiveMenu(null)}
                />
              )}
              {action.type === 'labels' && (
                <LabelsQuickAction
                  task={task}
                  onAddLabel={onAddLabel}
                  onClose={() => setActiveMenu(null)}
                />
              )}
              {action.type === 'time' && (
                <TimeLogQuickAction
                  task={task}
                  onLogTime={onLogTime}
                  onClose={() => setActiveMenu(null)}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export type { QuickActionType, CardQuickActionsProps };
