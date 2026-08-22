'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Repository } from '@/types';

export interface NavbarProps {
  repositories: Repository[];
  activeRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  onOpenUploadModal: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleRightPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  repositories,
  activeRepo,
  onSelectRepo,
  onOpenUploadModal,
  onNavigateHome,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme,
  onToggleRightPanel
}) => {
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRepoDropdownOpen(false);
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#121316]/90 backdrop-blur-xl border-b border-[#48454d]/20 z-50 flex items-center px-6 gap-6 justify-between select-none">
      {/* Left: Brand & Repo/Branch Selectors */}
      <div className="flex items-center gap-4 min-w-fit" ref={dropdownRef}>
        {/* Logo & Brand (Matching Stitch header width) */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 min-w-[212px] text-left focus:outline-none group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#292a2d] border border-[#fbcfe8]/30 flex items-center justify-center text-[#fbcfe8] group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[17px]">hub</span>
          </div>
          <span className="font-heading font-semibold text-base text-[#e3e2e6] tracking-tight group-hover:text-white transition-colors">
            CodeGraph
          </span>
        </button>

        {/* Repository Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsRepoDropdownOpen(!isRepoDropdownOpen);
              setIsBranchDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f23] hover:bg-[#292a2d] rounded-lg border border-[#48454d]/30 text-xs font-medium text-[#e3e2e6] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#b7c8e1]">source</span>
            <span className="max-w-[160px] truncate">
              {activeRepo ? activeRepo.name : 'loan-management'}
            </span>
            <span className="material-symbols-outlined text-[14px] text-[#938f98]">expand_more</span>
          </button>

          {isRepoDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a1b1e] rounded-xl border border-[#48454d]/40 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[#938f98] uppercase tracking-wider">
                Repositories ({repositories.length})
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => {
                      onSelectRepo(repo);
                      setIsRepoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeRepo?.id === repo.id
                        ? 'bg-[#70485c]/30 text-[#fbcfe8] font-medium border border-[#fbcfe8]/20'
                        : 'text-[#cac5ce] hover:bg-[#292a2d] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[15px] text-[#b7c8e1]">source</span>
                      <span className="truncate">{repo.name}</span>
                    </div>
                    {activeRepo?.id === repo.id && (
                      <span className="material-symbols-outlined text-[14px] text-[#fbcfe8]">check</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="pt-1 mt-1 border-t border-[#48454d]/20">
                <button
                  onClick={() => {
                    setIsRepoDropdownOpen(false);
                    onOpenUploadModal();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#fbcfe8] hover:bg-[#70485c]/20 flex items-center gap-2 transition-colors font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Scan New Repository
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branch Dropdown */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => {
              setIsBranchDropdownOpen(!isBranchDropdownOpen);
              setIsRepoDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1f1f23] hover:bg-[#292a2d] rounded-lg border border-[#48454d]/30 text-xs font-medium text-[#e3e2e6] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#938f98]">account_tree</span>
            <span className="font-mono text-xs">{activeRepo?.branch || 'main'}</span>
            <span className="material-symbols-outlined text-[14px] text-[#938f98]">expand_more</span>
          </button>

          {isBranchDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-44 bg-[#1a1b1e] rounded-xl border border-[#48454d]/40 p-1.5 shadow-2xl z-50">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[#938f98] uppercase tracking-wider">
                Branches
              </div>
              <div className="space-y-0.5">
                {['main', 'develop', 'release/v1.0'].map((branch) => (
                  <button
                    key={branch}
                    onClick={() => setIsBranchDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono text-[#cac5ce] hover:bg-[#292a2d] hover:text-white flex items-center justify-between"
                  >
                    <span>{branch}</span>
                    {branch === (activeRepo?.branch || 'main') && (
                      <span className="material-symbols-outlined text-[14px] text-[#fbcfe8]">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 flex justify-center max-w-xl mx-4">
        <div className="flex items-center w-full bg-[#292a2d]/50 px-4 py-1.5 rounded-full border border-[#48454d]/20 focus-within:border-[#fbcfe8]/50 transition-all">
          <span className="material-symbols-outlined text-[18px] text-[#938f98] mr-2">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files, classes, functions..."
            className="bg-transparent border-none outline-none text-xs sm:text-sm w-full text-[#e3e2e6] placeholder:text-[#938f98]"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 min-w-fit">
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          className="p-1.5 hover:bg-[#292a2d] rounded-lg transition-colors text-[#cac5ce] hover:text-white cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>

        {/* Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#fbcfe8] flex items-center justify-center text-[#3d1729] font-medium shadow-sm cursor-pointer hover:bg-[#f9a8d4] transition-colors">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
};
