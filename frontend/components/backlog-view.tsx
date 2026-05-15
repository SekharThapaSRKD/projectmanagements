'use client';

import { LayoutGrid } from 'lucide-react';
import { useMemo, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Sprint, Task, TaskStatus } from '@/lib/types';
import { JiraStyleBacklog } from './jira-style-backlog';
import { TaskDialog } from './task-dialog';

type BacklogViewProps = {
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
};

export function BacklogView({ onTaskClick, onNewTask }: BacklogViewProps) {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskDialogSprintId, setTaskDialogSprintId] = useState<string | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [deleteSprintTarget, setDeleteSprintTarget] = useState<Sprint | null>(null);
  const [deleteMode, setDeleteMode] = useState<'unlink' | 'delete'>('unlink');

  const { 
    tasks, 
    activeProjectId, 
    sprints, 
    members, 
    updateTask, 
    addTask,
    deleteTask,
    addSprint,
    startSprint,
    completeSprint,
    setActiveSprint,
    updateSprint,
    deleteSprint,
    deleteSprintWithTasks,
    addToast
  } = useAppStore();

  // Filter tasks and sprints for current project
  const projectTasks = useMemo(
    () => tasks.filter(task => task.projectId === activeProjectId),
    [activeProjectId, tasks]
  );

  const projectSprints = useMemo(
    () => sprints.filter(sprint => sprint.projectId === activeProjectId),
    [sprints, activeProjectId]
  );

  // Show empty state when no project selected
  if (!activeProjectId) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
          <LayoutGrid className="h-8 w-8 opacity-40" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">No Project Selected</h3>
        <p className="mt-2 max-w-xs text-gray-600">
          Select a project from the sidebar to view the backlog and manage sprints.
        </p>
      </div>
    );
  }

  // Map tasks to sprints
  const getTasksForSprint = useCallback(
    (sprintId: string | null) => 
      projectTasks.filter(t => t.sprintId === sprintId),
    [projectTasks]
  );

  // Calculate sprint status based on tasks
  const getSprintStatus = useCallback((sprintId: string) => {
    const sprint = projectSprints.find(s => s.id === sprintId);
    if (sprint && sprint.status) {
      return sprint.status;
    }
    
    // Fallback to task-based calculation
    const sprintTasks = getTasksForSprint(sprintId);
    if (sprintTasks.length === 0) return 'planning' as const;
    
    const completedCount = sprintTasks.filter(t => t.status === 'done').length;
    if (completedCount === sprintTasks.length) return 'completed' as const;
    if (completedCount > 0 || sprintTasks.some(t => t.status === 'in_progress')) 
      return 'active' as const;
    
    return 'planning' as const;
  }, [getTasksForSprint, projectSprints]);

  // Get tasks visible on board (backlog + active sprint tasks only)
  const getBoardVisibleTasks = useCallback(() => {
    return projectTasks.filter(task => {
      // Backlog items always visible on board (future work)
      if (!task.sprintId) return true;
      
      // For sprint tasks, only show if sprint is active
      const sprint = projectSprints.find(s => s.id === task.sprintId);
      return sprint && getSprintStatus(sprint.id) === 'active';
    });
  }, [projectTasks, projectSprints, getSprintStatus]);

  // Handle moving task between sprints
  const handleTaskMove = useCallback((taskId: string, toSprintId: string | null) => {
    updateTask(taskId, { sprintId: toSprintId });
  }, [updateTask]);

  // Handle task deletion
  const handleTaskDelete = useCallback((taskId: string) => {
    deleteTask(taskId);
  }, [deleteTask]);

  // Handle task status change (checkbox toggle)
  const handleTaskStatusChange = useCallback((taskId: string, status: string) => {
    updateTask(taskId, { status: status as TaskStatus });
  }, [updateTask]);

  // Handle creating new task - open task dialog
  const handleCreateTask = useCallback((sprintId: string | null) => {
    setActiveSprint(sprintId);
    setTaskDialogSprintId(sprintId);
    setShowTaskDialog(true);
  }, [setActiveSprint]);

  const openEditSprint = useCallback((sprint: Sprint) => {
    setEditingSprint(sprint);
    setEditName(sprint.name);
    setEditGoal(sprint.goal || '');
    setEditStartDate(sprint.startDate ? sprint.startDate.slice(0, 10) : '');
    setEditEndDate(sprint.endDate ? sprint.endDate.slice(0, 10) : '');
  }, []);

  const saveEditSprint = useCallback(() => {
    if (!editingSprint) return;
    if (!editName.trim()) {
      addToast({ type: 'error', title: 'Validation Error', description: 'Sprint name is required.' });
      return;
    }
    if (editStartDate && editEndDate && new Date(editEndDate) < new Date(editStartDate)) {
      addToast({ type: 'error', title: 'Validation Error', description: 'End date must be after start date.' });
      return;
    }

    updateSprint(editingSprint.id, {
      name: editName.trim(),
      goal: editGoal.trim() || 'Deliver the next milestone',
      ...(editStartDate ? { startDate: new Date(editStartDate).toISOString() } : {}),
      ...(editEndDate ? { endDate: new Date(editEndDate).toISOString() } : {}),
    });

    setEditingSprint(null);
    addToast({
      type: 'success',
      title: 'Sprint Updated',
      description: `${editName.trim()} saved successfully.`
    });
  }, [editEndDate, editGoal, editName, editStartDate, editingSprint, updateSprint]);

  // Handle sprint actions (start, complete, delete)
  const handleSprintAction = useCallback((sprintId: string, action: 'start' | 'complete' | 'configure' | 'delete') => {
    const sprint = projectSprints.find(s => s.id === sprintId);
    if (!sprint) return;

    switch (action) {
      case 'start':
        startSprint(sprintId);
        break;
      case 'complete':
        completeSprint(sprintId);
        break;
      case 'configure': {
        openEditSprint(sprint);
        break;
      }
      case 'delete': {
        setDeleteMode('unlink');
        setDeleteSprintTarget(sprint);
        break;
      }
    }
  }, [projectSprints, startSprint, completeSprint, openEditSprint]);

  // Handle creating new sprint
  const handleCreateSprint = useCallback((sprintName: string, startDate?: string, endDate?: string) => {
    // Generate default dates if not provided
    const today = new Date();
    const defaultStart = startDate || today.toISOString().split('T')[0];
    
    // Default end date is 2 weeks from start
    const startDateObj = new Date(defaultStart);
    const defaultEnd = endDate || new Date(startDateObj.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    addSprint({
      name: sprintName,
      projectId: activeProjectId,
      startDate: defaultStart,
      endDate: defaultEnd,
      goal: '',
    });
  }, [activeProjectId, addSprint]);

  return (
    <div className="space-y-4">
      <JiraStyleBacklog
        tasks={projectTasks}
        sprints={projectSprints.map(sprint => ({
          id: sprint.id,
          name: sprint.name,
          status: getSprintStatus(sprint.id),
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        }))}
        members={members}
        onTaskMove={handleTaskMove}
        onTaskDelete={handleTaskDelete}
        onTaskClick={onTaskClick}
        onTaskStatusChange={handleTaskStatusChange}
        onCreateTask={handleCreateTask}
        onCreateSprint={handleCreateSprint}
        onSprintAction={handleSprintAction}
      />
      {showTaskDialog && (
        <TaskDialog
          task={null}
          isNew={true}
          onClose={() => setShowTaskDialog(false)}
        />
      )}

      {editingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm" onClick={() => setEditingSprint(null)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border-soft))] px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Configure Sprint</p>
                <h3 className="text-xl font-bold text-[hsl(var(--text))]">Edit sprint details</h3>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[hsl(var(--text))]">Sprint name</label>
                <input
                  value={editName}
                  onChange={event => setEditName(event.target.value)}
                  placeholder="Sprint name"
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(var(--text))]">Start date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={event => setEditStartDate(event.target.value)}
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[hsl(var(--text))]">End date</label>
                <input
                  type="date"
                  min={editStartDate || undefined}
                  value={editEndDate}
                  onChange={event => setEditEndDate(event.target.value)}
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-[hsl(var(--text))]">Goal</label>
                <textarea
                  value={editGoal}
                  onChange={event => setEditGoal(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[hsl(var(--border-soft))] px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingSprint(null)}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-3 text-sm font-semibold text-[hsl(var(--text))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditSprint}
                className="rounded-2xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-black"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSprintTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm" onClick={() => setDeleteSprintTarget(null)}>
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-[hsl(var(--text))]">Confirm Sprint Deletion</h3>
              <p className="mt-2 text-sm text-[hsl(var(--muted))]">Choose how you want to handle tasks inside this sprint.</p>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3">
                  <input type="radio" name="deleteMode" checked={deleteMode === 'unlink'} onChange={() => setDeleteMode('unlink')} />
                  <div>
                    <div className="font-semibold text-[hsl(var(--text))]">Keep tasks (unlink from sprint)</div>
                    <div className="text-xs text-[hsl(var(--muted))]">Delete sprint only and keep tasks in backlog.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <input type="radio" name="deleteMode" checked={deleteMode === 'delete'} onChange={() => setDeleteMode('delete')} />
                  <div>
                    <div className="font-semibold text-[hsl(var(--text))]">Delete sprint and all its tasks</div>
                    <div className="text-xs text-[hsl(var(--muted))]">This will permanently remove tasks in this sprint.</div>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteSprintTarget(null)}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-[hsl(var(--text))]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!deleteSprintTarget) return;
                    const targetName = deleteSprintTarget.name;
                    if (deleteMode === 'unlink') {
                      deleteSprint(deleteSprintTarget.id);
                      addToast({
                        type: 'success',
                        title: 'Sprint Deleted',
                        description: `${targetName} removed and tasks kept in backlog.`
                      });
                    } else {
                      deleteSprintWithTasks(deleteSprintTarget.id);
                      addToast({
                        type: 'success',
                        title: 'Sprint and Tasks Deleted',
                        description: `${targetName} and all of its tasks were removed.`
                      });
                    }
                    setDeleteSprintTarget(null);
                  }}
                  className="rounded-2xl bg-red-600 px-4 py-2 text-white"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Utility to determine if a task should be visible on the board
 * - Backlog tasks (no sprint): Always visible (future work)
 * - Planning sprint tasks: NOT visible (not started yet)
 * - Active sprint tasks: Visible on board
 * - Completed sprint tasks: Visible but marked as completed
 */
export function shouldTaskBeVisibleOnBoard(
  task: Task | null,
  sprints: any[]
): boolean {
  if (!task) return false;
  
  // Backlog items always visible
  if (!task.sprintId) return true;
  
  // Check sprint status
  const sprint = sprints.find(s => s.id === task.sprintId);
  if (!sprint) return true; // If sprint not found, show task (fallback)
  
  // Only show tasks from active or completed sprints
  return sprint.status === 'active' || sprint.status === 'completed';
}