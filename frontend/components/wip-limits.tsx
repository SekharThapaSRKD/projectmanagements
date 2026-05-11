'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, X, Plus } from 'lucide-react';
import { Task, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface WIPLimit {
  status: TaskStatus;
  limit: number;
  enabled: boolean;
}

interface WIPLimitsContextType {
  limits: Map<TaskStatus, number>;
  setLimit: (status: TaskStatus, limit: number) => void;
  enableLimit: (status: TaskStatus) => void;
  disableLimit: (status: TaskStatus) => void;
  isLimitExceeded: (status: TaskStatus, currentCount: number) => boolean;
  getLimitStatus: (status: TaskStatus, currentCount: number) => 'ok' | 'warning' | 'exceeded';
}

const WIPLimitsContext = React.createContext<WIPLimitsContextType | null>(null);

export function WIPLimitsProvider({ children }: { children: React.ReactNode }) {
  const [limits, setLimits] = useState<Map<TaskStatus, number>>(
    new Map([
      ['todo', 10],
      ['in_progress', 5],
      ['in_review', 3],
      ['done', Infinity]
    ])
  );

  const [enabledLimits, setEnabledLimits] = useState<Set<TaskStatus>>(
    new Set(['in_progress', 'in_review'])
  );

  const value: WIPLimitsContextType = {
    limits,
    setLimit: (status, limit) => {
      setLimits(prev => new Map(prev).set(status, limit));
    },
    enableLimit: (status) => {
      setEnabledLimits(prev => new Set([...prev, status]));
    },
    disableLimit: (status) => {
      setEnabledLimits(prev => {
        const next = new Set(prev);
        next.delete(status);
        return next;
      });
    },
    isLimitExceeded: (status, currentCount) => {
      if (!enabledLimits.has(status)) return false;
      const limit = limits.get(status) || Infinity;
      return currentCount > limit;
    },
    getLimitStatus: (status, currentCount) => {
      if (!enabledLimits.has(status)) return 'ok';
      const limit = limits.get(status) || Infinity;
      if (currentCount > limit) return 'exceeded';
      if (currentCount >= limit * 0.8) return 'warning';
      return 'ok';
    }
  };

  return (
    <WIPLimitsContext.Provider value={value}>
      {children}
    </WIPLimitsContext.Provider>
  );
}

export function useWIPLimits() {
  const context = React.useContext(WIPLimitsContext);
  if (!context) {
    throw new Error('useWIPLimits must be used within WIPLimitsProvider');
  }
  return context;
}

/**
 * Displays WIP limit indicator on a column
 */
export function WIPLimitIndicator({
  status,
  taskCount
}: {
  status: TaskStatus;
  taskCount: number;
}) {
  const { getLimitStatus, limits } = useWIPLimits();
  const limitStatus = getLimitStatus(status, taskCount);
  const limit = limits.get(status) || Infinity;

  if (limitStatus === 'ok') return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
        limitStatus === 'warning' &&
          'bg-amber-500/10 text-amber-600 border border-amber-500/20',
        limitStatus === 'exceeded' &&
          'bg-rose-500/10 text-rose-600 border border-rose-500/20'
      )}
    >
      {limitStatus === 'exceeded' ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {taskCount}/{limit}
    </div>
  );
}

/**
 * Blocked state indicator when WIP limit is exceeded
 */
export function WIPBlockedState({
  status,
  taskCount,
  compact = false
}: {
  status: TaskStatus;
  taskCount: number;
  compact?: boolean;
}) {
  const { isLimitExceeded } = useWIPLimits();

  if (!isLimitExceeded(status, taskCount)) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30">
        <AlertTriangle className="h-3 w-3 text-rose-600" />
        <span className="text-xs font-semibold text-rose-600">WIP Limit Blocked</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-rose-500 bg-rose-500/5 p-6 text-center">
      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-600" />
      <h3 className="font-semibold text-rose-600 mb-1">WIP Limit Exceeded</h3>
      <p className="text-sm text-rose-600/80">
        This column has reached its work-in-progress limit. Complete or move tasks before adding more.
      </p>
    </div>
  );
}

/**
 * Configuration dialog for WIP limits
 */
export function WIPLimitsDialog({
  isOpen,
  onClose,
  columns
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: TaskStatus[];
}) {
  const { limits, setLimit, enableLimit, disableLimit } = useWIPLimits();
  const [localEdits, setLocalEdits] = useState<Map<TaskStatus, number>>(new Map(limits));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[hsl(var(--bg-elevated))] rounded-2xl border border-[hsl(var(--border))] shadow-lg max-w-md w-full mx-4 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[hsl(var(--text))]">WIP Limits</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[hsl(var(--bg-soft))] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {columns.map(status => (
            <div key={status} className="flex items-center gap-4">
              <label className="flex items-center gap-3 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={limits.has(status) && limits.get(status) !== Infinity}
                  onChange={(e) => {
                    if (e.target.checked) {
                      enableLimit(status);
                    } else {
                      disableLimit(status);
                    }
                  }}
                  className="w-4 h-4 rounded border-[hsl(var(--border))] cursor-pointer"
                />
                <span className="text-sm font-medium text-[hsl(var(--text))] capitalize">
                  {status.replace('_', ' ')}
                </span>
              </label>

              {limits.has(status) && limits.get(status) !== Infinity && (
                <input
                  type="number"
                  min="1"
                  value={limits.get(status) || 5}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 0);
                    setLimit(status, value);
                  }}
                  className="w-16 px-2 py-1 text-sm text-center border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))]"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[hsl(var(--accent))] text-black font-semibold rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/**
 * Column header with WIP limit info
 */
export function ColumnHeaderWithWIP({
  status,
  taskCount,
  children
}: {
  status: TaskStatus;
  taskCount: number;
  children?: React.ReactNode;
}) {
  const { limits } = useWIPLimits();
  const limit = limits.get(status) || Infinity;
  const percentage = limit === Infinity ? 0 : (taskCount / limit) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        <div className="text-sm font-semibold text-[hsl(var(--muted))]">
          {taskCount}
          {limit !== Infinity && `/${limit}`}
        </div>
      </div>

      {limit !== Infinity && (
        <div className="h-1.5 bg-[hsl(var(--bg-soft))] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              percentage <= 80
                ? 'bg-[hsl(var(--accent))]'
                : percentage <= 100
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      <WIPLimitIndicator status={status} taskCount={taskCount} />
    </div>
  );
}

/**
 * Hook to calculate task counts per status
 */
export function useStatusTaskCounts(tasks: Task[]) {
  return useMemo(() => {
    const counts = new Map<TaskStatus, number>();
    ['todo', 'in_progress', 'in_review', 'done'].forEach(status => {
      counts.set(status as TaskStatus, 0);
    });

    tasks.forEach(task => {
      const status = task.status as TaskStatus;
      counts.set(status, (counts.get(status) || 0) + 1);
    });

    return counts;
  }, [tasks]);
}
