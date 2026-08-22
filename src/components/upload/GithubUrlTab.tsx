'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface GithubUrlTabProps {
  onStartClone: (url: string) => void;
}

export const GithubUrlTab: React.FC<GithubUrlTabProps> = ({ onStartClone }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please provide a repository URL or user/repo format');
      return;
    }

    if (!repoUrl.includes('/') && !repoUrl.startsWith('http')) {
      setError('Invalid format. Example: spring-projects/spring-petclinic');
      return;
    }

    setError('');
    onStartClone(repoUrl.trim());
  };

  const sampleRepos = [
    'spring-projects/spring-petclinic',
    'gothinkster/spring-boot-realworld-example-app',
    'tiangolo/fastapi'
  ];

  return (
    <form onSubmit={handleClone} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#cac5ce] flex items-center justify-between">
          <span>GitHub Repository URL or Name</span>
          <span className="text-[10px] font-mono text-[#938f98]">Public or Token Auth</span>
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined text-[18px] text-[#938f98] absolute left-3.5">
            link
          </span>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. gothinkster/spring-boot-realworld-example-app"
            className="w-full bg-[#121316] border border-[#48454d]/30 focus:border-[#fbcfe8]/60 rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-[#e3e2e6] placeholder:text-[#938f98] outline-none transition-colors"
          />
        </div>
        {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}
      </div>

      {/* Preset repository suggestions */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-mono text-[#938f98] uppercase tracking-wider block">
          Quick Demo Repositories:
        </span>
        <div className="flex flex-wrap gap-2">
          {sampleRepos.map((repo) => (
            <button
              key={repo}
              type="button"
              onClick={() => setRepoUrl(repo)}
              className="text-[11px] font-mono px-3 py-1 rounded-lg bg-[#1f1f23] hover:bg-[#292a2d] text-[#cac5ce] hover:text-[#fbcfe8] border border-[#48454d]/20 transition-colors"
            >
              {repo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <Button variant="primary" type="submit" className="w-full sm:w-auto">
          <span className="material-symbols-outlined text-[18px] mr-1.5">sync</span>
          Clone & Index Repository
        </Button>
      </div>
    </form>
  );
};
