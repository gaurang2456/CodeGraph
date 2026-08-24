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
  onNavigateToFiles,
  onAskQuestion
}) => {
  const stats = repo.stats || {
    classes: 0,
    packages: repo.folderCount || 0,
    files: repo.fileCount || 0,
    endpoints: 0,
    dependencies: 0,
    functions: 0
  };

  const summary = repo.summary || {
    projectType: `${repo.primaryLanguage || 'Code'} Project`,
    architecture: repo.framework ? `${repo.framework} Architecture` : 'Modular Structure',
    backend: repo.framework || 'Custom',
    frontend: 'N/A',
    authentication: 'Standard',
    database: 'N/A',
    description: `Repository ${repo.name} containing ${repo.fileCount || 0} indexed source files.`,
    keyPackages: []
  };

  const technologies = repo.technologies || [];

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
            {repo.status === 'COMPLETED' ? 'Indexed in pgvector' : repo.stage || 'Indexed'}
          </div>
        </div>
        <p className="text-xs text-[#938f98]">Quick overview of this codebase</p>
      </header>

      {/* About & Tech Tags Section */}
      <section className="flex flex-col gap-4 relative z-10">
        <div className="absolute -inset-6 bg-[#292a2d]/20 rounded-2xl -z-10 blur-xl pointer-events-none"></div>
        <p className="text-sm sm:text-[15px] font-normal text-[#e3e2e6] max-w-4xl leading-relaxed">
          {summary.description}
        </p>

        {/* Real Tech Tags */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {technologies.map((tech, idx) => (
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
          {technologies.length === 0 && (
            <span className="px-3 py-1.5 bg-[#1f1f23] text-[#938f98] text-xs rounded-lg border border-[#48454d]/20 font-mono">
              {repo.primaryLanguage || 'Source Code'}
            </span>
          )}
        </div>
      </section>

      {/* Real Calculated Statistics Bar */}
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

      {/* Architecture Overview Flow */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-heading font-medium text-[#cac5ce] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          Core Architecture Flow
        </h2>

        <div className="bg-[#1a1b1e] shadow-lg rounded-xl p-6 flex items-center justify-between w-full max-w-5xl relative overflow-hidden group border border-[#48454d]/20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-[#fbcfe8]/5 blur-2xl rounded-full pointer-events-none"></div>

          <div className="flex items-center justify-between w-full z-10 relative">
            {/* Controller / Entrypoint */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#fbcfe8] group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="material-symbols-outlined text-[24px]">api</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">API / Controllers</span>
            </div>

            {/* Arrow 1 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Service */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#b7c8e1] group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="material-symbols-outlined text-[24px]">settings_b_roll</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Services</span>
            </div>

            {/* Arrow 2 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Repository / Data Access */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#d7c3b6] group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="material-symbols-outlined text-[24px]">folder_data</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">Data Access</span>
            </div>

            {/* Arrow 3 */}
            <div className="flex-1 flex items-center justify-center relative h-12">
              <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
              <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                chevron_right
              </span>
            </div>

            {/* Database / Storage */}
            <div className="flex flex-col items-center gap-2 w-28 cursor-pointer" onClick={onNavigateToFiles}>
              <div className="w-14 h-14 rounded-xl bg-[#292a2d] shadow-md flex items-center justify-center text-[#fbcfe8] group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="material-symbols-outlined text-[24px]">dns</span>
              </div>
              <span className="text-[11px] font-mono text-[#e3e2e6]">
                {summary.database !== 'N/A' ? summary.database : 'Storage'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
