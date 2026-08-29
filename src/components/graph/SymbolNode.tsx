'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { SymbolNodeType, SYMBOL_META } from './graphUtils';

export const SymbolNode = memo(({ data, selected }: NodeProps<SymbolNodeType>) => {
  const nodeData = data;
  const meta = SYMBOL_META[nodeData.type] || SYMBOL_META.variable;

  // Extract basename from filePath
  const fileBasename = nodeData.filePath.split('/').pop() || nodeData.filePath;

  const isHighlighted = selected || nodeData.isSelected;
  const isFocused = nodeData.isFocused;
  const hasMethods = (nodeData.memberMethodCount || 0) > 0;
  const isMethod = nodeData.type === 'method' || nodeData.type === 'constructor';

  const handleUnfoldClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onToggleUnfold) {
      nodeData.onToggleUnfold(nodeData.id);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl transition-all duration-200 cursor-pointer select-none overflow-hidden ${
        isMethod ? 'w-[260px]' : 'w-[310px]'
      } ${
        isFocused
          ? 'bg-gradient-to-b from-[#331c2c] to-[#1a1118] border-2 border-[#fbcfe8] shadow-[0_0_40px_rgba(251,207,232,0.4)] scale-[1.03] z-20'
          : isHighlighted
          ? 'bg-gradient-to-b from-[#222b3b] to-[#141822] border-2 border-[#93c5fd] shadow-[0_0_35px_rgba(147,197,253,0.35)] scale-[1.02] z-10'
          : isMethod
          ? 'bg-gradient-to-b from-[#141d24] to-[#0e1418] border border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_12px_28px_rgba(6,182,212,0.25)]'
          : 'bg-gradient-to-b from-[#1c1e26] to-[#121418] border border-[#48454d]/45 hover:border-[#938f98]/80 hover:from-[#222530] hover:to-[#161820] hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Top Ambient Glow / Highlight Line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2.5px] opacity-90"
        style={{
          background: isFocused
            ? 'linear-gradient(90deg, transparent, #fbcfe8, transparent)'
            : isHighlighted
            ? 'linear-gradient(90deg, transparent, #93c5fd, transparent)'
            : isMethod
            ? 'linear-gradient(90deg, transparent, #06b6d4, transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }}
      />

      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3.5 !h-3.5 !bg-[#1a1b1e] !border-2 !border-[#fbcfe8] !rounded-full !-top-2 hover:!scale-125 !transition-transform shadow-md"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3.5 !h-3.5 !bg-[#1a1b1e] !border-2 !border-[#fbcfe8] !rounded-full !-bottom-2 hover:!scale-125 !transition-transform shadow-md"
      />

      <div className="p-3.5 space-y-2.5">
        {/* Header: Category Badge, Module Group & Status Indicators */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-bold tracking-wide border shadow-sm ${meta.bg} ${meta.text} ${meta.border}`}
            >
              <span className="material-symbols-outlined text-[15px]">{meta.icon}</span>
              <span>{meta.label}</span>
            </div>

            {nodeData.moduleGroup && nodeData.moduleGroup !== 'root' && (
              <span
                className="px-1.5 py-0.5 rounded bg-[#1c1e26] text-[#b5b1ba] border border-[#48454d]/30 text-[10px] font-mono truncate max-w-[85px]"
                title={`Module: ${nodeData.moduleGroup}`}
              >
                {nodeData.moduleGroup}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
            {nodeData.exported && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#2b2d35] text-[#e3e2e6] border border-[#48454d]/40 font-semibold shadow-xs text-[10px]">
                export
              </span>
            )}
            {nodeData.incomingCount !== undefined && nodeData.outgoingCount !== undefined && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#16171b] text-[#938f98] border border-[#48454d]/30 font-medium text-[10px]">
                {nodeData.incomingCount}↓ {nodeData.outgoingCount}↑
              </span>
            )}
          </div>
        </div>

        {/* Center: Symbol Name */}
        <div className="pt-0.5">
          <h3
            className={`font-mono font-bold text-white group-hover:text-[#fbcfe8] transition-colors truncate tracking-tight leading-snug ${
              isMethod ? 'text-[13px] text-cyan-300' : 'text-[14px]'
            }`}
            title={nodeData.name}
          >
            {nodeData.name}
          </h3>
        </div>

        {/* Footer: File Name & Line Span */}
        <div className="flex items-center justify-between pt-2 border-t border-[#48454d]/30 text-xs font-mono text-[#938f98]">
          <span
            className="truncate max-w-[170px] flex items-center gap-1.5 text-[#b5b1ba] group-hover:text-white transition-colors"
            title={nodeData.filePath}
          >
            <span className="material-symbols-outlined text-[14px] text-[#76737c]">description</span>
            <span className="truncate">{fileBasename}</span>
          </span>
          <span className="text-[#cac5ce] shrink-0 font-bold bg-[#141519] px-2 py-0.5 rounded-md border border-[#48454d]/30 text-[11px]">
            L{nodeData.startLine}{nodeData.endLine && nodeData.endLine !== nodeData.startLine ? `-${nodeData.endLine}` : ''}
          </span>
        </div>

        {/* Interactive Unfold / Fold Methods Toggle Bar */}
        {hasMethods && (
          <div className="pt-1">
            <button
              onClick={handleUnfoldClick}
              className={`w-full py-1 px-2.5 rounded-xl border text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                nodeData.isUnfolded
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50'
                  : 'bg-[#222530] border-[#48454d]/50 text-[#e3e2e6] hover:bg-[#2c303d] hover:border-cyan-500/50 hover:text-cyan-300'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {nodeData.isUnfolded ? 'unfold_less' : 'unfold_more'}
              </span>
              <span>
                {nodeData.isUnfolded
                  ? `Fold Methods (${nodeData.memberMethodCount})`
                  : `Unfold ${nodeData.memberMethodCount} Methods`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

SymbolNode.displayName = 'SymbolNode';
