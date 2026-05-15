'use client';

import { useState } from 'react';
import { Plus, X, Palette, Lock, Users } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const colorOptions = [
  { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Purple', value: '#A855F7', bg: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Green', value: '#10B981', bg: 'bg-green-500' },
  { name: 'Orange', value: '#F97316', bg: 'bg-orange-500' },
  { name: 'Red', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Cyan', value: '#06B6D4', bg: 'bg-cyan-500' },
  { name: 'Yellow', value: '#EAB308', bg: 'bg-yellow-500' },
];

type BoardDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
};

export function BoardDialog({ isOpen, onClose, projectId }: BoardDialogProps) {
  const [boardName, setBoardName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>('team');
  const [columns, setColumns] = useState<Array<{ id: string; name: string; color: string }>>([
    { id: 'col_1', name: 'To Do', color: '#3B82F6' },
    { id: 'col_2', name: 'In Progress', color: '#F97316' },
    { id: 'col_3', name: 'Done', color: '#10B981' },
  ]);
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const { addNotification } = useAppStore();

  if (!isOpen) return null;

  const addColumn = () => {
    if (newColumnName.trim()) {
      setColumns([
        ...columns,
        {
          id: `col_${Date.now()}`,
          name: newColumnName,
          color: selectedColor,
        },
      ]);
      setNewColumnName('');
      setSelectedColor('#3B82F6');
    }
  };

  const removeColumn = (id: string) => {
    if (columns.length > 1) {
      setColumns(columns.filter(col => col.id !== id));
    }
  };

  const handleCreateBoard = () => {
    if (!boardName.trim()) {
      addNotification({
        type: 'system',
        title: 'Validation Error',
        message: 'Board name is required'
      });
      return;
    }

    if (columns.length === 0) {
      addNotification({
        type: 'system',
        title: 'Validation Error',
        message: 'At least one column is required'
      });
      return;
    }

    const { addBoard } = useAppStore.getState();
    
    addBoard(
      boardName,
      description,
      projectId,
      columns.map(col => ({
        name: col.name,
        color: col.color
      })),
      visibility
    );

    addNotification({
      type: 'system',
      title: 'Success',
      message: `Board "${boardName}" created successfully`
    });

    // Reset and close
    setBoardName('');
    setDescription('');
    setVisibility('team');
    setColumns([
      { id: 'col_1', name: 'To Do', color: '#3B82F6' },
      { id: 'col_2', name: 'In Progress', color: '#F97316' },
      { id: 'col_3', name: 'Done', color: '#10B981' },
    ]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-[hsl(var(--muted))] transition-colors hover:text-[hsl(var(--text))]"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[hsl(var(--text))]">Create Custom Board</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              Design your own board layout with custom columns
            </p>
          </div>

          {/* Board Name */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--text))] mb-2">Board Name *</label>
            <input
              type="text"
              value={boardName}
              onChange={e => setBoardName(e.target.value)}
              placeholder="e.g., Feature Roadmap, Bug Tracking"
              className="w-full rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] px-4 py-2 text-[hsl(var(--text))] placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--text))] mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the purpose of this board..."
              rows={2}
              className="w-full rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] px-4 py-2 text-[hsl(var(--text))] placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--text))] mb-3">Visibility</label>
            <div className="grid grid-cols-3 gap-3">
              {(['private', 'team', 'public'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all',
                    visibility === v
                      ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]'
                      : 'border-[hsl(var(--border-soft))] text-[hsl(var(--muted))] hover:border-[hsl(var(--accent)/0.5)]'
                  )}
                >
                  {v === 'private' && <Lock className="h-4 w-4" />}
                  {v === 'team' && <Users className="h-4 w-4" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--text))] mb-3">Columns *</label>
            <div className="space-y-2 mb-4">
              {columns.map(col => (
                <div key={col.id} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] p-3">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="flex-1 text-[hsl(var(--text))] font-medium">{col.name}</span>
                  {columns.length > 1 && (
                    <button
                      onClick={() => removeColumn(col.id)}
                      className="text-[hsl(var(--muted))] hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Column */}
            <div className="space-y-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] p-4">
              <input
                type="text"
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                placeholder="New column name..."
                className="w-full rounded border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg))] px-3 py-2 text-sm text-[hsl(var(--text))] placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--accent))] focus:outline-none"
                onKeyPress={e => e.key === 'Enter' && addColumn()}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(var(--muted))] font-medium">Color:</span>
                <div className="flex gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        'h-6 w-6 rounded transition-transform hover:scale-110',
                        color.bg,
                        selectedColor === color.value && 'ring-2 ring-white'
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={addColumn}
                disabled={!newColumnName.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 py-2 font-medium text-black transition-all hover:bg-[hsl(var(--accent)/0.9)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add Column
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[hsl(var(--border-soft))] px-4 py-3 font-medium text-[hsl(var(--text))] transition-all hover:bg-[hsl(var(--bg-soft))]"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBoard}
              className="flex-1 rounded-lg bg-[hsl(var(--accent))] px-4 py-3 font-medium text-black transition-all hover:bg-[hsl(var(--accent)/0.9)]"
            >
              Create Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
