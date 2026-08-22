'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { SAMPLE_REPOSITORIES } from '@/services/mockData';
import { Repository } from '@/types';

export interface HeroSectionProps {
  onOpenUploadZip: () => void;
  onOpenUploadGithub: () => void;
  onSelectSampleRepo: (repo: Repository) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenUploadZip,
  onOpenUploadGithub,
  onSelectSampleRepo
}) => {
  return (
    <div className="space-y-10 py-8 text-center max-w-4xl mx-auto">
      {/* Top Tagline Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fbcfe8]/10 border border-[#fbcfe8]/20 text-xs font-mono text-[#fbcfe8] shadow-sm">
        <span className="material-symbols-outlined text-[16px]">hub</span>
        <span>Codebase Architecture & Dependency Graph Assistant</span>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-heading font-bold tracking-tight text-[#e3e2e6] leading-tight">
          Explore Code Architecture <br />
          <span className="text-[#fbcfe8]">
            with Interactive Vector Graphs
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[#cac5ce] max-w-2xl mx-auto leading-relaxed">
          Upload any GitHub repository or ZIP archive to explore code layers, interactive dependency graphs, file hierarchy, and get instant step-by-step implementation plans.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onOpenUploadZip}
          className="w-full sm:w-auto font-semibold px-6 shadow-md"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">upload_file</span>
          Upload Repository ZIP
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenUploadGithub}
          className="w-full sm:w-auto font-semibold px-6"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">link</span>
          Paste GitHub URL
        </Button>
      </div>

      {/* Preset Quick-Test Sample Repositories */}
      <div className="pt-6 border-t border-[#48454d]/30 space-y-4">
        <p className="text-xs font-mono uppercase tracking-wider text-[#938f98]">
          Or test-drive pre-indexed workspaces:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {SAMPLE_REPOSITORIES.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectSampleRepo(repo)}
              className="bg-[#1a1b1e] hover:bg-[#1f1f23] rounded-2xl p-4 text-left border border-[#48454d]/25 hover:border-[#fbcfe8]/40 flex items-center justify-between group transition-all cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-3 truncate">
                <div className="w-10 h-10 rounded-xl bg-[#292a2d] border border-[#fbcfe8]/20 flex items-center justify-center text-[#fbcfe8] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">source</span>
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#e3e2e6] font-mono truncate group-hover:text-[#fbcfe8] transition-colors">
                    {repo.name}
                  </p>
                  <p className="text-[11px] text-[#938f98] mt-0.5">{repo.framework} • {repo.fileCount} files</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#938f98] group-hover:text-[#fbcfe8] group-hover:translate-x-1 transition-all shrink-0">
                arrow_forward
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
