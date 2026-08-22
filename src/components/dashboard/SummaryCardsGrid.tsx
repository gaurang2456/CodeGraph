'use client';

import React from 'react';
import { Repository } from '@/types';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { 
  Code2, 
  FileCode, 
  FolderTree, 
  Zap, 
  Server, 
  Monitor, 
  Database,
  ShieldAlert
} from 'lucide-react';

export interface SummaryCardsGridProps {
  repo: Repository;
}

export const SummaryCardsGrid: React.FC<SummaryCardsGridProps> = ({ repo }) => {
  const cards = [
    {
      title: 'Primary Language',
      value: repo.primaryLanguage,
      subtext: 'Detected from AST parsing',
      icon: Code2,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Total Files',
      value: formatNumber(repo.fileCount),
      subtext: 'Parsed & tokenized',
      icon: FileCode,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Total Folders',
      value: formatNumber(repo.folderCount),
      subtext: 'Directory structures',
      icon: FolderTree,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      title: 'Estimated Tokens',
      value: formatNumber(repo.estimatedTokens),
      subtext: 'Vector embeddings ready',
      icon: Zap,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Backend Framework',
      value: repo.summary.backend,
      subtext: 'Primary server stack',
      icon: Server,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Frontend Framework',
      value: repo.summary.frontend,
      subtext: 'UI web client',
      icon: Monitor,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      title: 'Database Engine',
      value: repo.summary.database,
      subtext: 'Persistence layer',
      icon: Database,
      color: 'text-red-400 bg-red-500/10 border-red-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} hoverEffect className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100 truncate">{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.subtext}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
