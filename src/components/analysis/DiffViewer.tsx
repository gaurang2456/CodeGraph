'use client';

import React, { useState, useMemo } from 'react';
import { GeneratedChangeset, GeneratedFileChange } from '@/types';
import { computeLineDiff, calculateDiffStats, DiffLine } from '@/server/planner/diffUtils';

export interface DiffViewerProps {
  changeset: GeneratedChangeset;
  allChangesets?: GeneratedChangeset[];
  onSelectChangeset?: (changesetId: string) => void;
  onApprove?: (changesetId: string) => Promise<void>;
  onReject?: (changesetId: string) => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isGenerating?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  changeset,
  allChangesets = [],
  onSelectChangeset,
  onApprove,
  onReject,
  onRegenerate,
  isGenerating = false,
}) => {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [diffViewMode, setDiffViewMode] = useState<'unified' | 'split'>('unified');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const currentFile: GeneratedFileChange | undefined = changeset.changes[selectedFileIdx] || changeset.changes[0];

  // Calculate line diffs for selected file
  const diffLines: DiffLine[] = useMemo(() => {
    if (!currentFile) return [];
    const orig = currentFile.originalContent || '';
    const prop = currentFile.proposedContent || '';
    return computeLineDiff(orig, prop);
  }, [currentFile]);

  // Calculate file stats
  const fileStatsMap = useMemo(() => {
    const map = new Map<string, { additions: number; deletions: number }>();
    for (const fc of changeset.changes) {
      map.set(fc.filePath, calculateDiffStats(fc.originalContent || '', fc.proposedContent || ''));
    }
    return map;
  }, [changeset.changes]);

  // Total changeset stats
  const totalStats = useMemo(() => {
    let adds = 0;
    let dels = 0;
    fileStatsMap.forEach((val) => {
      adds += val.additions;
      dels += val.deletions;
    });
    return { additions: adds, deletions: dels };
  }, [fileStatsMap]);

  const handleCopyCode = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.proposedContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      if (status === 'approved' && onApprove) {
        await onApprove(changeset.id);
      } else if (status === 'rejected' && onReject) {
        await onReject(changeset.id);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const statusBadge = () => {
    switch (changeset.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
            <span className="material-symbols-outlined text-[15px]">cancel</span>
            <span>Rejected</span>
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold animate-pulse">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Generating...</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <span className="material-symbols-outlined text-[15px]">rate_review</span>
            <span>Ready for Review</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#48454d]/25">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#70485c]/30 border border-[#fbcfe8]/40 flex items-center justify-center text-[#fbcfe8]">
              <span className="material-symbols-outlined text-[18px]">difference</span>
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <span>Proposed Code Changes</span>
                <span className="text-xs font-mono text-[#938f98] font-normal">
                  (v{changeset.version})
                </span>
              </h2>
            </div>
            {statusBadge()}
          </div>
          <p className="text-xs text-[#cac5ce] font-sans pl-11">{changeset.summary}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Version Switcher */}
          {allChangesets.length > 1 && onSelectChangeset && (
            <select
              value={changeset.id}
              onChange={(e) => onSelectChangeset(e.target.value)}
              className="bg-[#1c1e26] border border-[#48454d]/40 text-xs font-mono text-[#cac5ce] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#fbcfe8]/60 cursor-pointer"
            >
              {allChangesets.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  v{cs.version} ({cs.status}) - {new Date(cs.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>
          )}

          {/* Regenerate Button */}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isGenerating || isUpdatingStatus}
              className="py-1.5 px-3 rounded-xl bg-[#1c1e26] hover:bg-[#292a2d] border border-[#48454d]/40 text-xs font-mono text-[#cac5ce] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Generate a new changeset version without overwriting existing versions"
            >
              <span className="material-symbols-outlined text-[15px]">sync</span>
              <span>Regenerate</span>
            </button>
          )}

          {/* Review Actions */}
          {changeset.status !== 'approved' && onApprove && (
            <button
              onClick={() => handleStatusUpdate('approved')}
              disabled={isUpdatingStatus || isGenerating}
              className="py-1.5 px-3.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 text-white text-xs font-mono font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Approve Changes</span>
            </button>
          )}

          {changeset.status !== 'rejected' && onReject && (
            <button
              onClick={() => handleStatusUpdate('rejected')}
              disabled={isUpdatingStatus || isGenerating}
              className="py-1.5 px-3 rounded-xl bg-[#1c1e26] hover:bg-rose-500/20 border border-[#48454d]/40 hover:border-rose-500/40 text-[#cac5ce] hover:text-rose-200 text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
              <span>Reject</span>
            </button>
          )}
        </div>
      </div>

      {/* Approved Notice Banner */}
      {changeset.status === 'approved' && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-400">verified</span>
            <div>
              <strong>Changes Approved</strong> — Ready for GitHub Pull Request creation.
            </div>
          </div>
          <span className="text-[10px] text-emerald-300/80">Snapshot preserved as v{changeset.version}</span>
        </div>
      )}

      {/* Changeset Overview Stats */}
      <div className="flex items-center justify-between text-xs font-mono text-[#938f98] px-1">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-white">{changeset.changes.length}</strong> files changed
          </span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">+{totalStats.additions}</span>
          <span className="text-rose-400 font-bold">-{totalStats.deletions}</span>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-xl bg-[#1c1e26] p-0.5 border border-[#48454d]/30">
          <button
            onClick={() => setDiffViewMode('unified')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              diffViewMode === 'unified'
                ? 'bg-[#292a2d] text-white shadow-sm font-bold'
                : 'text-[#938f98] hover:text-white'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setDiffViewMode('split')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              diffViewMode === 'split'
                ? 'bg-[#292a2d] text-white shadow-sm font-bold'
                : 'text-[#938f98] hover:text-white'
            }`}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {/* File Switcher Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {changeset.changes.map((fc, idx) => {
          const stats = fileStatsMap.get(fc.filePath) || { additions: 0, deletions: 0 };
          const isSelected = idx === selectedFileIdx;

          let badgeColor = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
          let badgeText = 'MODIFY';
          if (fc.changeType === 'create') {
            badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            badgeText = 'NEW';
          } else if (fc.changeType === 'delete') {
            badgeColor = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
            badgeText = 'DELETE';
          }

          return (
            <button
              key={fc.id || idx}
              onClick={() => setSelectedFileIdx(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                isSelected
                  ? 'bg-[#292a2d] border-[#fbcfe8]/50 text-white shadow-md'
                  : 'bg-[#1c1e26] border-[#48454d]/25 text-[#cac5ce] hover:border-[#48454d]/60 hover:text-white'
              }`}
            >
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                {badgeText}
              </span>
              <span className="truncate max-w-[200px]">{fc.filePath.split('/').pop()}</span>
              <div className="flex items-center gap-1 text-[10px]">
                {stats.additions > 0 && <span className="text-emerald-400">+{stats.additions}</span>}
                {stats.deletions > 0 && <span className="text-rose-400">-{stats.deletions}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected File Details Bar */}
      {currentFile && (
        <div className="p-4 rounded-2xl bg-[#1c1e26] border border-[#48454d]/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-[16px] text-[#b7c8e1]">
                description
              </span>
              <span className="text-xs font-mono font-bold text-white truncate">
                {currentFile.filePath}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="py-1 px-2.5 rounded-lg bg-[#292a2d] hover:bg-[#343538] text-[11px] font-mono text-[#cac5ce] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copiedCode ? 'check' : 'content_copy'}
              </span>
              <span>{copiedCode ? 'Copied' : 'Copy Proposed'}</span>
            </button>
          </div>

          <p className="text-xs text-[#cac5ce] font-sans leading-relaxed">{currentFile.reason}</p>

          {currentFile.affectedSymbols && currentFile.affectedSymbols.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-[#938f98] uppercase">Affected Symbols:</span>
              {currentFile.affectedSymbols.map((sym, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2 py-0.5 rounded-md bg-[#241c2c] text-[10px] font-mono text-[#fbcfe8] border border-[#fbcfe8]/20"
                >
                  ⚡ {sym}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code Diff Display Viewport */}
      {currentFile && (
        <div className="rounded-2xl bg-[#0e1015] border border-[#48454d]/35 overflow-hidden shadow-inner font-mono text-xs">
          {/* Unified Diff View */}
          {diffViewMode === 'unified' && (
            <div className="overflow-x-auto max-h-[500px] divide-y divide-[#48454d]/15 custom-scrollbar">
              {diffLines.map((line, lIdx) => {
                let rowBg = 'bg-transparent text-[#e3e2e6]';
                let indicator = ' ';
                if (line.type === 'added') {
                  rowBg = 'bg-emerald-500/15 text-emerald-200';
                  indicator = '+';
                } else if (line.type === 'removed') {
                  rowBg = 'bg-rose-500/15 text-rose-200 line-through decoration-rose-400/60';
                  indicator = '-';
                }

                return (
                  <div
                    key={lIdx}
                    className={`flex items-stretch hover:brightness-110 transition-colors ${rowBg}`}
                  >
                    {/* Line Numbers */}
                    <div className="w-12 py-1 px-2 text-right text-[10px] text-[#6a6770] bg-[#121316] select-none shrink-0 border-r border-[#48454d]/20">
                      {line.oldLineNumber || ''}
                    </div>
                    <div className="w-12 py-1 px-2 text-right text-[10px] text-[#6a6770] bg-[#121316] select-none shrink-0 border-r border-[#48454d]/20">
                      {line.newLineNumber || ''}
                    </div>
                    {/* Indicator */}
                    <div className="w-6 py-1 text-center font-bold select-none shrink-0 opacity-70">
                      {indicator}
                    </div>
                    {/* Code Content */}
                    <div className="py-1 px-2 whitespace-pre flex-1 overflow-x-visible">
                      {line.content || ' '}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Side-by-Side Diff View */}
          {diffViewMode === 'split' && (
            <div className="grid grid-cols-2 divide-x divide-[#48454d]/30 max-h-[500px] overflow-y-auto custom-scrollbar">
              {/* Left: Original Content (from repository_files) */}
              <div className="overflow-x-auto">
                <div className="p-2 bg-[#161820] text-[10px] font-bold text-[#938f98] uppercase tracking-wider border-b border-[#48454d]/20 flex items-center justify-between">
                  <span>Original (Repository DB)</span>
                  <span>{currentFile.changeType === 'create' ? 'None (New File)' : ''}</span>
                </div>
                <div className="divide-y divide-[#48454d]/10">
                  {diffLines
                    .filter((l) => l.type !== 'added')
                    .map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex items-stretch ${
                          line.type === 'removed' ? 'bg-rose-500/15 text-rose-200' : 'text-[#cac5ce]'
                        }`}
                      >
                        <div className="w-10 py-1 px-1.5 text-right text-[10px] text-[#6a6770] bg-[#121316] select-none shrink-0 border-r border-[#48454d]/20">
                          {line.oldLineNumber || ''}
                        </div>
                        <div className="py-1 px-2 whitespace-pre overflow-x-visible flex-1">
                          {line.content || ' '}
                        </div>
                      </div>
                    ))}
                  {currentFile.changeType === 'create' && (
                    <div className="p-8 text-center text-xs text-[#6a6770]">
                      No previous content exists for this new file.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Proposed Content (Generated by AI) */}
              <div className="overflow-x-auto">
                <div className="p-2 bg-[#161820] text-[10px] font-bold text-emerald-400 uppercase tracking-wider border-b border-[#48454d]/20 flex items-center justify-between">
                  <span>Proposed Code</span>
                  <span>AI Generated</span>
                </div>
                <div className="divide-y divide-[#48454d]/10">
                  {diffLines
                    .filter((l) => l.type !== 'removed')
                    .map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex items-stretch ${
                          line.type === 'added' ? 'bg-emerald-500/15 text-emerald-200' : 'text-[#cac5ce]'
                        }`}
                      >
                        <div className="w-10 py-1 px-1.5 text-right text-[10px] text-[#6a6770] bg-[#121316] select-none shrink-0 border-r border-[#48454d]/20">
                          {line.newLineNumber || ''}
                        </div>
                        <div className="py-1 px-2 whitespace-pre overflow-x-visible flex-1">
                          {line.content || ' '}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
