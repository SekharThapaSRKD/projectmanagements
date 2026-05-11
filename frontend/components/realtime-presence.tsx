'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { User, Dot, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActiveUser {
  id: string;
  name: string;
  color: string;
  lastSeen: number;
  isEditing?: boolean;
  editingTaskId?: string;
  cursorPosition?: { x: number; y: number };
}

export interface RealtimePresence {
  activeUsers: Map<string, ActiveUser>;
  editingTasks: Map<string, string[]>; // taskId -> [userId]
  boardCursorPositions: Map<string, { x: number; y: number }>; // userId -> position
}

const CURSOR_COLORS = [
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ee7352', // coral
];

/**
 * Creates a realtime presence hook
 */
export function useRealtimePresence(userId: string) {
  const [presence, setPresence] = useState<RealtimePresence>({
    activeUsers: new Map(),
    editingTasks: new Map(),
    boardCursorPositions: new Map()
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const presenceTrackerRef = useRef<NodeJS.Timeout>();

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Broadcast presence
  useEffect(() => {
    presenceTrackerRef.current = setInterval(() => {
      // Broadcast current user presence via WebSocket
      // This would connect to your backend SSE/WebSocket
      console.log('Broadcasting presence:', {
        userId,
        position: mousePosition,
        timestamp: Date.now()
      });
    }, 1000);

    return () => {
      if (presenceTrackerRef.current) clearInterval(presenceTrackerRef.current);
    };
  }, [userId, mousePosition]);

  const updateUserPresence = useCallback((user: ActiveUser) => {
    setPresence(prev => ({
      ...prev,
      activeUsers: new Map(prev.activeUsers).set(user.id, user)
    }));
  }, []);

  const updateTaskEditing = useCallback((taskId: string, userIds: string[]) => {
    setPresence(prev => ({
      ...prev,
      editingTasks: new Map(prev.editingTasks).set(taskId, userIds)
    }));
  }, []);

  const removeUser = useCallback((userId: string) => {
    setPresence(prev => {
      const newUsers = new Map(prev.activeUsers);
      newUsers.delete(userId);
      return { ...prev, activeUsers: newUsers };
    });
  }, []);

  return {
    presence,
    updateUserPresence,
    updateTaskEditing,
    removeUser,
    mousePosition
  };
}

/**
 * Active users indicator
 */
export function ActiveUsersIndicator({
  activeUsers,
  maxDisplay = 3
}: {
  activeUsers: Map<string, ActiveUser>;
  maxDisplay?: number;
}) {
  const users = Array.from(activeUsers.values()).slice(0, maxDisplay);
  const hidden = Math.max(0, activeUsers.size - maxDisplay);

  if (activeUsers.size === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--bg-soft))] rounded-lg border border-[hsl(var(--border-soft))]">
      <div className="flex -space-x-2">
        {users.map(user => (
          <div
            key={user.id}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold border-2 border-[hsl(var(--bg))] shadow-sm"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name[0]}
          </div>
        ))}
        {hidden > 0 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-white text-xs font-bold border-2 border-[hsl(var(--bg))]">
            +{hidden}
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-[hsl(var(--muted))]">
        {activeUsers.size} online
      </span>
    </div>
  );
}

/**
 * Live cursor component
 */
export function LiveCursor({
  user,
  position
}: {
  user: ActiveUser;
  position: { x: number; y: number };
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timeout);
  }, [position]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div
        className="h-5 w-5 rounded-full border-2 flex items-center justify-center"
        style={{
          borderColor: user.color,
          backgroundColor: `${user.color}20`
        }}
      >
        <Move className="h-3 w-3" style={{ color: user.color }} />
      </div>
      <div
        className="absolute top-6 left-2 px-2 py-1 rounded-md text-xs font-semibold text-white whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

/**
 * Task editing indicator
 */
export function TaskEditingIndicator({
  taskId,
  editingUsers,
  allUsers
}: {
  taskId: string;
  editingUsers: string[];
  allUsers: Map<string, ActiveUser>;
}) {
  if (editingUsers.length === 0) return null;

  const users = editingUsers
    .map(id => allUsers.get(id))
    .filter(Boolean) as ActiveUser[];

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
      <Dot className="h-2 w-2 animate-pulse text-blue-500" />
      <span className="text-xs font-medium text-blue-600">
        {users.map(u => u.name).join(', ')} editing
      </span>
    </div>
  );
}

/**
 * Board presence layer showing all live cursors
 */
export function BoardPresenceLayer({
  presence,
  currentUserId
}: {
  presence: RealtimePresence;
  currentUserId: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {Array.from(presence.boardCursorPositions.entries()).map(([userId, position]) => {
        if (userId === currentUserId) return null;

        const user = presence.activeUsers.get(userId);
        if (!user) return null;

        return (
          <LiveCursor
            key={userId}
            user={user}
            position={position}
          />
        );
      })}
    </div>
  );
}

/**
 * Component displaying who is currently editing a task
 */
export function EditingIndicators({
  presence,
  taskIds
}: {
  presence: RealtimePresence;
  taskIds: string[];
}) {
  return (
    <div className="space-y-1">
      {taskIds.map(taskId => {
        const editingUsers = presence.editingTasks.get(taskId);
        if (!editingUsers || editingUsers.length === 0) return null;

        return (
          <TaskEditingIndicator
            key={taskId}
            taskId={taskId}
            editingUsers={editingUsers}
            allUsers={presence.activeUsers}
          />
        );
      })}
    </div>
  );
}

/**
 * Get a consistent color for a user
 */
export function getUserColor(userId: string, index: number = 0): string {
  return CURSOR_COLORS[
    (userId.charCodeAt(0) + index) % CURSOR_COLORS.length
  ];
}

/**
 * Hook to manage presence broadcast
 */
export function usePresenceBroadcast(
  userId: string,
  userName: string,
  isEditing: boolean = false,
  editingTaskId: string = ''
) {
  const broadcastInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    broadcastInterval.current = setInterval(() => {
      // Broadcast to your realtime service
      const payload = {
        userId,
        userName,
        isEditing,
        editingTaskId,
        timestamp: Date.now()
      };

      console.log('Broadcasting:', payload);
      // This would typically call a WebSocket or fetch endpoint
    }, 1000);

    return () => {
      if (broadcastInterval.current) clearInterval(broadcastInterval.current);
    };
  }, [userId, userName, isEditing, editingTaskId]);
}

/**
 * Avatar component for active users
 */
export function ActiveUserAvatar({
  user,
  showStatus = true
}: {
  user: ActiveUser;
  showStatus?: boolean;
}) {
  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold border-2 border-[hsl(var(--bg))]"
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {user.name[0]}
      {showStatus && (
        <div className={cn(
          'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[hsl(var(--bg))]',
          user.isEditing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
        )} />
      )}
    </div>
  );
}
