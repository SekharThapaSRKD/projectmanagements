'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  ChevronDown,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type FilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in' | 'nin';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[] | number;
  logic?: 'AND' | 'OR';
}

export interface SavedFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  icon?: string;
}

const FILTER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'label', label: 'Label' },
  { value: 'epic', label: 'Epic' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'storyPoints', label: 'Story Points' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'sprint', label: 'Sprint' }
];

const OPERATORS: Record<string, { value: FilterOperator; label: string }[]> = {
  default: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'in' },
    { value: 'nin', label: 'not in' }
  ],
  numeric: [
    { value: 'eq', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' }
  ]
};

/**
 * Applies a single filter condition to tasks
 */
export function applyCondition(
  tasks: Task[],
  condition: FilterCondition
): Task[] {
  return tasks.filter(task => {
    const fieldValue = getTaskFieldValue(task, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value)
          ? condition.value.includes(fieldValue)
          : false;
      case 'nin':
        return Array.isArray(condition.value)
          ? !condition.value.includes(fieldValue)
          : true;
      default:
        return true;
    }
  });
}

/**
 * Applies complex filter with AND/OR logic
 */
export function applyAdvancedFilter(
  tasks: Task[],
  conditions: FilterCondition[]
): Task[] {
  if (conditions.length === 0) return tasks;

  return tasks.filter(task => {
    let result = true;
    let currentLogic = 'AND';

    for (const condition of conditions) {
      const conditionMet = applyCondition([task], condition).length > 0;

      if (currentLogic === 'AND') {
        result = result && conditionMet;
      } else {
        result = result || conditionMet;
      }

      if (condition.logic) {
        currentLogic = condition.logic;
      }
    }

    return result;
  });
}

/**
 * Gets field value from a task
 */
function getTaskFieldValue(task: Task, field: string): any {
  switch (field) {
    case 'status': return task.status;
    case 'priority': return task.priority;
    case 'assignee': return task.assigneeId;
    case 'label': return task.labels;
    case 'epic': return task.epic;
    case 'title': return task.title;
    case 'description': return task.description;
    case 'storyPoints': return task.storyPoints;
    case 'dueDate': return task.dueDate;
    case 'sprint': return task.sprintId;
    default: return null;
  }
}

/**
 * Quick filter component
 */
export function QuickFilters({
  onFilterChange,
  members
}: {
  onFilterChange: (filter: string) => void;
  members: Array<{ id: string; name: string }>;
}) {
  const quickFilters = [
    { label: 'My Tasks', filter: `assignee:${members[0]?.id || ''}` },
    { label: 'High Priority', filter: 'priority:high OR priority:urgent' },
    { label: 'In Progress', filter: 'status:in_progress' },
    { label: 'Blocked', filter: 'status:blocked' },
    { label: 'Due Soon', filter: 'dueDate:<7d' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map(({ label, filter }) => (
        <button
          key={label}
          onClick={() => onFilterChange(filter)}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-[hsl(var(--bg-soft))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--accent)/0.1)] hover:text-[hsl(var(--accent))] transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Filter condition editor
 */
function FilterConditionRow({
  condition,
  fields,
  members,
  onChange,
  onDelete,
  onLogicChange
}: {
  condition: FilterCondition;
  fields: typeof FILTER_FIELDS;
  members: Array<{ id: string; name: string }>;
  onChange: (condition: FilterCondition) => void;
  onDelete: () => void;
  onLogicChange: (logic: 'AND' | 'OR') => void;
}) {
  const field = fields.find(f => f.value === condition.field);

  return (
    <div className="flex gap-2 items-center p-3 bg-[hsl(var(--bg-soft))] rounded-lg">
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value })}
        className="px-2 py-1 text-sm bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded text-[hsl(var(--text))]"
      >
        {fields.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as FilterOperator })}
        className="px-2 py-1 text-sm bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded text-[hsl(var(--text))]"
      >
        {((field && OPERATORS[field.value]) || OPERATORS.default).map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {condition.field === 'assignee' ? (
        <select
          value={condition.value as string}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="flex-1 px-2 py-1 text-sm bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded text-[hsl(var(--text))]"
        >
          <option value="">Select member...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={condition.value as string}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Enter value..."
          className="flex-1 px-2 py-1 text-sm bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded text-[hsl(var(--text))]"
        />
      )}

      {condition.logic && (
        <select
          value={condition.logic}
          onChange={(e) => onLogicChange(e.target.value as 'AND' | 'OR')}
          className="px-2 py-1 text-sm bg-[hsl(var(--accent)/0.1)] border border-[hsl(var(--accent))] rounded text-[hsl(var(--accent))] font-medium"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}

      <button
        onClick={onDelete}
        className="p-1.5 text-[hsl(var(--muted))] hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Advanced filter builder
 */
export function AdvancedFilterBuilder({
  onApplyFilter,
  onSaveFilter,
  members,
  savedFilters = []
}: {
  onApplyFilter: (conditions: FilterCondition[]) => void;
  onSaveFilter: (filter: SavedFilter) => void;
  members: Array<{ id: string; name: string }>;
  savedFilters?: SavedFilter[];
}) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { id: '1', field: 'status', operator: 'eq', value: '' }
  ]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const addCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      field: 'status',
      operator: 'eq',
      value: '',
      logic: conditions.length > 0 ? 'AND' : undefined
    };
    setConditions([...conditions, newCondition]);
  }, [conditions]);

  const removeCondition = useCallback((id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  }, [conditions]);

  const updateCondition = useCallback((updated: FilterCondition) => {
    setConditions(conditions.map(c => c.id === updated.id ? updated : c));
  }, [conditions]);

  const updateLogic = useCallback((id: string, logic: 'AND' | 'OR') => {
    setConditions(conditions.map(c => c.id === id ? { ...c, logic } : c));
  }, [conditions]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {conditions.map((condition, idx) => (
          <FilterConditionRow
            key={condition.id}
            condition={condition}
            fields={FILTER_FIELDS}
            members={members}
            onChange={updateCondition}
            onDelete={() => removeCondition(condition.id)}
            onLogicChange={(logic) => updateLogic(condition.id, logic)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={addCondition}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] hover:text-black transition-colors font-semibold text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Condition
        </button>

        <button
          onClick={() => onApplyFilter(conditions)}
          className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent)/0.9)] transition-colors font-semibold text-sm"
        >
          Apply Filter
        </button>

        <button
          onClick={() => setShowSaveDialog(true)}
          className="px-3 py-2 rounded-lg bg-[hsl(var(--bg-soft))] text-[hsl(var(--text))] hover:bg-[hsl(var(--bg-elevated))] transition-colors font-semibold text-sm flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>

      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border-soft))] space-y-2"
          >
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name..."
              className="w-full px-2 py-1 text-sm bg-[hsl(var(--bg))] border border-[hsl(var(--border))] rounded text-[hsl(var(--text))]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSaveFilter({
                    id: Date.now().toString(),
                    name: filterName,
                    conditions
                  });
                  setFilterName('');
                  setShowSaveDialog(false);
                }}
                className="flex-1 px-2 py-1 text-sm bg-[hsl(var(--accent))] text-black rounded hover:bg-[hsl(var(--accent)/0.9)]"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-2 py-1 text-sm bg-[hsl(var(--bg))] text-[hsl(var(--text))] rounded hover:bg-[hsl(var(--bg-elevated))]"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[hsl(var(--text))]">Saved Filters</h4>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map(filter => (
              <button
                key={filter.id}
                onClick={() => onApplyFilter(filter.conditions)}
                className="px-3 py-1.5 text-sm rounded-full bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors"
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Filter search input with instant search
 */
export function FilterSearchInput({
  onSearch,
  debounceMs = 300
}: {
  onSearch: (query: string) => void;
  debounceMs?: number;
}) {
  const [query, setQuery] = useState('');
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
  }, [debounceMs, onSearch]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search tasks..."
        className="w-full pl-9 pr-3 py-2 rounded-lg border border-[hsl(var(--border-soft))] bg-[hsl(var(--bg-panel))] text-[hsl(var(--text))] placeholder:text-[hsl(var(--muted))] focus:outline-none focus:border-[hsl(var(--accent))]"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted))]" />
    </div>
  );
}

/**
 * Filter chips display
 */
export function FilterChips({
  conditions,
  onRemove,
  onClear
}: {
  conditions: FilterCondition[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (conditions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {conditions.map(condition => (
        <motion.div
          key={condition.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] text-sm font-medium"
        >
          <span>{condition.field}: {condition.operator}</span>
          <button
            onClick={() => onRemove(condition.id)}
            className="hover:text-[hsl(var(--accent)/0.6)]"
          >
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      ))}

      <button
        onClick={onClear}
        className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--text))] underline"
      >
        Clear all
      </button>
    </div>
  );
}
