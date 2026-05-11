'use client';

import { 
  RotateCcw, 
  Trash2, 
  History as HistoryIcon, 
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Archive
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';

export function HistoryView() {
  const { projects, restoreProject, permanentlyDeleteProject, activeWorkspaceId } = useAppStore();
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; projectId: string; projectName: string } | null>(null);

  const deletedProjects = useMemo(() => 
    projects.filter(p => p.isDeleted && p.workspaceId === activeWorkspaceId)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase())),
  [projects, activeWorkspaceId, search]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-10 px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Workspace History</h1>
          </div>
          <p className="text-[hsl(var(--muted))] max-w-xl">
            Review and restore terminated nodes or permanently purge data from the workspace core.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted))] group-focus-within:text-[hsl(var(--accent))] transition-colors" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search terminal history..."
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-sm text-white outline-none focus:border-[hsl(var(--accent)/0.5)] focus:ring-4 focus:ring-[hsl(var(--accent)/0.05)] transition-all"
          />
        </div>
        <button className="h-14 px-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-white hover:bg-white/10 transition-all">
          <Filter className="h-4 w-4" />
          Filter Type
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {deletedProjects.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/[0.08] hover:border-white/20"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-[9px] font-black uppercase tracking-widest text-red-500 border border-red-500/20">
                  <AlertCircle className="h-3 w-3" />
                  Terminated
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-white/10 to-transparent text-3xl font-black text-white/40 shadow-inner">
                    {project.key}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{project.name}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">
                        <Calendar className="h-3.5 w-3.5" />
                        Deleted {project.deletedAt ? new Date(project.deletedAt).toLocaleDateString() : 'Recently'}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-white/10" />
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--muted))]">
                        <Archive className="h-3.5 w-3.5" />
                        Type: {project.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => restoreProject(project.id)}
                    className="flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-6 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-emerald-500/20 transition hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restore Node
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({
                        isOpen: true,
                        projectId: project.id,
                        projectName: project.name
                      });
                    }}
                    className="flex h-12 items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 text-xs font-black uppercase tracking-widest text-red-500 transition hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                    Purge Data
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {deletedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 rounded-[40px] border border-dashed border-white/10 bg-white/[0.02]">
            <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-white/5 mb-6">
              <CheckCircle2 className="h-10 w-10 text-white/20" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest">History Clear</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted))]">No terminated nodes found in this sector.</p>
          </div>
        )}
      </div>

      <DeleteConfirmationDialog 
        isOpen={!!deleteConfirm?.isOpen}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            permanentlyDeleteProject(deleteConfirm.projectId);
            setDeleteConfirm(null);
          }
        }}
        title="Purge Project Node?"
        description={`WARNING: You are about to permanently purge ${deleteConfirm?.projectName} and all associated data. This action is irreversible.`}
        confirmLabel="Confirm Purge"
        isPermanent={true}
      />
    </div>
  );
}
