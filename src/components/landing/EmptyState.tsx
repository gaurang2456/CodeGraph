'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  onOpenUpload: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpenUpload }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[460px] text-center p-8 bg-[#1a1b1e] rounded-2xl border border-[#48454d]/25 max-w-lg mx-auto shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-[#292a2d] border border-[#fbcfe8]/20 flex items-center justify-center text-[#fbcfe8] mb-4 shadow-md">
        <span className="material-symbols-outlined text-[32px]">source</span>
      </div>

      <h3 className="text-lg font-heading font-semibold text-[#e3e2e6] mb-1">
        No Active Repository Selected
      </h3>
      <p className="text-xs text-[#cac5ce] max-w-xs mb-6 leading-relaxed">
        Upload a ZIP archive or clone from a GitHub repository to visualize architecture and query the codebase with AI.
      </p>

      <Button variant="primary" onClick={onOpenUpload} className="px-5">
        <span className="material-symbols-outlined text-[18px] mr-2">upload_file</span>
        Scan & Index Repository
      </Button>
    </div>
  );
};
