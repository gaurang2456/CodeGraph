'use client';

import React from 'react';
import { Repository } from '@/types';

export interface RepositorySummaryViewProps {
  repo: Repository;
  onNavigateToGraph?: () => void;
  onNavigateToFiles?: () => void;
  onAskQuestion?: (question: string) => void;
}

export const RepositorySummaryView: React.FC<RepositorySummaryViewProps> = ({
  repo,
  onNavigateToGraph,
  onNavigateToFiles
}) => {
  const stats = repo.stats || {
    classes: 42,
    packages: 18,
    files: repo.fileCount || 64,
    endpoints: 18,
    dependencies: 23,
    functions: 187
  };

  return (
    <div className="flex flex-col w-full gap-7 max-w-5xl">
      {/* Header Section */}
      <header className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6] tracking-tight">
            Summary
          </h1>
          <div className="flex items-center gap-1.5 bg-[#fbcfe8]/10 text-[#fbcfe8] px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest shadow-sm shadow-[#fbcfe8]/5">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Scanned {repo.lastIndexedAt}
          </div>
        </div>
        <p className="text-xs text-[#938f98]">Quick overview of this codebase</p>
      </header>

      {/* About & Tech Tags Section */}
      <section className="flex flex-col gap-4 relative z-10">
        <div className="absolute -inset-6 bg-[#292a2d]/20 rounded-2xl -z-10 blur-xl pointer-events-none"></div>
        <p className="text-sm sm:text-[15px] font-normal text-[#e3e2e6] max-w-4xl leading-relaxed">
          {repo.summary.description}
        </p>

        {/* Tech Tags */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {repo.technologies.map((tech, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-[#1f1f23] shadow-sm text-[#e3e2e6] text-xs font-medium rounded-lg flex items-center gap-2 border border-[#48454d]/20"
            >
              <span className={`material-symbols-outlined text-[16px] ${tech.color || 'text-[#fbcfe8]'}`}>
                {tech.icon || 'code'}
              </span>
              {tech.name}
            </span>
          ))}
        </div>
      </section>

      {/* Compact Statistics (Even single row with proportional sizing) */}
      <section className="py-4 px-2 flex flex-wrap items-center justify-between gap-y-3 max-w-4xl border-y border-[#48454d]/20">
        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Classes</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.classes}</span>
        </div>
        <div className="w-1 h-7 bg-[#343538] rounded-full"></div>

        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Packages</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.packages}</span>
        </div>
        <div className="w-1 h-7 bg-[#343538] rounded-full"></div>

        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Files</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.files}</span>
        </div>
        <div className="w-1 h-7 bg-[#343538] rounded-full"></div>

        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Endpoints</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.endpoints}</span>
        </div>
        <div className="w-1 h-7 bg-[#343538] rounded-full"></div>

        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Dependencies</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.dependencies}</span>
        </div>
        <div className="w-1 h-7 bg-[#343538] rounded-full"></div>

        <div className="flex flex-col gap-0.5 min-w-[65px]">
          <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Functions</span>
          <span className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6]">{stats.functions}</span>
        </div>
      </section>

      {/* Core Data Flow Architecture Diagram */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-heading font-medium text-[#cac5ce] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          Core Data Flow
        </h2>

        <div className="bg-[#1a1b1e] shadow-lg rounded-xl p-6 flex items-center justify-between w-full max-w-5xl relative overflow-hidden group border border-[#48454d]/20">
          {/* Decorative background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-[#fbcfe8]/5 blur-2xl rounded-full pointer-events-none"></div>

          {/* Nodes & Connectors */}
          <div className="flex items-center justify-between w-full z-10 relative">
            {/* Controller */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#fbcfe8] group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="material-symbols-outlined text-[24px]">api</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Controller</span>
            </div>

            {/* Arrow 1 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#fbcfe8]/50 to-transparent absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Service */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#b7c8e1] group-hover:-translate-y-0.5 transition-transform duration-300 delay-75">
                <span className="material-symbols-outlined text-[24px]">settings_b_roll</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Service</span>
            </div>

            {/* Arrow 2 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#b7c8e1]/50 to-transparent absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-150"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Repository */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#d7c3b6] group-hover:-translate-y-0.5 transition-transform duration-300 delay-150">
                <span className="material-symbols-outlined text-[24px]">folder_data</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Repository</span>
            </div>

            {/* Arrow 3 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#d7c3b6]/50 to-transparent absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Database */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToGraph}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#fbcfe8] group-hover:-translate-y-0.5 transition-transform duration-300 delay-200">
                <span className="material-symbols-outlined text-[24px]">dns</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Database</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
