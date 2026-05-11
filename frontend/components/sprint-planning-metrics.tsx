'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Flame,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SprintPlanningMetrics {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  totalStoryPoints: number;
  completedPoints: number;
  teamCapacity: number;
  utilizationPercentage: number;
  avgPointsPerTask: number;
  teamWorkload: Map<string, number>;
  riskFactors: string[];
}

/**
 * Calculates sprint planning metrics
 */
export function calculateSprintMetrics(
  tasks: Task[],
  members: Array<{ id: string; name: string }>,
  teamCapacityPerSprint: number = 40
): SprintPlanningMetrics {
  const completed = tasks.filter(t => t.status === 'done');
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = completed.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Calculate workload per team member
  const teamWorkload = new Map<string, number>();
  members.forEach(m => teamWorkload.set(m.id, 0));

  tasks.forEach(task => {
    if (task.assigneeId) {
      teamWorkload.set(task.assigneeId, (teamWorkload.get(task.assigneeId) || 0) + (task.storyPoints || 1));
    }
  });

  // Identify risk factors
  const riskFactors: string[] = [];
  const utilizationPercentage = (totalPoints / teamCapacityPerSprint) * 100;

  if (utilizationPercentage > 100) riskFactors.push('Over capacity');
  if (utilizationPercentage < 70) riskFactors.push('Under capacity');

  const overloadedMembers = Array.from(teamWorkload.entries()).filter(
    ([_, points]) => points > teamCapacityPerSprint / members.length
  );
  if (overloadedMembers.length > 0) riskFactors.push(`${overloadedMembers.length} member(s) overloaded`);

  return {
    totalTasks: tasks.length,
    completedTasks: completed.length,
    remainingTasks: tasks.length - completed.length,
    totalStoryPoints: totalPoints,
    completedPoints: completedPoints,
    teamCapacity: teamCapacityPerSprint,
    utilizationPercentage: Math.round(utilizationPercentage),
    avgPointsPerTask: tasks.length > 0 ? Math.round(totalPoints / tasks.length) : 0,
    teamWorkload,
    riskFactors
  };
}

/**
 * Sprint capacity indicator
 */
export function SprintCapacityIndicator({
  metrics,
  compact = false
}: {
  metrics: SprintPlanningMetrics;
  compact?: boolean;
}) {
  const percentage = Math.min(metrics.utilizationPercentage, 100);
  const isOverCapacity = metrics.utilizationPercentage > 100;
  const isUnderCapacity = metrics.utilizationPercentage < 70;

  const statusColor = isOverCapacity
    ? 'text-rose-600'
    : isUnderCapacity
      ? 'text-amber-600'
      : 'text-green-600';

  const barColor = isOverCapacity
    ? 'bg-rose-500'
    : isUnderCapacity
      ? 'bg-amber-500'
      : 'bg-green-500';

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-[hsl(var(--text))]">
          {metrics.totalStoryPoints}/{metrics.teamCapacity}
        </div>
        <div className="flex-1 h-2 bg-[hsl(var(--bg-soft))] rounded-full overflow-hidden max-w-xs">
          <div
            className={cn(barColor, 'h-full transition-all')}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {isOverCapacity && <Flame className={cn('h-4 w-4', statusColor)} />}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[hsl(var(--text))] flex items-center gap-2">
          <Target className="h-5 w-5 text-[hsl(var(--accent))]" />
          Sprint Capacity
        </h3>
        <span className={cn('text-lg font-bold', statusColor)}>
          {metrics.utilizationPercentage}%
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(var(--muted))]">Planned Points</span>
          <span className="font-semibold text-[hsl(var(--text))]">{metrics.totalStoryPoints}</span>
        </div>
        <div className="h-3 bg-[hsl(var(--bg-soft))] rounded-full overflow-hidden">
          <div
            className={cn(barColor, 'h-full transition-all')}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-[hsl(var(--muted))]">Team Capacity</div>
          <div className="font-bold text-[hsl(var(--text))]">{metrics.teamCapacity}pts</div>
        </div>
        <div>
          <div className="text-xs text-[hsl(var(--muted))]">Planned</div>
          <div className="font-bold text-[hsl(var(--text))]">{metrics.totalStoryPoints}pts</div>
        </div>
        <div>
          <div className="text-xs text-[hsl(var(--muted))]">Available</div>
          <div className="font-bold text-[hsl(var(--text))]">{Math.max(0, metrics.teamCapacity - metrics.totalStoryPoints)}pts</div>
        </div>
      </div>

      {metrics.riskFactors.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-[hsl(var(--border-soft))]">
          <h4 className="text-xs font-semibold text-[hsl(var(--muted))] uppercase">Risk Factors</h4>
          {metrics.riskFactors.map((factor, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {factor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Team workload visualization
 */
export function TeamWorkloadChart({
  metrics,
  members
}: {
  metrics: SprintPlanningMetrics;
  members: Array<{ id: string; name: string }>;
}) {
  const chartData = members.map(member => ({
    name: member.name,
    assigned: metrics.teamWorkload.get(member.id) || 0,
    capacity: metrics.teamCapacity / members.length
  }));

  return (
    <div className="rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-6 space-y-4">
      <h3 className="font-semibold text-[hsl(var(--text))] flex items-center gap-2">
        <Users className="h-5 w-5 text-[hsl(var(--accent))]" />
        Team Allocation
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" stroke="hsl(var(--muted))" />
          <YAxis stroke="hsl(var(--muted))" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--bg-elevated))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            labelStyle={{ color: 'hsl(var(--text))' }}
          />
          <Legend />
          <Bar dataKey="assigned" fill="hsl(var(--accent))" name="Assigned" />
          <Bar dataKey="capacity" fill="hsl(var(--muted))" opacity={0.3} name="Capacity" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Sprint health radar chart
 */
export function SprintHealthRadar({
  metrics
}: {
  metrics: SprintPlanningMetrics;
}) {
  const maxStoryPoints = Math.max(100, metrics.teamCapacity * 1.2);

  const data = [
    {
      category: 'Capacity',
      value: Math.min(100, (metrics.totalStoryPoints / metrics.teamCapacity) * 100)
    },
    {
      category: 'Progress',
      value: metrics.totalTasks > 0 ? (metrics.completedTasks / metrics.totalTasks) * 100 : 0
    },
    {
      category: 'Team Balance',
      value: 75 // Placeholder
    },
    {
      category: 'Risk Level',
      value: metrics.riskFactors.length > 0 ? 50 : 100
    }
  ];

  return (
    <div className="rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-6 space-y-4">
      <h3 className="font-semibold text-[hsl(var(--text))] flex items-center gap-2">
        <Zap className="h-5 w-5 text-[hsl(var(--accent))]" />
        Sprint Health
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="category" stroke="hsl(var(--muted))" />
          <PolarRadiusAxis stroke="hsl(var(--muted))" />
          <Radar
            name="Health"
            dataKey="value"
            stroke="hsl(var(--accent))"
            fill="hsl(var(--accent))"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Sprint planning sidebar showing metrics
 */
export function SprintPlanningMetricsPanel({
  tasks,
  members,
  teamCapacityPerSprint = 40
}: {
  tasks: Task[];
  members: Array<{ id: string; name: string }>;
  teamCapacityPerSprint?: number;
}) {
  const metrics = useMemo(
    () => calculateSprintMetrics(tasks, members, teamCapacityPerSprint),
    [tasks, members, teamCapacityPerSprint]
  );

  return (
    <div className="space-y-6">
      <SprintCapacityIndicator metrics={metrics} />

      <div className="rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-6 space-y-4">
        <h3 className="font-semibold text-[hsl(var(--text))] flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--accent))]" />
          Sprint Stats
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[hsl(var(--muted))] mb-1">Total Tasks</div>
            <div className="text-2xl font-bold text-[hsl(var(--text))]">{metrics.totalTasks}</div>
          </div>
          <div>
            <div className="text-xs text-[hsl(var(--muted))] mb-1">Completed</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{metrics.completedTasks}</div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div>
            <div className="text-xs text-[hsl(var(--muted))] mb-1">Story Points</div>
            <div className="text-2xl font-bold text-[hsl(var(--text))]">{metrics.totalStoryPoints}</div>
          </div>
          <div>
            <div className="text-xs text-[hsl(var(--muted))] mb-1">Avg per Task</div>
            <div className="text-2xl font-bold text-[hsl(var(--text))]">{metrics.avgPointsPerTask}</div>
          </div>
        </div>
      </div>

      <TeamWorkloadChart metrics={metrics} members={members} />
      <SprintHealthRadar metrics={metrics} />
    </div>
  );
}

export type { SprintPlanningMetrics };
