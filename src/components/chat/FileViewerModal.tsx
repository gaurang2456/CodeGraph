'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { FileCitation } from '@/types';
import { MOCK_CODE_SNIPPETS } from '@/services/mockData';
import { FileCode, Copy, Check, Terminal } from 'lucide-react';
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

  const mockSnippet = MOCK_CODE_SNIPPETS[citation.filename] || {
    language: citation.language || 'java',
    code: `// ${citation.path}\n// File chunk retrieved from PgVector index\n\npublic class ${citation.filename.replace('.java', '')} {\n    // Implementation details indexed by CodeGraph RAG Engine\n}`
  };

  const codeLines = mockSnippet.code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(mockSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      isOpen={!!citation}
      onClose={onClose}
      title={citation.filename}
      description={citation.path}
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Code viewer header */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Language: <strong className="text-blue-300">{mockSnippet.language}</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy Code'}
          </Button>
        </div>

        {/* Code View Body */}
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto max-h-96">
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line: string, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/50">
                  <td className="w-10 select-none text-right pr-4 text-slate-600 font-mono border-r border-slate-800/60">
                    {idx + 1}
                  </td>
                  <td className="pl-4 whitespace-pre text-slate-200">
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
