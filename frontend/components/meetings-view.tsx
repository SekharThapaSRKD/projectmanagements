'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Link2, MapPin, Plus, Trash2, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { MeetingStatus } from '@/lib/types';

export function MeetingsView() {
  const { meetings, members, projects, activeWorkspaceId, addMeeting, updateMeeting, deleteMeeting } = useAppStore();

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [projectId, setProjectId] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');

  const workspaceProjects = useMemo(
    () => projects.filter(project => project.workspaceId === activeWorkspaceId && !project.isDeleted),
    [activeWorkspaceId, projects]
  );

  const workspaceMeetings = useMemo(
    () => meetings
      .filter(meeting => meeting.workspaceId === activeWorkspaceId)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [activeWorkspaceId, meetings]
  );

  const onCreateMeeting = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !startAt) return;

    addMeeting({
      title: title.trim(),
      description: description.trim() || undefined,
      startAt: new Date(startAt).toISOString(),
      durationMinutes,
      projectId: projectId || undefined,
      meetingLink: meetingLink.trim() || undefined,
      location: location.trim() || undefined
    });

    setTitle('');
    setDescription('');
    setStartAt('');
    setDurationMinutes(30);
    setProjectId('');
    setMeetingLink('');
    setLocation('');
    setIsCreating(false);
  };

  const changeStatus = (meetingId: string, status: MeetingStatus) => {
    updateMeeting(meetingId, { status });
  };

  const statusStyles: Record<MeetingStatus, string> = {
    scheduled: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    completed: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
    cancelled: 'border-red-400/30 bg-red-400/10 text-red-300'
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel soft-border rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Meetings</h2>
            <p className="text-sm text-[hsl(var(--muted))] mt-1">Plan, schedule, and track project syncs.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(value => !value)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? 'Close Form' : 'Create Meeting'}
          </button>
        </div>

        {isCreating && (
          <form onSubmit={onCreateMeeting} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Meeting title"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
              required
            />
            <input
              type="datetime-local"
              value={startAt}
              onChange={event => setStartAt(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
              required
            />
            <input
              type="number"
              min={15}
              step={15}
              value={durationMinutes}
              onChange={event => setDurationMinutes(Number(event.target.value) || 30)}
              placeholder="Duration (minutes)"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
            />
            <select
              value={projectId}
              onChange={event => setProjectId(event.target.value)}
              className="rounded-xl border border-white/10 bg-[hsl(var(--bg-soft))] px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
            >
              <option value="">No project</option>
              {workspaceProjects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input
              value={meetingLink}
              onChange={event => setMeetingLink(event.target.value)}
              placeholder="Meeting link (optional)"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
            />
            <input
              value={location}
              onChange={event => setLocation(event.target.value)}
              placeholder="Location (optional)"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
            />
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Agenda / notes"
              className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)]"
              rows={3}
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[hsl(var(--accent))]"
              >
                Save Meeting
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {workspaceMeetings.length === 0 && (
          <div className="glass-panel soft-border rounded-2xl p-8 text-center text-[hsl(var(--muted))]">
            No meetings yet. Create one to get started.
          </div>
        )}

        {workspaceMeetings.map(meeting => {
          const attendeeNames = members
            .filter(member => meeting.attendeeIds.includes(member.id))
            .map(member => member.name)
            .slice(0, 3);

          const relatedProject = projects.find(project => project.id === meeting.projectId);

          return (
            <article key={meeting.id} className="glass-panel soft-border rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{meeting.title}</h3>
                  {meeting.description && (
                    <p className="text-sm text-[hsl(var(--muted))] mt-1">{meeting.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={meeting.status}
                    onChange={event => changeStatus(meeting.id, event.target.value as MeetingStatus)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide ${statusStyles[meeting.status]}`}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteMeeting(meeting.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                    aria-label="Delete meeting"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[hsl(var(--muted))] md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(meeting.startAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {new Date(meeting.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meeting.durationMinutes}m
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {attendeeNames.length > 0 ? attendeeNames.join(', ') : 'No attendees'}
                </div>
                {relatedProject && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white w-fit">
                    {relatedProject.name}
                  </div>
                )}
              </div>

              {(meeting.meetingLink || meeting.location) && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted))]">
                  {meeting.meetingLink && (
                    <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[hsl(var(--accent))] hover:underline">
                      <Link2 className="h-4 w-4" />
                      Join link
                    </a>
                  )}
                  {meeting.location && (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {meeting.location}
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
