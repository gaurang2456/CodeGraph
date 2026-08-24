'use client';

import React from 'react';
import { Repository } from '@/types';

export interface AnalysisViewProps {
  repo: Repository;
  onAskAi?: (prompt: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ repo, onAskAi }) => {
  const stats = repo.stats || {
    classes: 0,
    packages: repo.folderCount || 0,
    files: repo.fileCount || 0,
    endpoints: 0,
    dependencies: 0,
    functions: 0
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-5xl pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6] tracking-tight">
            Repository Metrics
          </h1>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbcfe8]/10 text-[#fbcfe8] text-[10px] font-mono uppercase tracking-widest border border-[#fbcfe8]/20">
            Real Metrics Active
          </div>
        </div>
        <p className="text-xs text-[#938f98]">
          Real indexed metrics calculated from {repo.name} source code
        </p>
      </header>

      {/* Real Health Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Total Files</span>
            <span className="material-symbols-outlined text-[#fbcfe8] text-[18px]">folder</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#fbcfe8]">{stats.files}</div>
          <p className="text-[11px] text-[#cac5ce]">{stats.packages} packages / directories indexed.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Symbols & Classes</span>
            <span className="material-symbols-outlined text-[#b7c8e1] text-[18px]">code</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#b7c8e1]">{stats.classes}</div>
          <p className="text-[11px] text-[#cac5ce]">{stats.functions} methods and functions parsed.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Detected Framework</span>
            <span className="material-symbols-outlined text-[#d7c3b6] text-[18px]">bolt</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#d7c3b6]">{repo.framework || repo.primaryLanguage}</div>
          <p className="text-[11px] text-[#cac5ce]">{stats.endpoints} detected API endpoints.</p>
        </div>
      </div>

      {/* Phase 2 Deep Architecture Audit Placeholder Card */}
      <section className="bg-[#1a1b1e] border border-[#48454d]/25 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#292a2d] text-[#fbcfe8] flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
        </div>
        <div className="space-y-1 max-w-lg">
          <h2 className="text-sm font-heading font-semibold text-[#e3e2e6]">
            Deep Static Analysis & Security Auditing
          </h2>
          <p className="text-xs text-[#938f98] leading-relaxed">
            Automated vulnerability scans, dead-code detection, and architecture rule enforcement are planned for Phase 2. Use the AI Assistant in the right panel to ask custom architectural questions today.
          </p>
        </div>
        {onAskAi && (
          <button
            onClick={() => onAskAi(`Audit security and authentication practices in ${repo.name}`)}
            className="px-3.5 py-1.5 bg-[#fbcfe8] text-[#3d1729] rounded-lg text-xs font-semibold hover:bg-[#f9a8d4] transition-colors cursor-pointer"
          >
            Audit Security with AI
          </button>
        )}
      </section>
    </div>
  );
};
