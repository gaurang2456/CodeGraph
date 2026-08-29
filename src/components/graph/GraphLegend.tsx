'use client';

import React, { useState } from 'react';
import { SYMBOL_META, RELATIONSHIP_META, DEFAULT_NODE_TYPES, ALL_RELATIONSHIP_TYPES } from './graphUtils';

export const GraphLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="select-none font-mono text-xs">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="px-3 py-1.5 rounded-xl bg-[#1a1b1e]/90 backdrop-blur border border-[#48454d]/30 hover:border-[#938f98]/60 text-[#cac5ce] hover:text-[#e3e2e6] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer text-[11px]"
        >
          <span className="material-symbols-outlined text-[15px]">info</span>
          Legend
        </button>
      ) : (
        <div className="bg-[#1a1b1e]/95 backdrop-blur-md border border-[#48454d]/40 rounded-2xl shadow-2xl p-4 w-72 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[#48454d]/20 pb-2">
            <span className="font-bold text-[#e3e2e6] text-xs">Graph Legend</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-[#938f98] hover:text-[#e3e2e6] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {/* Node Types */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-[#938f98] uppercase tracking-wider block">
              Node Types
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DEFAULT_NODE_TYPES.map((type) => {
                const meta = SYMBOL_META[type];
                return (
                  <div key={type} className="flex items-center gap-1.5 text-[11px] text-[#cac5ce]">
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded text-[11px] ${meta.bg} ${meta.text}`}
                    >
                      <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                    </span>
                    <span>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Relationship Types */}
          <div className="space-y-2 pt-2 border-t border-[#48454d]/20">
            <span className="text-[10px] font-semibold text-[#938f98] uppercase tracking-wider block">
              Relationships
            </span>
            <div className="space-y-1.5">
              {ALL_RELATIONSHIP_TYPES.map((type) => {
                const meta = RELATIONSHIP_META[type];
                return (
                  <div key={type} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-0.5 rounded-full inline-block"
                        style={{ backgroundColor: meta.color }}
                      ></span>
                      <span className="font-bold text-[#e3e2e6]" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#76737c] truncate max-w-[120px]" title={meta.description}>
                      {meta.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
