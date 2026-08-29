'use client';

import React, { useState } from 'react';
import {
  GraphFilterState,
  SYMBOL_META,
  RELATIONSHIP_META,
  DEFAULT_NODE_TYPES,
  ALL_RELATIONSHIP_TYPES,
} from './graphUtils';
import { SymbolType, RelationshipType } from '@/server/analyzer/types';

export interface GraphFiltersProps {
  filterState: GraphFilterState;
  onFilterChange: (next: GraphFilterState) => void;
  onResetFilters: () => void;
}

export const GraphFilters: React.FC<GraphFiltersProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleNodeType = (type: SymbolType) => {
    const next = new Set(filterState.nodeTypes);
    if (next.has(type)) {
      if (next.size > 1) next.delete(type); // Keep at least one
    } else {
      next.add(type);
    }
    onFilterChange({ ...filterState, nodeTypes: next });
  };

  const toggleRelType = (type: RelationshipType) => {
    const next = new Set(filterState.relationshipTypes);
    if (next.has(type)) {
      if (next.size > 1) next.delete(type);
    } else {
      next.add(type);
    }
    onFilterChange({ ...filterState, relationshipTypes: next });
  };

  return (
    <div className="relative select-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-[#292a2d] border-[#fbcfe8]/60 text-[#fbcfe8]'
            : 'bg-[#1a1b1e]/90 backdrop-blur border-[#48454d]/30 text-[#cac5ce] hover:text-[#e3e2e6] hover:bg-[#222428]'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">filter_list</span>
        <span>Filters</span>
        {filterState.includeMethods && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#fbcfe8]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-[#1a1b1e] border border-[#48454d]/40 rounded-2xl shadow-2xl z-50 p-4 space-y-4 text-xs font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#48454d]/20 pb-2">
            <span className="font-bold text-[#e3e2e6] text-xs">Graph Filters</span>
            <button
              onClick={onResetFilters}
              className="text-[10px] text-[#fbcfe8] hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Node Types */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#938f98] uppercase tracking-wider block">
              Node Types
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_NODE_TYPES.map((type) => {
                const meta = SYMBOL_META[type];
                const active = filterState.nodeTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleNodeType(type)}
                    className={`px-2 py-1 rounded-lg text-[11px] border transition-colors cursor-pointer flex items-center gap-1 ${
                      active
                        ? `${meta.bg} ${meta.text} ${meta.border} font-medium`
                        : 'bg-[#121316] text-[#76737c] border-[#48454d]/20 hover:border-[#48454d]/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Include Methods Toggle */}
          <div className="pt-2 border-t border-[#48454d]/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-[#e3e2e6] block font-medium">Show Method Nodes</span>
              <span className="text-[10px] text-[#76737c] block">Includes member methods and calls</span>
            </div>
            <input
              type="checkbox"
              checked={filterState.includeMethods}
              onChange={(e) =>
                onFilterChange({ ...filterState, includeMethods: e.target.checked })
              }
              className="w-4 h-4 rounded accent-[#fbcfe8] bg-[#121316] border-[#48454d] cursor-pointer"
            />
          </div>

          {/* Relationship Types */}
          <div className="space-y-2 pt-2 border-t border-[#48454d]/20">
            <span className="text-[11px] font-semibold text-[#938f98] uppercase tracking-wider block">
              Relationships
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_RELATIONSHIP_TYPES.map((type) => {
                const meta = RELATIONSHIP_META[type];
                const active = filterState.relationshipTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleRelType(type)}
                    className={`px-2 py-1 rounded-lg text-[11px] border transition-colors cursor-pointer ${
                      active
                        ? 'font-medium'
                        : 'bg-[#121316] text-[#76737c] border-[#48454d]/20 hover:border-[#48454d]/50'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${meta.color}15`,
                            borderColor: `${meta.color}50`,
                            color: meta.color,
                          }
                        : {}
                    }
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confidence Filter */}
          <div className="pt-2 border-t border-[#48454d]/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-[#e3e2e6] block font-medium">Include Medium Confidence</span>
              <span className="text-[10px] text-[#76737c] block">Default is High confidence only</span>
            </div>
            <input
              type="checkbox"
              checked={filterState.includeMediumConfidence}
              onChange={(e) =>
                onFilterChange({ ...filterState, includeMediumConfidence: e.target.checked })
              }
              className="w-4 h-4 rounded accent-[#fbcfe8] bg-[#121316] border-[#48454d] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
