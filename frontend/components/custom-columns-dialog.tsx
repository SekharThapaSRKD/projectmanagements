'use client';

import { useState } from 'react';
import { Plus, X, Settings, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type CustomColumnsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
};

const defaultColumnSuggestions = [
  { name: 'Todo', value: 'todo' },
  { name: 'In Progress', value: 'in_progress' },
  { name: 'In Review', value: 'in_review' },
  { name: 'Testing', value: 'testing' },
  { name: 'Done', value: 'done' },
  { name: 'Backlog', value: 'backlog' },
  { name: 'Blocked', value: 'blocked' },
];

function DraggableColumnItem({ 
  column, 
  onRemove 
}: { 
  column: { id: string; title: string };
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] p-3 transition-all',
        isDragging && 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)] shadow-lg z-50'
      )}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-[hsl(var(--muted))] hover:text-white transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div>
          <p className="text-white font-medium">{column.title}</p>
          <p className="text-xs text-[hsl(var(--muted))]">{column.id}</p>
        </div>
      </div>
      <button
        onClick={() => onRemove(column.id)}
        className="text-[hsl(var(--muted))] hover:text-red-400 transition-colors p-1"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function CustomColumnsDialog({ isOpen, onClose, projectId }: CustomColumnsDialogProps) {
  const { projects, updateProject, addNotification } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  
  const [columns, setColumns] = useState<Array<{ id: string; title: string }>>(
    project?.columns || [
      { id: 'todo', title: 'Todo' },
      { id: 'in_progress', title: 'In Progress' },
      { id: 'in_review', title: 'In Review' },
      { id: 'done', title: 'Done' }
    ]
  );
  
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    })
  );

  if (!isOpen) return null;

  const addColumn = () => {
    if (!newColumnName.trim()) {
      addNotification({
        type: 'system',
        title: 'Error',
        message: 'Column name cannot be empty'
      });
      return;
    }

    if (columns.some(col => col.title.toLowerCase() === newColumnName.toLowerCase())) {
      addNotification({
        type: 'system',
        title: 'Error',
        message: 'Column already exists'
      });
      return;
    }

    const newColumn = {
      id: newColumnName.toLowerCase().replace(/\s+/g, '_'),
      title: newColumnName
    };

    setColumns([...columns, newColumn]);
    setNewColumnName('');
  };

  const removeColumn = (id: string) => {
    if (columns.length <= 1) {
      addNotification({
        type: 'system',
        title: 'Error',
        message: 'You must have at least one column'
      });
      return;
    }
    setColumns(columns.filter(col => col.id !== id));
  };

  const addSuggestion = (suggestion: { name: string; value: string }) => {
    if (columns.some(col => col.id === suggestion.value)) {
      addNotification({
        type: 'system',
        title: 'Info',
        message: `${suggestion.name} column already exists`
      });
      return;
    }

    setColumns([...columns, { id: suggestion.value, title: suggestion.name }]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(col => col.id === active.id);
      const newIndex = columns.findIndex(col => col.id === over.id);

      setColumns(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const handleSave = () => {
    if (project) {
      updateProject(projectId, {
        ...project,
        columns
      });

      addNotification({
        type: 'system',
        title: 'Success',
        message: 'Board columns updated successfully'
      });

      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-[hsl(var(--muted))] transition-colors hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white">Customize Board Columns</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              Add, remove, or customize the columns for your project board
            </p>
          </div>

          {/* Current Columns */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Current Columns (Drag to Reorder)</label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={columns.map(col => col.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {columns.map((col) => (
                    <DraggableColumnItem
                      key={col.id}
                      column={col}
                      onRemove={removeColumn}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Add Column */}
          <div className="space-y-3 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-input))] p-4">
            <label className="block text-sm font-medium text-white">Add New Column</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                placeholder="e.g., Testing, Blocked, Deployed"
                className="flex-1 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg))] px-4 py-2 text-white placeholder:text-[hsl(var(--muted))] focus:border-[hsl(var(--accent))] focus:outline-none"
                onKeyPress={e => e.key === 'Enter' && addColumn()}
              />
              <button
                onClick={addColumn}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--accent))] px-4 py-2 font-medium text-black transition-all hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Quick Add</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {defaultColumnSuggestions.map(suggestion => (
                <button
                  key={suggestion.value}
                  onClick={() => addSuggestion(suggestion)}
                  disabled={columns.some(col => col.id === suggestion.value)}
                  className={cn(
                    'rounded-lg border border-[hsl(var(--border-soft))] px-3 py-2 text-sm font-medium transition-all',
                    columns.some(col => col.id === suggestion.value)
                      ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] border-[hsl(var(--accent))] cursor-not-allowed'
                      : 'bg-[hsl(var(--bg-input))] text-white hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.05)]'
                  )}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[hsl(var(--border-soft))] px-4 py-3 font-medium text-white transition-all hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-[hsl(var(--accent))] px-4 py-3 font-medium text-black transition-all hover:opacity-90"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
