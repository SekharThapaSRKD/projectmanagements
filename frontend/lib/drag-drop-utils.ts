import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task } from './types';

export interface DragDropState {
  activeId: string | null;
  overId: string | null;
  selectedIds: Set<string>;
  isDraggingMultiple: boolean;
}

export interface DragDropConfig {
  enableAutoScroll?: boolean;
  autoScrollMargin?: number;
  enableMultiSelect?: boolean;
  enableKeyboardShortcuts?: boolean;
  collisionDetectionStrategy?: 'center' | 'closest';
}

/**
 * Handles multi-select drag operations
 */
export function handleMultiSelectToggle(
  id: string,
  selectedIds: Set<string>,
  event: React.MouseEvent
): Set<string> {
  const newSelected = new Set(selectedIds);

  if (event.ctrlKey || event.metaKey) {
    // Toggle selection
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
  } else if (event.shiftKey) {
    // Range selection (handled elsewhere)
    newSelected.add(id);
  } else {
    // Single selection
    newSelected.clear();
    newSelected.add(id);
  }

  return newSelected;
}

/**
 * Detects if multiple items are being dragged
 */
export function detectMultipleDrag(
  activeId: string,
  selectedIds: Set<string>
): boolean {
  return selectedIds.has(activeId) && selectedIds.size > 1;
}

/**
 * Calculates optimal auto-scroll velocity based on cursor position
 */
export function calculateAutoScrollVelocity(
  cursorY: number,
  containerRect: DOMRect,
  margin: number = 50
): number {
  const { top, bottom } = containerRect;
  const distanceFromTop = cursorY - top;
  const distanceFromBottom = bottom - cursorY;

  if (distanceFromTop < margin) {
    return -((margin - distanceFromTop) / margin) * 20; // Scroll up
  }

  if (distanceFromBottom < margin) {
    return ((margin - distanceFromBottom) / margin) * 20; // Scroll down
  }

  return 0;
}

/**
 * Handles collision detection with optimization
 */
export function detectCollisions(
  activeRect: DOMRect,
  otherRects: Map<string, DOMRect>,
  strategy: 'center' | 'closest' = 'center'
): string | null {
  const activeCenterY = activeRect.top + activeRect.height / 2;

  let closestId: string | null = null;
  let closestDistance = Infinity;

  otherRects.forEach((rect, id) => {
    const otherCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(activeCenterY - otherCenterY);

    if (strategy === 'center') {
      // Collision if center of active overlaps with other
      if (activeRect.left < rect.right &&
          activeRect.right > rect.left &&
          activeCenterY > rect.top &&
          activeCenterY < rect.bottom &&
          distance < closestDistance) {
        closestId = id;
        closestDistance = distance;
      }
    } else if (strategy === 'closest') {
      // Track closest item regardless of overlap
      if (distance < closestDistance) {
        closestId = id;
        closestDistance = distance;
      }
    }
  });

  return closestId;
}

/**
 * Generates optimistic updates for task movements
 */
export function generateOptimisticUpdate(
  tasks: Task[],
  taskId: string,
  fromStatus: string,
  toStatus: string,
  fromIndex: number,
  toIndex: number
): { optimistic: Task[]; rollback: Task[] } {
  const optimistic = [...tasks];
  const rollback = [...tasks];

  const taskIndex = optimistic.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return { optimistic, rollback };

  // Optimistic update
  if (fromStatus === toStatus) {
    // Same column, reorder
    const [movedTask] = optimistic.splice(taskIndex, 1);
    optimistic.splice(toIndex, 0, movedTask);
  } else {
    // Different column, update status
    optimistic[taskIndex] = {
      ...optimistic[taskIndex],
      status: toStatus as any
    };
  }

  return { optimistic, rollback };
}

/**
 * Handles keyboard shortcuts for drag-drop
 */
export function handleDragDropKeyboardShortcut(
  event: React.KeyboardEvent,
  actions: {
    onSelectAll?: () => void;
    onClearSelection?: () => void;
    onDelete?: () => void;
  }
): boolean {
  if (event.ctrlKey || event.metaKey) {
    if (event.key === 'a') {
      event.preventDefault();
      actions.onSelectAll?.();
      return true;
    }
  }

  if (event.key === 'Escape') {
    actions.onClearSelection?.();
    return true;
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    actions.onDelete?.();
    return true;
  }

  return false;
}

/**
 * Validates task movement based on constraints
 */
export function validateTaskMovement(
  task: Task,
  fromStatus: string,
  toStatus: string,
  constraints?: {
    allowedStatusTransitions?: Map<string, string[]>;
    wipLimits?: Map<string, number>;
    currentTasksInStatus?: Map<string, number>;
  }
): { isValid: boolean; reason?: string } {
  if (!constraints) {
    return { isValid: true };
  }

  // Check status transition rules
  if (constraints.allowedStatusTransitions) {
    const allowed = constraints.allowedStatusTransitions.get(fromStatus);
    if (allowed && !allowed.includes(toStatus)) {
      return {
        isValid: false,
        reason: `Cannot move from ${fromStatus} to ${toStatus}`
      };
    }
  }

  // Check WIP limits
  if (constraints.wipLimits && constraints.currentTasksInStatus) {
    const limit = constraints.wipLimits.get(toStatus) || Infinity;
    const current = constraints.currentTasksInStatus.get(toStatus) || 0;
    if (current >= limit) {
      return {
        isValid: false,
        reason: `WIP limit of ${limit} reached for ${toStatus}`
      };
    }
  }

  return { isValid: true };
}

/**
 * Debounced function for realtime synchronization
 */
export function createDebouncedSync(
  callback: (tasks: Task[]) => Promise<void>,
  delay: number = 1000
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingTasks: Task[] = [];

  return {
    addPendingTasks: (tasks: Task[]) => {
      pendingTasks = tasks;
      
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          await callback(pendingTasks);
        } catch (error) {
          console.error('Sync failed:', error);
        }
        timeoutId = null;
      }, delay);
    },
    flush: async () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pendingTasks.length > 0) {
        await callback(pendingTasks);
        timeoutId = null;
      }
    }
  };
}

/**
 * Calculates delta updates for efficient websocket transmission
 */
export function calculateDeltaUpdate(
  oldTasks: Task[],
  newTasks: Task[]
): {
  added: Task[];
  updated: Task[];
  deleted: string[];
} {
  const oldMap = new Map(oldTasks.map(t => [t.id, t]));
  const newMap = new Map(newTasks.map(t => [t.id, t]));

  const added = newTasks.filter(t => !oldMap.has(t.id));
  const deleted = Array.from(oldMap.keys()).filter(id => !newMap.has(id));
  const updated = newTasks.filter(t => {
    const old = oldMap.get(t.id);
    return old && JSON.stringify(old) !== JSON.stringify(t);
  });

  return { added, updated, deleted };
}

/**
 * Applies delta updates to existing tasks
 */
export function applyDeltaUpdate(
  tasks: Task[],
  delta: {
    added: Task[];
    updated: Task[];
    deleted: string[];
  }
): Task[] {
  let result = [...tasks];

  // Remove deleted tasks
  result = result.filter(t => !delta.deleted.includes(t.id));

  // Update existing tasks
  result = result.map(t => {
    const updated = delta.updated.find(u => u.id === t.id);
    return updated || t;
  });

  // Add new tasks
  result = [...result, ...delta.added];

  return result;
}
