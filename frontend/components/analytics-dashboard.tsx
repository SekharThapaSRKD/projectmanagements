'use client';

import { BarChart3, CheckCircle2, Layers3, ShieldCheck } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '@/lib/store';

const statusColors: Record<string, string> = {
  backlog: '#64748b',
  todo: '#5b8cff',
  in_progress: '#f59e0b',
  in_review: '#a855f7',
  done: '#22c55e'
};

export function AnalyticsDashboard() {
  const { tasks, members, activeProjectId, sprints } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectTasks = useMemo(() => tasks.filter(task => task.projectId === activeProjectId), [activeProjectId, tasks]);
  const doneCount = projectTasks.filter(task => task.status === 'done').length;
  const activeSprint = sprints.find(sprint => sprint.projectId === activeProjectId && sprint.status === 'active');

  const statusData = useMemo(() => {
    const counts = projectTasks.reduce<Record<string, number>>((result, task) => {
      result[task.status] = (result[task.status] ?? 0) + 1;
      return result;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projectTasks]);

  const priorityData = useMemo(() => {
    const counts = projectTasks.reduce<Record<string, number>>((result, task) => {
      result[task.priority] = (result[task.priority] ?? 0) + 1;
      return result;
    }, {});

    return ['low', 'medium', 'high', 'urgent'].map(priority => ({ name: priority, value: counts[priority] ?? 0 }));
  }, [projectTasks]);

  const burndownData = useMemo(() => {
    const total = projectTasks.length || 1;
    return [0, 1, 2, 3, 4, 5, 6].map(day => ({ day: `D${day + 1}`, remaining: Math.max(0, total - Math.round((doneCount / 6) * day)) }));
  }, [doneCount, projectTasks.length]);

  const memberData = useMemo(() => members.map(member => ({ 
    name: (member.name || 'Unknown').split(' ')[0], 
    value: projectTasks.filter(task => task.assigneeId === member.id).length 
  })), [members, projectTasks]);

  const kpis = [
    { label: 'Total tasks', value: projectTasks.length, icon: Layers3 },
    { label: 'Completed', value: doneCount, icon: CheckCircle2 },
    { label: 'Active sprint', value: activeSprint ? 'Live' : 'None', icon: ShieldCheck },
    { label: 'Members', value: members.length, icon: BarChart3 }
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-5">
      <div className="panel-card soft-border rounded-[30px] p-5">
        <p className="text-xs uppercase tracking-[0.32em] text-[hsl(var(--muted))]">Analytics</p>
        <h1 className="text-3xl font-semibold text-white">Project health</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(item => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[hsl(var(--muted))]">{item.label}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{item.value}</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[28px] border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--bg-panel)/0.4)] p-5">
          <h2 className="mb-4 text-lg font-semibold">Status distribution</h2>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4}>
                  {statusData.map(entry => <Cell key={entry.name} fill={statusColors[entry.name] ?? '#22c55e'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[28px] border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--bg-panel)/0.4)] p-5">
          <h2 className="mb-4 text-lg font-semibold">Priority mix</h2>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="name" stroke="currentColor" opacity={0.5} />
                <YAxis allowDecimals={false} stroke="currentColor" opacity={0.5} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[28px] border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--bg-panel)/0.4)] p-5">
          <h2 className="mb-4 text-lg font-semibold">Burndown</h2>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="day" stroke="currentColor" opacity={0.5} />
                <YAxis allowDecimals={false} stroke="currentColor" opacity={0.5} />
                <Tooltip />
                <Line type="monotone" dataKey="remaining" stroke="hsl(var(--accent-2))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[28px] border border-[hsl(var(--border)/0.5)] bg-[hsl(var(--bg-panel)/0.4)] p-5">
          <h2 className="mb-4 text-lg font-semibold">Tasks per member</h2>
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberData} layout="vertical">
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(128,128,128,0.2)" />
                <XAxis type="number" allowDecimals={false} stroke="currentColor" opacity={0.5} />
                <YAxis dataKey="name" type="category" width={90} stroke="currentColor" opacity={0.5} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  );
}