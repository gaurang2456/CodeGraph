'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FileCitation } from '@/types';
import { Button } from '@/components/ui/Button';

export interface FileViewerModalProps {
  citation: FileCitation | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  citation,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const codeSnippet = citation.snippet || `// File: ${citation.path}\n// Lines: ${citation.lineRange || `${citation.startLine}-${citation.endLine}`}`;
  const codeLines = codeSnippet.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      isOpen={!!citation}
      onClose={onClose}
      title={citation.filename}
      description={`${citation.path} • ${citation.lineRange || (citation.startLine ? `Lines ${citation.startLine}-${citation.endLine}` : '')}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Code viewer header */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1b1e] border border-[#48454d]/30 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#cac5ce]">
            <span className="material-symbols-outlined text-[16px] text-[#fbcfe8]">terminal</span>
            <span>Language: <strong className="text-[#fbcfe8]">{citation.language}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? 'Copied' : 'Copy Code'}
          </Button>
        </div>

        {/* Code View Body */}
        <div className="bg-[#111316] rounded-xl p-4 border border-[#48454d]/30 font-mono text-xs overflow-x-auto max-h-96">
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line: string, idx: number) => (
                <tr key={idx} className="hover:bg-[#1a1b1e]/50">
                  <td className="w-10 select-none text-right pr-4 text-[#938f98]/50 font-mono border-r border-[#48454d]/20">
                    {(citation.startLine || 1) + idx}
                  </td>
                  <td className="pl-4 whitespace-pre text-[#e3e2e6]">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  );
};
