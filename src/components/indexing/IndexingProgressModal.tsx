'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dialog } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';

export interface IndexingProgressModalProps {
  isOpen: boolean;
  repoName: string;
  stage: string;
  progress: number;
  status: 'PENDING' | 'DOWNLOADING' | 'EXTRACTING' | 'SCANNING' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'COMPLETED' | 'FAILED' | string;
  errorMessage?: string;
  onFinish: () => void;
  onClose?: () => void;
}

const STAGES = [
  { key: 'EXTRACTING', label: 'Extracting Repository', detail: 'Decompressing archive and scanning file trees' },
  { key: 'SCANNING', label: 'Scanning Codebase', detail: 'Filtering binaries, detecting languages, storing files' },
  { key: 'PARSING', label: 'AST & Symbol Parsing', detail: 'Parsing class declarations, functions, and endpoints' },
  { key: 'CHUNKING', label: 'Semantic Code Chunking', detail: 'Creating contextual chunk units with exact line ranges' },
  { key: 'EMBEDDING', label: 'Vector Embedding Generation', detail: 'Generating 1536-dim embeddings and storing in Supabase pgvector' },
  { key: 'COMPLETED', label: 'Finalizing Summary', detail: 'Synthesizing evidence-based repository architecture overview' },
];

export const IndexingProgressModal: React.FC<IndexingProgressModalProps> = ({
  isOpen,
  repoName,
  stage,
  progress,
  status,
  errorMessage,
  onFinish,
  onClose,
}) => {
  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  useEffect(() => {
    if (isCompleted && isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isCompleted, isOpen]);

  if (!isOpen) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (isCompleted) onFinish();
        else if (onClose) onClose();
      }}
      maxWidth="xl"
    >
      <div className="space-y-6 py-2">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#48454d]/30 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-[#292a2d] border flex items-center justify-center ${
              isFailed ? 'border-red-500/40 text-red-400' : 'border-[#fbcfe8]/20 text-[#fbcfe8]'
            }`}>
              <span className="material-symbols-outlined text-[22px] animate-pulse">
                {isFailed ? 'error' : isCompleted ? 'check_circle' : 'terminal'}
              </span>
            </div>
            <div>
              <h3 className="text-base font-heading font-semibold text-[#e3e2e6] flex items-center gap-2">
                Indexing Engine
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#fbcfe8]/10 text-[#fbcfe8] border border-[#fbcfe8]/20">
                  {repoName}
                </span>
              </h3>
              <p className="text-xs text-[#938f98] font-mono mt-0.5">
                PostgreSQL + pgvector • AST Parser • RAG Vector Pipeline
              </p>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className={`text-xl font-bold ${isFailed ? 'text-red-400' : 'text-[#fbcfe8]'}`}>
              {progress}%
            </span>
            <p className="text-[10px] text-[#938f98] uppercase">
              {isFailed ? 'FAILED' : isCompleted ? 'COMPLETE' : 'PROGRESS'}
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <Progress value={progress} />

        {/* Error Notification if failed */}
        {isFailed && errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs font-mono">
            <div className="flex items-center gap-2 font-semibold text-red-400 mb-1">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              Indexing Error
            </div>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Real Stage Tracker List */}
        <div className="space-y-2 bg-[#121316] rounded-xl p-4 border border-[#48454d]/30 font-mono text-xs max-h-72 overflow-y-auto">
          {STAGES.map((s, idx) => {
            const isDone = isCompleted || (currentStageIndex > idx);
            const isInProgress = !isCompleted && !isFailed && (currentStageIndex === idx || (currentStageIndex === -1 && idx === 0));

            return (
              <div
                key={s.key}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isDone
                    ? 'bg-[#1a1b1e] border-[#48454d]/30 text-[#cac5ce]'
                    : isInProgress
                    ? 'bg-[#70485c]/20 border-[#fbcfe8]/30 text-[#fbcfe8] shadow-sm'
                    : 'border-transparent text-[#938f98]/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-5 h-5">
                    {isDone ? (
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">
                        check_circle
                      </span>
                    ) : isInProgress ? (
                      <span className="material-symbols-outlined text-[18px] text-[#fbcfe8] animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-[#938f98]">{idx + 1}</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold">{s.label}</span>
                    <p className="text-[11px] opacity-75 font-sans">{s.detail}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono">
                    {isDone ? 'DONE' : isInProgress ? 'IN PROGRESS' : 'QUEUED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#938f98] font-mono">
            {isCompleted
              ? '✨ Codebase successfully parsed and indexed!'
              : isFailed
              ? '❌ Indexing failed. Please check repository or API key configuration.'
              : stage || 'Analyzing repository files...'}
          </p>

          <div className="flex items-center gap-2">
            {!isCompleted && onClose && (
              <Button variant="secondary" onClick={onClose}>
                {isFailed ? 'Close' : 'Cancel'}
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!isCompleted}
              onClick={onFinish}
              className="w-full sm:w-auto"
            >
              Explore Codebase
              <span className="material-symbols-outlined text-[18px] ml-1.5">arrow_forward</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
