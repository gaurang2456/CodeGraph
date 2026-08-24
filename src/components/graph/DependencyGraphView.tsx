'use client';

import React from 'react';
import { Repository } from '@/types';

export interface DependencyGraphViewProps {
  repo: Repository;
  onSelectFile?: (filename: string) => void;
  onAskAi?: (prompt: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({ repo, onAskAi }) => {
  return (
    <div className="w-full h-[calc(100vh-8.5rem)] min-h-[540px] rounded-xl border border-[#48454d]/25 bg-[#111316] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none"></div>

      <div className="relative z-10 max-w-md space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#292a2d] border border-[#fbcfe8]/20 flex items-center justify-center text-[#fbcfe8] mx-auto shadow-xl">
          <span className="material-symbols-outlined text-[32px]">hub</span>
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbcfe8]/10 text-[#fbcfe8] text-[10px] font-mono uppercase tracking-widest border border-[#fbcfe8]/20">
            Coming in Phase 2
          </div>
          <h2 className="text-lg font-heading font-semibold text-[#e3e2e6]">
            Interactive Dependency Graph
          </h2>
          <p className="text-xs text-[#938f98] leading-relaxed">
            Full-codebase call hierarchies, import graphs, and multi-package relation visualizations for <span className="text-[#e3e2e6] font-mono">{repo.name}</span> will be generated automatically in Phase 2.
          </p>
        </div>

        <div className="pt-2">
          {onAskAi && (
            <button
              onClick={() => onAskAi(`Explain the high-level module architecture of ${repo.name}`)}
              className="px-4 py-2 bg-[#1f1f23] hover:bg-[#292a2d] border border-[#48454d]/30 rounded-xl text-xs font-mono text-[#fbcfe8] inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              Ask AI about Architecture
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
