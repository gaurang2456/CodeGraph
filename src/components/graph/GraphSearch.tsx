'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GraphApiNode, SYMBOL_META } from './graphUtils';

export interface GraphSearchProps {
  nodes: GraphApiNode[];
  onSelectNode: (nodeId: string) => void;
}

export const GraphSearch: React.FC<GraphSearchProps> = ({ nodes, onSelectNode }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredNodes = query.trim()
    ? nodes
        .filter(
          (n) =>
            n.name.toLowerCase().includes(query.toLowerCase()) ||
            n.filePath.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nodeId: string) => {
    onSelectNode(nodeId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-64 md:w-80 select-none">
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3.5 text-[#938f98] text-[18px] pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Search symbols (e.g. AuthService)..."
          className="w-full pl-10 pr-9 py-2 bg-[#161820]/95 backdrop-blur-xl border border-[#48454d]/40 focus:border-[#fbcfe8]/80 focus:ring-1 focus:ring-[#fbcfe8]/30 rounded-xl text-xs font-mono text-white placeholder-[#76737c] focus:outline-none transition-all shadow-md"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-[#938f98] hover:text-white text-[14px]"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        )}
      </div>

      {/* Typeahead Dropdown */}
      {isOpen && filteredNodes.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto bg-[#1a1b1e] border border-[#48454d]/40 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
          {filteredNodes.map((node) => {
            const meta = SYMBOL_META[node.type] || SYMBOL_META.variable;
            const fileBasename = node.filePath.split('/').pop() || node.filePath;
            return (
              <button
                key={node.id}
                onClick={() => handleSelect(node.id)}
                className="w-full p-2 rounded-lg hover:bg-[#292a2d] text-left transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-[#e3e2e6] truncate">
                      {node.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${meta.bg} ${meta.text} ${meta.border}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#76737c] block truncate">
                    {fileBasename} : L{node.startLine}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[#938f98] text-[16px]">
                  north_east
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
