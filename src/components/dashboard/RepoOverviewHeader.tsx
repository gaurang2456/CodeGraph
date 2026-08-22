'use client';

import React from 'react';
import { Repository } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { 
  GitBranch, 
  FileCode, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';

export interface RepoOverviewHeaderProps {
  repo: Repository;
}

export const RepoOverviewHeader: React.FC<RepoOverviewHeaderProps> = ({ repo }) => {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title and Badge */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight font-mono">{repo.name}</h1>
            <Badge variant="success" size="md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Indexing Complete
            </Badge>
          </div>
          <p className="text-xs text-slate-400 font-mono">{repo.fullName}</p>
        </div>

        {/* Action / Primary Tag */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            {repo.framework}
          </span>
        </div>
      </div>

      {/* Overview Stat Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Language</span>
            <span className="font-semibold text-slate-200">{repo.primaryLanguage}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Repository Size</span>
            <span className="font-semibold text-slate-200">{repo.size}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Estimated Files</span>
            <span className="font-semibold text-slate-200">{repo.fileCount} files</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <GitBranch className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Default Branch</span>
            <span className="font-semibold text-slate-200">{repo.branch}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
