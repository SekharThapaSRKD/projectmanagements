'use client';

import { Code2, Plus, Trash2, X, ArrowLeft, Save, MessageSquare, Tag, AlignLeft, BarChart2, User, Layers, FileCode, CheckCircle2, Calendar, Paperclip, Upload, Image as ImageIcon, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { isTeamFlowApiConfigured, uploadFile } from '@/lib/teamflow-api';
import type { CodeSnippet, Task } from '@/lib/types';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { motion, AnimatePresence } from 'framer-motion';

type TaskFormViewProps = {
  task?: Task | null;
  onClose: () => void;
};

const initialSnippet = (): CodeSnippet => ({ id: crypto.randomUUID(), language: 'ts', code: '', filename: 'snippet.ts' });

export function TaskFormView({ task, onClose }: TaskFormViewProps) {
  const isNew = !task;
  const { addTask, updateTask, deleteTask, addComment, members, activeProjectId, activeSprintId, addTaskToSprint, setActiveView } = useAppStore();
  
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium');
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '');
  const [labels, setLabels] = useState(task?.labels?.join(', ') ?? '');
  const [devNotes, setDevNotes] = useState(task?.devNotes ?? '');
  const [snippet, setSnippet] = useState<CodeSnippet>(task?.codeSnippets?.[0] ?? initialSnippet());
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState(task?.attachments ?? []);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const activeProject = useAppStore(state => state.projects.find(p => p.id === (task?.projectId ?? activeProjectId)));
  const projectMembers = useMemo(() => {
    if (!activeProject) return [];
    return members.filter(m => activeProject.memberIds?.includes(m.id));
  }, [members, activeProject]);

  const previewLabels = useMemo(() => labels.split(',').map(label => label.trim()).filter(Boolean), [labels]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(async file => {
      if (isTeamFlowApiConfigured()) {
        try {
          const res = await uploadFile(file);
          const newAttachment = {
            id: crypto.randomUUID(),
            filename: res.filename || file.name,
            url: res.url,
            size: res.size ?? file.size,
            type: res.mimeType ?? file.type,
            uploadedAt: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAttachment]);
        } catch (err) {
          // fallback to local preview if upload fails
          const reader = new FileReader();
          reader.onloadend = () => {
            const newAttachment = {
              id: crypto.randomUUID(),
              filename: file.name,
              url: reader.result as string,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString()
            };
            setAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newAttachment = {
            id: crypto.randomUUID(),
            filename: file.name,
            url: reader.result as string,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const saveTask = () => {
    if (!title.trim()) {
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      type: task?.type ?? 'task',
      assigneeId: assigneeId || null,
      labels: previewLabels,
      devNotes: devNotes.trim(),
      codeSnippets: snippet.code.trim() || snippet.filename.trim() ? [snippet] : [],
      attachments,
      projectId: task?.projectId ?? activeProjectId,
      sprintId: task?.sprintId ?? activeSprintId,
      dueDate: dueDate || undefined
    };

    if (isNew) {
      const newTaskId = addTask(payload);
      if (payload.sprintId) {
        addTaskToSprint(newTaskId, payload.sprintId);
      }
    } else if (task) {
      updateTask(task.id, payload);
    }

    onClose();
  };

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      onClose();
    }
  };

  const handleComment = () => {
    if (task && comment.trim()) {
      addComment(task.id, comment.trim());
      setComment('');
    }
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <button 
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] transition-all hover:bg-[hsl(var(--bg-panel))] hover:text-[hsl(var(--text))] hover:-translate-x-1"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">{isNew ? 'Requirement Drafting' : `Reference: ${task?.id.slice(0, 8)}`}</p>
            <h1 className="text-3xl font-bold text-[hsl(var(--text))]">{isNew ? 'New Task' : 'Modify Task'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex h-12 items-center gap-2 rounded-2xl border border-[hsl(var(--danger))/0.2] bg-[hsl(var(--danger)/0.05)] px-6 text-sm font-bold text-[hsl(var(--danger))] transition-all hover:bg-[hsl(var(--danger)/0.1)]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button 
            onClick={saveTask}
            className="flex h-12 items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-8 text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-[hsl(var(--accent)/0.2)]"
          >
            <Save className="h-4 w-4" />
            {isNew ? 'Create Requirement' : 'Push Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="space-y-6">
          {/* Main Content Area */}
          <div className="glass-panel soft-border space-y-8 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8">
            {/* Title Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                <AlignLeft className="h-3 w-3" /> Title
              </div>
              <input 
                value={title} 
                onChange={event => setTitle(event.target.value)} 
                placeholder="What is the objective?"
                className="w-full bg-transparent text-2xl font-bold text-[hsl(var(--text))] outline-none placeholder:opacity-30 focus:text-[hsl(var(--accent))]" 
              />
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                <AlignLeft className="h-3 w-3" /> Description
              </div>
              <textarea 
                value={description} 
                onChange={event => setDescription(event.target.value)} 
                rows={6} 
                placeholder="Break down the requirement into actionable details..."
                className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-6 py-5 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all leading-relaxed" 
              />
            </div>

            {/* Dev Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                <Code2 className="h-3 w-3 text-[hsl(var(--accent))]" /> Engineering Notes
              </div>
              <textarea 
                value={devNotes} 
                onChange={event => setDevNotes(event.target.value)} 
                rows={4} 
                placeholder="Technical constraints, architectural patterns, or logic flow..."
                className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-6 py-5 text-xs font-mono text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all" 
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                  <Paperclip className="h-4 w-4" /> Attachments & Screenshots
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[hsl(var(--accent)/0.1)] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--accent))] transition hover:bg-[hsl(var(--accent)/0.2)]">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Files
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {attachments.map(file => (
                  <div key={file.id} className="group relative overflow-hidden rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-soft))] p-2 transition hover:border-[hsl(var(--accent)/0.3)]">
                    {file.type.startsWith('image/') ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/20">
                        <img src={file.url} alt={file.filename} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-black/20 text-[hsl(var(--muted))]">
                        <FileText className="h-8 w-8" />
                        <span className="mt-2 text-[10px] uppercase font-bold tracking-widest">{file.type.split('/')[1]}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold text-white">{file.filename}</p>
                        <p className="text-[9px] text-[hsl(var(--muted))]">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button 
                        onClick={() => removeAttachment(file.id)}
                        className="rounded-lg p-1 text-[hsl(var(--muted))] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-dashed border-[hsl(var(--border-soft))] p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/20">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                      No visual assets attached
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Code Snippet Section */}
            <div className="rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)] p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                  <FileCode className="h-5 w-5" /> Code Reference
                </div>
                <button onClick={() => setSnippet(initialSnippet())} className="text-xs font-bold text-[hsl(var(--accent))] hover:underline">Reset</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <input value={snippet.filename} onChange={e => setSnippet(s => ({ ...s, filename: e.target.value }))} placeholder="filename.ts" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs outline-none" />
                <input value={snippet.language} onChange={e => setSnippet(s => ({ ...s, language: e.target.value }))} placeholder="Language" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs outline-none" />
              </div>
              <textarea 
                value={snippet.code} 
                onChange={e => setSnippet(s => ({ ...s, code: e.target.value }))}
                rows={10}
                placeholder="// Implementation reference code..."
                className="w-full rounded-2xl border border-[hsl(var(--border))] bg-black/40 px-6 py-5 font-mono text-sm text-[hsl(var(--text))] outline-none"
              />
            </div>
          </div>

          {!isNew && (
            <div className="glass-panel soft-border space-y-6 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                <MessageSquare className="h-4 w-4" /> Discussion Thread
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <textarea 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    placeholder="Contribute to the discussion..."
                    className="flex-1 resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-4 text-sm outline-none focus:border-[hsl(var(--accent)/0.5)]"
                  />
                  <button onClick={handleComment} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition-transform hover:scale-105">
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  {(task.comments || []).map(c => (
                    <div key={c.id} className="rounded-2xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)] p-5">
                      <p className="text-sm leading-relaxed text-[hsl(var(--text))]">{c.content}</p>
                      <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                        <span className="flex items-center gap-2"><User className="h-3 w-3" /> {c.authorId.slice(0, 8)}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Configuration */}
        <aside className="space-y-6">
          <div className="glass-panel soft-border space-y-8 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8">
            <h3 className="text-lg font-bold text-[hsl(var(--text))]">Task Attributes</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Workflow Status</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))]"
                >
                  {['todo', 'in_progress', 'in_review', 'done'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Priority Assessment</label>
                <div className="grid grid-cols-2 gap-2">
                  {['low', 'medium', 'high', 'urgent'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p as any)}
                      className={`rounded-xl border px-3 py-2.5 text-[10px] font-bold transition-all ${
                        priority === p 
                        ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]' 
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:text-[hsl(var(--text))]'
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Accountable Owner</label>
                <select 
                  value={assigneeId} 
                  onChange={e => setAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))]"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Target Timeline</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted))]" />
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] pl-12 pr-4 py-3 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">Classification Labels</label>
                <input 
                  value={labels} 
                  onChange={e => setLabels(e.target.value)}
                  placeholder="e.g. frontend, backend, core"
                  className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs outline-none focus:border-[hsl(var(--accent)/0.5)]"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {previewLabels.map(l => (
                    <span key={l} className="rounded-full bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] px-2.5 py-1 text-[9px] font-bold uppercase text-[hsl(var(--accent))]">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel soft-border space-y-4 rounded-[32px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] p-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--text))]">Task Lineage</h3>
            <div className="space-y-3 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
              <div className="flex justify-between items-center">
                <span>Project Node</span>
                <span className="text-[hsl(var(--text))] font-mono">{task?.projectId.slice(0, 12) || activeProjectId?.slice(0, 12) || 'None'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Iteration Node</span>
                <span className="text-[hsl(var(--text))] font-mono">{task?.sprintId?.slice(0, 12) || activeSprintId?.slice(0, 12) || 'None'}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action will permanently remove it from the project."
        confirmLabel="Delete Task"
        isPermanent={true}
      />
    </div>
  );
}
