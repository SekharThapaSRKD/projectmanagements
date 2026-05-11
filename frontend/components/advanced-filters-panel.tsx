'use client';

import React from 'react';
import {
  QuickFilters,
  AdvancedFilterBuilder,
  FilterSearchInput,
  FilterChips,
  type FilterCondition,
  type SavedFilter
} from '@/lib/advanced-filters';

interface AdvancedFiltersPanelProps {
  onApplyFilter: (conditions: FilterCondition[]) => void;
  onSearch: (query: string) => void;
  members: Array<{ id: string; name: string }>;
  activeConditions: FilterCondition[];
  onRemoveCondition: (id: string) => void;
  onClearFilters: () => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
}

export function AdvancedFiltersPanel({
  onApplyFilter,
  onSearch,
  members,
  activeConditions,
  onRemoveCondition,
  onClearFilters,
  savedFilters = [],
  onSaveFilter
}: AdvancedFiltersPanelProps) {
  const [showBuilder, setShowBuilder] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <FilterSearchInput onSearch={onSearch} />

      {/* Quick filters */}
      <QuickFilters onFilterChange={() => {}} members={members} />

      {/* Active filter chips */}
      {activeConditions.length > 0 && (
        <FilterChips
          conditions={activeConditions}
          onRemove={onRemoveCondition}
          onClear={onClearFilters}
        />
      )}

      {/* Advanced filter builder toggle */}
      <button
        onClick={() => setShowBuilder(!showBuilder)}
        className="text-sm font-medium text-[hsl(var(--accent))] hover:text-[hsl(var(--accent)/0.8)]"
      >
        {showBuilder ? 'Hide' : 'Show'} Advanced Filters
      </button>

      {/* Advanced filter builder */}
      {showBuilder && (
        <AdvancedFilterBuilder
          onApplyFilter={onApplyFilter}
          onSaveFilter={onSaveFilter || (() => {})}
          members={members}
          savedFilters={savedFilters}
        />
      )}
    </div>
  );
}

export type { AdvancedFiltersPanelProps };
