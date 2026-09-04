'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArchitecture, invalidateArchitecture, invalidateRepository } from '@/lib/api/queries';
import { Repository, ArchitectureFlow, ArchitectureFlowNode } from '@/types';

export interface RepositorySummaryViewProps {
  repo: Repository;
  onNavigateToGraph?: () => void;
  onNavigateToFiles?: () => void;
  onNavigateToArchitectureNode?: (node: ArchitectureFlowNode) => void;
  onAskQuestion?: (question: string) => void;
}

export const RepositorySummaryView: React.FC<RepositorySummaryViewProps> = ({
  repo,
  onNavigateToGraph,
  onNavigateToFiles,
  onNavigateToArchitectureNode,
  onAskQuestion
}) => {
  const queryClient = useQueryClient();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localSummary, setLocalSummary] = useState(repo.summary);

  const { data: cachedFlow } = useArchitecture(repo.id, repo.summary?.architectureFlow);
  const flowData: ArchitectureFlow | null =
    cachedFlow || localSummary?.architectureFlow || repo.summary?.architectureFlow || null;

  const stats = repo.stats || {
    classes: 0,
    packages: repo.folderCount || 0,
    files: repo.fileCount || 0,
    endpoints: 0,
    dependencies: 0,
    functions: 0
  };

  const summary = localSummary || repo.summary || {
    projectType: `${repo.primaryLanguage || 'Code'} Application`,
    architecture: repo.framework ? `${repo.framework} Architecture` : 'Modular Architecture',
    backend: repo.framework || 'Custom Backend',
    frontend: 'N/A',
    authentication: 'Standard Authentication',
    database: 'N/A',
    description: `Repository ${repo.name} containing ${repo.fileCount || 0} indexed source files across ${repo.folderCount || 0} packages.`,
    keyPackages: []
  };

  const technologies = repo.technologies || [];

  const handleRegenerateSummary = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/repositories/${repo.id}/summary`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setLocalSummary(data.summary);
          invalidateArchitecture(queryClient, repo.id);
          invalidateRepository(queryClient, repo.id);
        }
      }
    } catch (e) {
      console.error('Failed to regenerate summary:', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleNodeClick = (node: ArchitectureFlowNode) => {
    if (onNavigateToArchitectureNode) {
      onNavigateToArchitectureNode(node);
    } else if (onNavigateToFiles) {
      onNavigateToFiles();
    }
  };

  // Fallback nodes if flowData is loading or empty
  const displayNodes: ArchitectureFlowNode[] =
    flowData?.nodes && flowData.nodes.length > 0
      ? flowData.nodes
      : [
          {
            id: 'entry',
            label: 'Controllers',
            type: 'controller',
            description: 'API controllers & routing',
            icon: 'api',
            color: 'text-[#fbcfe8]',
            files: [],
            symbols: [],
            references: [],
          },
          {
            id: 'services',
            label: 'Services',
            type: 'service',
            description: 'Business domain services',
            icon: 'settings_b_roll',
            color: 'text-[#b7c8e1]',
            files: [],
            symbols: [],
            references: [],
          },
          {
            id: 'data-access',
            label: 'Data Access',
            type: 'repository',
            description: 'Repositories & data models',
            icon: 'folder_data',
            color: 'text-[#d7c3b6]',
            files: [],
            symbols: [],
            references: [],
          },
          {
            id: 'database',
            label: summary.database !== 'N/A' ? summary.database : 'Database',
            type: 'database',
            description: 'Primary storage layer',
            icon: 'dns',
            color: 'text-amber-400',
            files: [],
            symbols: [],
            references: [],
          },
        ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      {/* Top Banner / Repository Title & Tags */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6] tracking-tight">
              {repo.name}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#292a2d] text-[#cac5ce] border border-[#48454d]/30">
              {repo.primaryLanguage || 'Codebase'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerateSummary}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#292a2d] hover:bg-[#343538] text-[#cac5ce] hover:text-[#e3e2e6] text-xs font-medium transition-colors border border-[#48454d]/30 disabled:opacity-50"
              title="Re-synthesize AI architecture overview"
            >
              <span className={`material-symbols-outlined text-[16px] ${isRegenerating ? 'animate-spin' : ''}`}>
                refresh
              </span>
              {isRegenerating ? 'Analyzing...' : 'Refresh AI Summary'}
            </button>

            {onNavigateToGraph && (
              <button
                onClick={onNavigateToGraph}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fbcfe8] hover:bg-[#fbcfe8]/90 text-[#121316] text-xs font-medium transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                Explore Architecture Graph
              </button>
            )}
          </div>
        </div>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {technologies.map((tech, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-[#1a1b1e] border border-[#48454d]/25 text-[#cac5ce]"
            >
              {tech.icon && (
                <span className="material-symbols-outlined text-[13px] text-[#938f98]">
                  {tech.icon}
                </span>
              )}
              {tech.name}
            </span>
          ))}
        </div>
      </div>

      {/* Overview Description Block */}
      <section className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/20 flex flex-col gap-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#938f98]">Executive Overview</h2>
        <p className="text-xs sm:text-sm text-[#cac5ce] leading-relaxed">
          {summary.description}
        </p>
      </section>

      {/* Technical Architecture Breakdown */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-heading font-medium text-[#cac5ce] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">architecture</span>
          Technical Architecture Breakdown
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Architecture', value: summary.architecture, icon: 'account_tree', color: 'text-[#fbcfe8]' },
            { label: 'Project Type', value: summary.projectType, icon: 'category', color: 'text-[#b7c8e1]' },
            { label: 'Backend Layer', value: summary.backend, icon: 'dns', color: 'text-[#d7c3b6]' },
            ...(summary.httpAdapter ? [{ label: 'HTTP Adapter', value: summary.httpAdapter, icon: 'alt_route', color: 'text-indigo-400' }] : []),
            { label: 'Frontend Layer', value: summary.frontend, icon: 'web', color: 'text-[#fbcfe8]' },
            { label: 'Database & Storage', value: summary.database, icon: 'database', color: 'text-[#b7c8e1]' },
            ...(summary.caching ? [{ label: 'Caching & Session', value: summary.caching, icon: 'speed', color: 'text-rose-400' }] : []),
            { label: 'Authentication', value: summary.authentication, icon: 'security', color: 'text-[#d7c3b6]' },
            ...(summary.buildTool ? [{ label: 'Build & Package Tool', value: summary.buildTool, icon: 'build', color: 'text-amber-400' }] : []),
          ].map((card, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-[#1a1b1e] border border-[#48454d]/20 flex flex-col gap-1 hover:border-[#48454d]/40 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#938f98]">
                <span className={`material-symbols-outlined text-[14px] ${card.color}`}>
                  {card.icon}
                </span>
                {card.label}
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#e3e2e6] truncate" title={card.value}>
                {card.value}
              </span>
            </div>
          ))}
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

      {/* Dynamic Evidence-Based Core Architecture Flow */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-heading font-medium text-[#cac5ce] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">account_tree</span>
            Core Architecture Flow
          </h2>
          <span className="text-[11px] font-mono text-[#938f98]">
            Click any layer to inspect files & AST symbols
          </span>
        </div>

        <div className="bg-[#1a1b1e] shadow-lg rounded-xl p-6 flex items-center justify-between w-full max-w-5xl relative overflow-x-auto group border border-[#48454d]/20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-[#fbcfe8]/5 blur-2xl rounded-full pointer-events-none"></div>

          <div className="flex items-center justify-between w-full min-w-[600px] z-10 relative">
            {displayNodes.map((node, index) => {
              const isLast = index === displayNodes.length - 1;
              const fileCount = node.files?.length || 0;

              return (
                <React.Fragment key={node.id || index}>
                  {/* Architecture Layer Node Card */}
                  <div
                    className="flex flex-col items-center gap-2 min-w-[100px] max-w-[130px] cursor-pointer group/node"
                    onClick={() => handleNodeClick(node)}
                    title={node.description || `Explore ${node.label} (${fileCount} files)`}
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-[#292a2d] border border-[#48454d]/20 shadow-md flex items-center justify-center text-[#fbcfe8] group-hover/node:-translate-y-1 group-hover/node:border-[#fbcfe8]/40 group-hover/node:bg-[#343538] transition-all duration-300">
                        <span className={`material-symbols-outlined text-[24px] ${node.color || 'text-[#e3e2e6]'}`}>
                          {node.icon || 'view_module'}
                        </span>
                      </div>
                      {fileCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#121316] text-[#cac5ce] border border-[#48454d]/40 shadow-sm">
                          {fileCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[11px] font-mono font-medium text-[#e3e2e6] group-hover/node:text-[#fbcfe8] transition-colors leading-tight">
                        {node.label}
                      </span>
                      {fileCount > 0 && (
                        <span className="text-[9px] font-mono text-[#938f98] mt-0.5">
                          {fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connecting Arrow */}
                  {!isLast && (
                    <div className="flex-1 flex items-center justify-center relative h-12 mx-2">
                      <div className="w-full h-0.5 bg-[#48454d]/30 absolute top-1/2 -translate-y-1/2"></div>
                      <span className="material-symbols-outlined text-[#938f98] absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-[#1a1b1e] text-[16px]">
                        chevron_right
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive AI Prompt Chips */}
      {onAskQuestion && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xs font-heading font-medium text-[#cac5ce] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Explore Codebase with AI
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              'Explain the core architecture and request flow',
              'Where is authentication and authorization handled?',
              'What database tables and models are defined?',
              'List all REST API endpoints and controllers',
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => onAskQuestion(q)}
                className="text-xs text-[#cac5ce] hover:text-[#e3e2e6] bg-[#1a1b1e] hover:bg-[#292a2d] border border-[#48454d]/25 hover:border-[#48454d]/50 px-3 py-1.5 rounded-lg transition-all text-left cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
