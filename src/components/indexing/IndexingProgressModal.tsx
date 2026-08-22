'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dialog } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { IndexingStepStatus } from '@/types';

export interface IndexingProgressModalProps {
  isOpen: boolean;
  steps: IndexingStepStatus[];
  repoName: string;
  onFinish: () => void;
}

export const IndexingProgressModal: React.FC<IndexingProgressModalProps> = ({
  isOpen,
  steps,
  repoName,
  onFinish
}) => {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalSteps = steps.length;
  const overallPercentage = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  useEffect(() => {
    if (isAllDone && isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isAllDone, isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (isAllDone) onFinish();
      }}
      maxWidth="xl"
    >
      <div className="space-y-6 py-2">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#48454d]/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#292a2d] border border-[#fbcfe8]/20 flex items-center justify-center text-[#fbcfe8]">
              <span className="material-symbols-outlined text-[22px] animate-pulse">terminal</span>
            </div>
            <div>
              <h3 className="text-base font-heading font-semibold text-[#e3e2e6] flex items-center gap-2">
                Indexing Engine
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#fbcfe8]/10 text-[#fbcfe8] border border-[#fbcfe8]/20">
                  {repoName}
                </span>
              </h3>
              <p className="text-xs text-[#938f98] font-mono mt-0.5">
                AST Parser • Vector Embedding Pipeline • Code Graph
              </p>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xl font-bold text-[#fbcfe8]">{overallPercentage}%</span>
            <p className="text-[10px] text-[#938f98] uppercase">Overall Progress</p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <Progress value={overallPercentage} />

        {/* Step-by-Step State Tracker List */}
        <div className="space-y-2 bg-[#121316] rounded-xl p-4 border border-[#48454d]/30 font-mono text-xs max-h-72 overflow-y-auto">
          {steps.map((step, idx) => {
            const isDone = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';

            return (
              <div
                key={step.id}
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
                    <span className="font-semibold">{step.label}</span>
                    <p className="text-[11px] opacity-75 font-sans">{step.detail}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono">
                    {isDone ? 'DONE' : isInProgress ? `${step.progress}%` : 'QUEUED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#938f98] font-mono">
            {isAllDone
              ? '✨ Codebase successfully parsed and indexed!'
              : 'Please keep this window open while we index AST nodes...'}
          </p>

          <Button
            variant="primary"
            disabled={!isAllDone}
            onClick={onFinish}
            className="w-full sm:w-auto"
          >
            Explore Codebase
            <span className="material-symbols-outlined text-[18px] ml-1.5">arrow_forward</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
