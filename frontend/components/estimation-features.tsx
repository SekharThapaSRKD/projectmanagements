'use client';

import React, { useState, useMemo } from 'react';
import {
  Zap,
  Sparkles,
  Users,
  TrendingUp,
  Plus,
  X,
  Check
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Fibonacci sequence for story point estimation
const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21, 34];

const POINT_COLORS: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-emerald-500',
  3: 'bg-blue-500',
  5: 'bg-cyan-500',
  8: 'bg-purple-500',
  13: 'bg-violet-500',
  21: 'bg-orange-500',
  34: 'bg-rose-500'
};

interface PokerVote {
  memberId: string;
  memberName: string;
  points: number;
  timestamp: number;
}

interface EstimationSession {
  taskId: string;
  votes: PokerVote[];
  isOpen: boolean;
  finalEstimate?: number;
}

/**
 * Inline story point editor
 */
export function InlineStoryPointsEditor({
  task,
  onUpdate,
  readOnly = false
}: {
  task: Task;
  onUpdate: (taskId: string, points: number) => void;
  readOnly?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(task.storyPoints || 1);

  if (!isEditing && readOnly) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-lg font-bold text-white text-sm',
          POINT_COLORS[task.storyPoints || 1] || POINT_COLORS[1]
        )}
      >
        {task.storyPoints || '-'}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-lg font-bold text-white text-sm cursor-pointer hover:scale-110 transition-transform',
          POINT_COLORS[task.storyPoints || 1] || POINT_COLORS[1]
        )}
      >
        {task.storyPoints || '-'}
      </button>
    );
  }

  return (
    <div className="flex gap-1 p-2 bg-[hsl(var(--bg-soft))] rounded-lg">
      {STORY_POINTS.map(points => (
        <button
          key={points}
          onClick={() => {
            setSelectedPoints(points);
            onUpdate(task.id, points);
            setIsEditing(false);
          }}
          className={cn(
            'h-8 w-8 rounded-lg font-bold text-white text-sm transition-all hover:scale-110',
            selectedPoints === points
              ? POINT_COLORS[points]
              : 'bg-[hsl(var(--muted))] opacity-50'
          )}
        >
          {points}
        </button>
      ))}
    </div>
  );
}

/**
 * Story point estimation modal
 */
export function EstimationModal({
  task,
  isOpen,
  onClose,
  onEstimate
}: {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onEstimate: (taskId: string, points: number) => void;
}) {
  const [selectedPoints, setSelectedPoints] = useState(task.storyPoints || 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[hsl(var(--bg-elevated))] rounded-2xl border border-[hsl(var(--border))] shadow-lg max-w-md w-full mx-4 p-6 space-y-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--text))]">Estimate Task</h2>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[hsl(var(--bg-soft))] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[hsl(var(--text))]">Select Story Points</h3>
          <div className="grid grid-cols-4 gap-2">
            {STORY_POINTS.map(points => (
              <button
                key={points}
                onClick={() => setSelectedPoints(points)}
                className={cn(
                  'p-3 rounded-lg font-bold text-sm transition-all transform hover:scale-105',
                  selectedPoints === points
                    ? cn(POINT_COLORS[points], 'text-white scale-110')
                    : 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))]'
                )}
              >
                {points}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[hsl(var(--text))] bg-[hsl(var(--bg-soft))] rounded-lg hover:bg-[hsl(var(--bg-elevated))] transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onEstimate(task.id, selectedPoints);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-[hsl(var(--accent))] text-black rounded-lg hover:bg-[hsl(var(--accent)/0.9)] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            Estimate
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Planning poker session
 */
export function PlanningPokerSession({
  task,
  members,
  isOpen,
  onClose,
  onFinalizeEstimate
}: {
  task: Task;
  members: Array<{ id: string; name: string }>;
  isOpen: boolean;
  onClose: () => void;
  onFinalizeEstimate: (taskId: string, points: number) => void;
}) {
  const currentMemberId = members[0]?.id || ''; // In a real app, use actual current user
  const [votes, setVotes] = useState<PokerVote[]>([]);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleVote = (points: number) => {
    setMyVote(points);
    const existingVote = votes.find(v => v.memberId === currentMemberId);
    if (existingVote) {
      setVotes(votes.map(v => v.memberId === currentMemberId ? { ...v, points, timestamp: Date.now() } : v));
    } else {
      setVotes([...votes, {
        memberId: currentMemberId,
        memberName: members.find(m => m.id === currentMemberId)?.name || 'Me',
        points,
        timestamp: Date.now()
      }]);
    }
  };

  const allVoted = votes.length === members.length;
  const averageVote = votes.length > 0
    ? Math.round(votes.reduce((sum, v) => sum + v.points, 0) / votes.length)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[hsl(var(--bg-elevated))] rounded-2xl border border-[hsl(var(--border))] shadow-lg max-w-2xl w-full mx-4 p-6 space-y-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--text))] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" />
              Planning Poker
            </h2>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[hsl(var(--bg-soft))] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[hsl(var(--text))] mb-3">Your Vote</h3>
            <div className="grid grid-cols-4 gap-2">
              {STORY_POINTS.map(points => (
                <button
                  key={points}
                  onClick={() => handleVote(points)}
                  className={cn(
                    'p-3 rounded-lg font-bold text-sm transition-all transform hover:scale-105',
                    myVote === points
                      ? cn(POINT_COLORS[points], 'text-white scale-110')
                      : 'bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))]'
                  )}
                >
                  {points}
                </button>
              ))}
            </div>
          </div>

          {revealed && votes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-[hsl(var(--text))]">Team Votes</h3>
              <div className="grid grid-cols-2 gap-2">
                {votes.map(vote => (
                  <div
                    key={vote.memberId}
                    className="flex items-center justify-between p-3 bg-[hsl(var(--bg-soft))] rounded-lg"
                  >
                    <span className="text-sm font-medium text-[hsl(var(--text))]">{vote.memberName}</span>
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg font-bold text-white text-sm flex items-center justify-center',
                        POINT_COLORS[vote.points]
                      )}
                    >
                      {vote.points}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[hsl(var(--accent)/0.1)] rounded-lg border border-[hsl(var(--accent))]">
                <div className="text-xs text-[hsl(var(--muted))] mb-1">Average Estimate</div>
                <div className="text-2xl font-bold text-[hsl(var(--accent))]">{averageVote} points</div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setRevealed(!revealed)}
              disabled={!allVoted}
              className={cn(
                'flex-1 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2',
                allVoted
                  ? 'bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent)/0.9)]'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--text))] opacity-50 cursor-not-allowed'
              )}
            >
              <Zap className="h-4 w-4" />
              {revealed ? 'Hide' : 'Reveal'} Votes ({votes.length}/{members.length})
            </button>

            {revealed && (
              <button
                onClick={() => {
                  onFinalizeEstimate(task.id, averageVote);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Finalize
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * AI estimation suggestions
 */
export function AIEstimationSuggestions({
  task,
  onAccept
}: {
  task: Task;
  onAccept: (points: number) => void;
}) {
  // Mock AI suggestions based on task complexity
  const suggestions = useMemo(() => {
    const titleLength = task.title.length;
    const descLength = (task.description || '').length;
    const complexity = titleLength + descLength;

    if (complexity < 50) return [1, 2];
    if (complexity < 150) return [2, 3];
    if (complexity < 300) return [3, 5];
    if (complexity < 500) return [5, 8];
    return [8, 13];
  }, [task]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--accent)/0.05)] border border-[hsl(var(--accent))]">
      <Sparkles className="h-5 w-5 text-[hsl(var(--accent))]" />
      <div className="flex-1">
        <div className="text-xs font-semibold text-[hsl(var(--accent))] uppercase">AI Suggestion</div>
        <div className="text-sm text-[hsl(var(--text))] mt-0.5">
          Complexity suggests: {suggestions.join(' or ')} points
        </div>
      </div>
      <div className="flex gap-1">
        {suggestions.map(points => (
          <button
            key={points}
            onClick={() => onAccept(points)}
            className={cn(
              'h-8 w-8 rounded-lg font-bold text-white text-sm hover:scale-110 transition-transform',
              POINT_COLORS[points]
            )}
          >
            {points}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Story points summary for tasks
 */
export function StoryPointsSummary({
  tasks
}: {
  tasks: Task[];
}) {
  const estimated = tasks.filter(t => t.storyPoints);
  const total = estimated.reduce((sum, t) => sum + t.storyPoints!, 0);
  const average = estimated.length > 0 ? Math.round(total / estimated.length) : 0;

  return (
    <div className="flex items-center gap-4 p-3 bg-[hsl(var(--bg-soft))] rounded-lg">
      <div>
        <div className="text-xs text-[hsl(var(--muted))] font-semibold">Estimated</div>
        <div className="text-2xl font-bold text-[hsl(var(--text))]">{estimated.length}/{tasks.length}</div>
      </div>
      <div className="h-8 w-px bg-[hsl(var(--border))]" />
      <div>
        <div className="text-xs text-[hsl(var(--muted))] font-semibold">Total Points</div>
        <div className="text-2xl font-bold text-[hsl(var(--accent))]">{total}</div>
      </div>
      <div className="h-8 w-px bg-[hsl(var(--border))]" />
      <div>
        <div className="text-xs text-[hsl(var(--muted))] font-semibold">Average</div>
        <div className="text-2xl font-bold text-[hsl(var(--text))]">{average}</div>
      </div>
    </div>
  );
}
