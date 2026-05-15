'use client';

import { Code2, Plus, Trash2, X, MessageSquare, Tag, AlignLeft, BarChart2, User, Layers, FileCode, CheckCircle2, Paperclip, Upload, Image as ImageIcon, FileText, Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { CodeSnippet, Task } from '@/lib/types';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { motion, AnimatePresence } from 'framer-motion';

type TaskDialogProps = {
  task: Task | null;
  isNew: boolean;
  onClose: () => void;
};

const initialSnippet = (): CodeSnippet => ({ id: crypto.randomUUID(), language: 'ts', code: '', filename: 'snippet.ts' });

export function TaskDialog({ task, isNew, onClose }: TaskDialogProps) {
  const { addTask, updateTask, deleteTask, addComment, members, activeProjectId, activeSprintId, addTaskToSprint } = useAppStore();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium');
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '');
  const [labels, setLabels] = useState(task?.labels.join(', ') ?? '');
  const [devNotes, setDevNotes] = useState(task?.devNotes ?? '');
  const [snippet, setSnippet] = useState<CodeSnippet>(task?.codeSnippets?.[0] ?? initialSnippet());
  const [attachments, setAttachments] = useState(task?.attachments ?? []);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [comment, setComment] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const activeProject = useAppStore(state => state.projects.find(p => p.id === (task?.projectId ?? activeProjectId)));
  const projectMembers = useMemo(() => {
    if (!activeProject) return [];
    return members.filter(m => activeProject.memberIds?.includes(m.id));
  }, [members, activeProject]);

  const previewLabels = useMemo(() => labels.split(',').map(label => label.trim()).filter(Boolean), [labels]);

  if (!task && !isNew) {
    return null;
  }

  const saveTask = () => {
    if (!title.trim()) {
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
      labels: previewLabels,
      devNotes: devNotes.trim(),
      codeSnippets: snippet.code.trim() || snippet.filename.trim() ? [snippet] : [],
      projectId: task?.projectId ?? activeProjectId,
      sprintId: task?.sprintId ?? activeSprintId,
      attachments,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment = {
          id: crypto.randomUUID(),
          filename: file.name,
          url: reader.result as string, // base64 for demo
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative flex h-full max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-elevated))] shadow-2xl md:rounded-[32px]"
      >
        {/* Header */}
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
           <div className="flex min-w-0 items-center gap-4">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]">
                <Layers className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted))]">{isNew ? 'New Task' : `Task ID: ${task?.id.slice(0, 8)}`}</p>
                <h2 className="text-xl font-bold text-[hsl(var(--text))]">{isNew ? 'Create New Requirement' : 'Refine Task Details'}</h2>
             </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] transition-all hover:bg-[hsl(var(--bg-panel))] hover:text-[hsl(var(--text))] hover:rotate-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            {/* Main Content Area */}
            <div className="space-y-8 p-8 lg:border-r border-[hsl(var(--border-soft))]">
              {/* Title Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                  <AlignLeft className="h-3 w-3" /> Title
                </div>
                <input 
                  value={title} 
                  onChange={event => setTitle(event.target.value)} 
                  placeholder="Task title..."
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
                  rows={4} 
                  placeholder="Detailed explanation of the task..."
                  className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-4 text-sm text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all leading-relaxed" 
                />
              </div>

              {/* Dev Notes Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                  <Code2 className="h-3 w-3 text-[hsl(var(--accent))]" /> Technical Developer Notes
                </div>
                <textarea 
                  value={devNotes} 
                  onChange={event => setDevNotes(event.target.value)} 
                  rows={3} 
                  placeholder="Implementation details, API endpoints, logic flows..."
                  className="w-full resize-none rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-5 py-4 text-xs font-mono text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent)/0.5)] transition-all" 
                />
              </div>

              {/* Code Snippet Section */}
              <div className="rounded-3xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.3)] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <FileCode className="h-4 w-4" /> Code Architecture Reference
                  </div>
                  <button type="button" onClick={() => setSnippet(initialSnippet())} className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--accent))] hover:underline">
                    Clear Code
                  </button>
                </div>
                <div className="mb-3 grid gap-3 md:grid-cols-2">
                  <input value={snippet.filename} onChange={event => setSnippet(current => ({ ...current, filename: event.target.value }))} placeholder="filename.ts" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-xs outline-none" />
                  <input value={snippet.language} onChange={event => setSnippet(current => ({ ...current, language: event.target.value }))} placeholder="Language (ts, js, py...)" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2 text-xs outline-none" />
                </div>
                <textarea 
                  value={snippet.code} 
                  onChange={event => setSnippet(current => ({ ...current, code: event.target.value }))} 
                  rows={6} 
                  placeholder="// Paste reference code here..."
                  className="w-full rounded-2xl border border-[hsl(var(--border))] bg-black/40 px-5 py-4 font-mono text-xs text-[hsl(var(--text))] outline-none" 
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">No visual assets attached</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Info Area */}
            <div className="space-y-6 bg-[hsl(var(--bg-panel)/0.3)] p-4 sm:p-8">
               {/* Status & Priority */}
               <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                      <BarChart2 className="h-3 w-3" /> Progress Status
                    </div>
                    <select value={status} onChange={event => setStatus(event.target.value as Task['status'])} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))]">
                      {['backlog', 'todo', 'in_progress', 'in_review', 'done'].map(option => (
                        <option key={option} value={option}>{option.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                      <BarChart2 className="h-3 w-3" /> Priority Level
                    </div>
                    <select value={priority} onChange={event => setPriority(event.target.value as Task['priority'])} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))]">
                      {['low', 'medium', 'high', 'urgent'].map(option => (
                        <option key={option} value={option}>{option.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
               </div>

               {/* Assignee */}
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <User className="h-3 w-3" /> Responsible Member
                  </div>
                  <select value={assigneeId} onChange={event => setAssigneeId(event.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))]">
                    <option value="">Unassigned</option>
                    {projectMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
               </div>

               {/* Due Date */}
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <Calendar className="h-3 w-3" /> Target Timeline
                  </div>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--text))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]" 
                  />
               </div>

               {/* Labels */}
               <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                    <Tag className="h-3 w-3" /> Meta Labels
                  </div>
                  <input value={labels} onChange={event => setLabels(event.target.value)} placeholder="E.g. ui, core, bug" className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-2.5 text-xs outline-none" />
                  <div className="flex flex-wrap gap-2 pt-1">
                     {previewLabels.map(label => (
                       <span key={label} className="rounded-full bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent)/0.2)] px-2 py-0.5 text-[9px] font-bold uppercase text-[hsl(var(--accent))]">{label}</span>
                     ))}
                  </div>
               </div>

               {/* Comments Section */}
               <div className="pt-6 border-t border-[hsl(var(--border-soft))]">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                      <MessageSquare className="h-3 w-3" /> Activity Thread
                    </div>
                    {task && <span className="text-[10px] font-bold text-[hsl(var(--muted))]">{task.comments.length} items</span>}
                  </div>
                  
                  <div className="max-h-[200px] space-y-3 overflow-y-auto pr-2 mb-4">
                    {task?.comments.length ? task.comments.map(commentItem => (
                      <div key={commentItem.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] p-3">
                        <p className="text-[11px] leading-relaxed text-[hsl(var(--text))]">{commentItem.content}</p>
                        <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">
                          <span>{commentItem.authorId.slice(0, 8)}</span>
                        </div>
                      </div>
                    )) : <p className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted))]">No discussions yet</p>}
                  </div>

                  <div className="space-y-3">
                    <textarea value={comment} onChange={event => setComment(event.target.value)} rows={2} placeholder="Share a thought..." className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-soft))] px-4 py-3 text-xs outline-none focus:border-[hsl(var(--accent)/0.5)]" />
                    <button type="button" onClick={handleComment} className="w-full rounded-xl bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border))] py-2.5 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text))] transition-all hover:bg-[hsl(var(--bg-panel))]">
                      Post Update
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel)/0.5)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
           <button type="button" onClick={() => setIsDeleteDialogOpen(true)} className="flex h-11 items-center gap-2 rounded-2xl border border-[hsl(var(--danger))/0.2] bg-[hsl(var(--danger)/0.05)] px-5 text-sm font-bold text-[hsl(var(--danger))] transition-all hover:bg-[hsl(var(--danger)/0.1)]">
             <Trash2 className="h-4 w-4" /> Delete Task
           </button>
           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
             <button type="button" onClick={onClose} className="rounded-2xl border border-[hsl(var(--border))] px-6 py-3 text-sm font-bold text-[hsl(var(--muted))] transition-all hover:text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-soft))]">Cancel</button>
             <button type="button" onClick={saveTask} className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--accent))] px-8 py-3 text-sm font-bold text-black shadow-lg shadow-[hsl(var(--accent)/0.2)] transition-all hover:opacity-90 hover:scale-105 active:scale-95">
               <CheckCircle2 className="h-4 w-4" /> {isNew ? 'Create Requirement' : 'Save Modifications'}
             </button>
           </div>
        </div>
      </motion.div>

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