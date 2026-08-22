'use client';

import React from 'react';
import { FileCitation } from '@/types';
import { FileCode, ExternalLink } from 'lucide-react';

export interface ReferencedFileBadgeProps {
  citation: FileCitation;
  onClick: (citation: FileCitation) => void;
}

export const ReferencedFileBadge: React.FC<ReferencedFileBadgeProps> = ({
  citation,
  onClick
}) => {
  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-xs font-mono text-blue-300 hover:text-white transition-all shadow-sm group"
      title={`Inspect ${citation.path}`}
    >
      <FileCode className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
      <span className="font-semibold">{citation.filename}</span>
      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
    </button>
  );
};
