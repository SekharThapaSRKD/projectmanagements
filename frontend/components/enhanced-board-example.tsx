'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { LayoutGrid, List, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { VirtualizedBoard } from '@/components/virtualized-board';
import { Swimlanes, type SwimlaneModeType } from '@/components/swimlanes';
import { WIPLimitsProvider, useWIPLimits, WIPLimitsDialog } from '@/components/wip-limits';
import { CardQuickActions } from '@/components/card-quick-actions';
import { ActiveUsersIndicator, useRealtimePresence } from '@/components/realtime-presence';
import { BacklogEnhanced } from '@/components/backlog-enhanced';
import { AdvancedFiltersPanel } from '@/components/advanced-filters-panel';
import { SprintPlanningMetricsPanel } from '@/components/sprint-planning-metrics';
import { 
  InlineStoryPointsEditor,
  EstimationModal,
  PlanningPokerSession,
  StoryPointsSummary
} from '@/components/estimation-features';
import { applyAdvancedFilter, type FilterCondition, type SavedFilter } from '@/lib/advanced-filters';
import { cn } from '@/lib/utils';

/**
 * EXAMPLE: Complete board view with all enhancements
 * 
 * This example shows how to integrate all the enhanced board components
 * together in a production-ready implementation.
 */
export function EnhancedBoardExample() {
  const {
    tasks,
    sprints,
    members,
    activeProjectId,
    activeSprintId,
    updateTask,
    deleteTask,
    createTask,
    addTaskToSprint,
    removeTaskFromSprint
  } = useAppStore();

  // State management
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneModeType>('none');
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showWIPDialog, setShowWIPDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [estimationMode, setEstimationMode] = useState<'modal' | 'poker' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'board' | 'backlog'>('board');

  // Realtime presence
  const { presence, updateUserPresence } = useRealtimePresence(members[0]?.id || '');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(
      t => t.projectId === activeProjectId && t.sprintId === activeSprintId
    );

    // Apply advanced filters
    if (activeFilters.length > 0) {
      result = applyAdvancedFilter(result, activeFilters);
    }

    // Apply search
    if (searchQuery) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [tasks, activeProjectId, activeSprintId, activeFilters, searchQuery]);

  // Handlers
  const handleTaskMove = useCallback(async (taskId: string, toStatus: string) => {
    try {
      updateTask(taskId, { status: toStatus as any });
      // Call API: POST /api/v1/tasks/:id/move
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  }, [updateTask]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    deleteTask(taskId);
    // Call API: DELETE /api/v1/tasks/:id
  }, [deleteTask]);

  const handleAssign = useCallback((taskId: string, memberId: string) => {
    updateTask(taskId, { assigneeId: memberId });
  }, [updateTask]);

  const handleChangePriority = useCallback((taskId: string, priority: string) => {
    updateTask(taskId, { priority });
  }, [updateTask]);

  const handleChangeStatus = useCallback((taskId: string, status: string) => {
    handleTaskMove(taskId, status);
  }, [handleTaskMove]);

  const handleAddLabel = useCallback((taskId: string, label: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const labels = new Set(task.labels || []);
      labels.add(label);
      updateTask(taskId, { labels: Array.from(labels) });
    }
  }, [tasks, updateTask]);

  const handleLogTime = useCallback((taskId: string, hours: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const current = task.timeLogged || 0;
      updateTask(taskId, { timeLogged: current + hours });
    }
  }, [tasks, updateTask]);

  const handleEstimate = useCallback((taskId: string, points: number) => {
    updateTask(taskId, { storyPoints: points });
    setEstimationMode(null);
    setSelectedTask(null);
  }, [updateTask]);

  const handleApplyFilter = useCallback((conditions: FilterCondition[]) => {
    setActiveFilters(conditions);
  }, []);

  const handleSaveFilter = useCallback((filter: SavedFilter) => {
    setSavedFilters([...savedFilters, filter]);
  }, [savedFilters]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-[hsl(var(--text))]">Sprint Board</h1>
          <ActiveUsersIndicator activeUsers={presence.activeUsers} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('board')}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors',
              view === 'board'
                ? 'bg-[hsl(var(--accent))] text-black'
                : 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))]'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>

          <button
            onClick={() => setView('backlog')}
            className={cn(
              'px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors',
              view === 'backlog'
                ? 'bg-[hsl(var(--accent))] text-black'
                : 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))]'
            )}
          >
            <List className="h-4 w-4" />
            Backlog
          </button>

          <button
            onClick={() => setShowWIPDialog(true)}
            className="px-4 py-2 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))] font-semibold flex items-center gap-2 transition-colors"
          >
            <Settings className="h-4 w-4" />
            WIP Limits
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <AdvancedFiltersPanel
            onApplyFilter={handleApplyFilter}
            onSearch={setSearchQuery}
            members={members}
            activeConditions={activeFilters}
            onRemoveCondition={(id) => {
              setActiveFilters(activeFilters.filter(f => f.id !== id));
            }}
            onClearFilters={() => setActiveFilters([])}
            savedFilters={savedFilters}
            onSaveFilter={handleSaveFilter}
          />
        </div>

        {/* Board/Backlog View */}
        <div className="lg:col-span-2">
          <WIPLimitsProvider>
            {view === 'board' ? (
              swimlaneMode === 'none' ? (
                <VirtualizedBoard
                  tasks={filteredTasks}
                  columns={['todo', 'in_progress', 'in_review', 'done']}
                  containerHeight={600}
                  columnWidth={300}
                  itemHeight={160}
                  onTaskMove={handleTaskMove}
                  onTaskClick={(task) => setSelectedTask(task)}
                  renderCard={(task) => (
                    <div className="p-3 rounded-lg bg-[hsl(var(--bg-panel))] border border-[hsl(var(--border-soft))] hover:border-[hsl(var(--accent)/0.5)] group cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm text-[hsl(var(--text))] flex-1 group-hover:text-[hsl(var(--accent))]">
                          {task.title}
                        </h4>
                        <InlineStoryPointsEditor
                          task={task}
                          onUpdate={handleEstimate}
                        />
                      </div>
                      <CardQuickActions
                        task={task}
                        members={members}
                        onAssign={handleAssign}
                        onChangePriority={handleChangePriority}
                        onChangeStatus={handleChangeStatus}
                        onAddLabel={handleAddLabel}
                        onLogTime={handleLogTime}
                        compact
                      />
                    </div>
                  )}
                  renderColumnHeader={(status) => (
                    <div className="font-semibold text-[hsl(var(--text))] capitalize">
                      {status.replace('_', ' ')}
                    </div>
                  )}
                />
              ) : (
                <Swimlanes
                  tasks={filteredTasks}
                  columns={['todo', 'in_progress', 'in_review', 'done']}
                  swimlaneMode={swimlaneMode}
                  members={members}
                  onTaskClick={(task) => setSelectedTask(task)}
                  renderCard={(task) => (
                    <div className="p-3 rounded-lg bg-[hsl(var(--bg-panel))] border border-[hsl(var(--border-soft))]">
                      <h4 className="font-semibold text-sm text-[hsl(var(--text))]">{task.title}</h4>
                    </div>
                  )}
                />
              )
            ) : (
              <BacklogEnhanced
                tasks={tasks.filter(t => t.projectId === activeProjectId)}
                sprints={sprints}
                members={members}
                onTaskMove={addTaskToSprint}
                onTaskDelete={handleTaskDelete}
                onTaskClick={(task) => setSelectedTask(task)}
                onCreateTask={(title) => {
                  createTask({
                    title,
                    projectId: activeProjectId,
                    status: 'todo'
                  });
                }}
              />
            )}
          </WIPLimitsProvider>
        </div>

        {/* Sprint Planning Metrics */}
        <div className="lg:col-span-1">
          <SprintPlanningMetricsPanel
            tasks={filteredTasks}
            members={members}
            teamCapacityPerSprint={40}
          />

          {/* Story Points Summary */}
          <div className="mt-6">
            <StoryPointsSummary tasks={filteredTasks} />
          </div>
        </div>
      </div>

      {/* Swimlane Mode Selector */}
      {view === 'board' && (
        <div className="flex gap-2 p-4 bg-[hsl(var(--bg-soft))] rounded-lg">
          <span className="text-sm font-semibold text-[hsl(var(--text))]">Swimlanes:</span>
          {(['none', 'assignee', 'epic', 'priority', 'status'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSwimlaneMode(mode)}
              className={cn(
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                swimlaneMode === mode
                  ? 'bg-[hsl(var(--accent))] text-black'
                  : 'bg-[hsl(var(--bg))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))]'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      <WIPLimitsDialog
        isOpen={showWIPDialog}
        onClose={() => setShowWIPDialog(false)}
        columns={['todo', 'in_progress', 'in_review', 'done']}
      />

      {selectedTask && (
        <EstimationModal
          task={selectedTask}
          isOpen={estimationMode === 'modal'}
          onClose={() => setEstimationMode(null)}
          onEstimate={handleEstimate}
        />
      )}

      {selectedTask && (
        <PlanningPokerSession
          task={selectedTask}
          members={members}
          isOpen={estimationMode === 'poker'}
          onClose={() => setEstimationMode(null)}
          onFinalizeEstimate={handleEstimate}
        />
      )}
    </div>
  );
}

export default EnhancedBoardExample;
