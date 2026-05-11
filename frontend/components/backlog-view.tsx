'use client';

import { LayoutGrid } from 'lucide-react';
import { useMemo, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Task } from '@/lib/types';
import { JiraStyleBacklog } from './jira-style-backlog';
import { TaskDialog } from './task-dialog';

type BacklogViewProps = {
  onTaskClick: (task: Task) => void;
  onNewTask: () => void;
};

export function BacklogView({ onTaskClick, onNewTask }: BacklogViewProps) {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [taskDialogSprintId, setTaskDialogSprintId] = useState<string | null>(null);

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
    setActiveSprint
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
    // Use the actual sprint status from store if available
    const sprint = projectSprints.find(s => s.id === sprintId);
    if (sprint && sprint.status) {
      return sprint.status as 'planning' | 'active' | 'completed';
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
    updateTask(taskId, { status });
  }, [updateTask]);

  // Handle creating new task - open task dialog
  const handleCreateTask = useCallback((sprintId: string | null) => {
    setActiveSprint(sprintId);
    setTaskDialogSprintId(sprintId);
    setShowTaskDialog(true);
  }, [setActiveSprint]);

  // Handle sprint actions (start, complete, delete)
  const handleSprintAction = useCallback((sprintId: string, action: string) => {
    const sprint = projectSprints.find(s => s.id === sprintId);
    if (!sprint) return;

    switch (action) {
      case 'start':
        startSprint(sprintId);
        break;
      case 'complete':
        completeSprint(sprintId);
        break;
      case 'delete':
        console.log(`Deleting sprint: ${sprint.name}`);
        // TODO: Call backend to delete sprint
        break;
    }
  }, [projectSprints, startSprint, completeSprint]);

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