'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';

export interface PurposeNodeData extends Record<string, unknown> {
  id: string;
  purposeId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  folderPath: string;
  classesCount: number;
  interfacesCount: number;
  functionsCount: number;
  enumsCount: number;
  totalSymbols: number;
  isExpanded: boolean;
  onToggleExpand?: (purposeId: string) => void;
}

export type PurposeNodeType = Node<PurposeNodeData, 'purposeNode'>;

export const PurposeNode = memo(({ data, selected }: NodeProps<PurposeNodeType>) => {
  const nodeData = data;
  const isExpanded = nodeData.isExpanded;

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onToggleExpand) {
      nodeData.onToggleExpand(nodeData.purposeId);
    }
  };

  return (
    <div
      onClick={handleExpandClick}
      className={`group relative w-[340px] rounded-3xl transition-all duration-300 cursor-pointer select-none overflow-hidden ${
        isExpanded
          ? 'bg-gradient-to-b from-[#241c2c] to-[#14101a] border-2 border-[#fbcfe8] shadow-[0_0_45px_rgba(251,207,232,0.35)] scale-[1.02] z-20'
          : selected
          ? 'bg-gradient-to-b from-[#1e2433] to-[#111622] border-2 border-[#93c5fd] shadow-[0_0_35px_rgba(147,197,253,0.3)] z-10'
          : 'bg-gradient-to-b from-[#181a22] to-[#0f1116] border-2 border-[#48454d]/40 hover:border-[#fbcfe8]/70 hover:shadow-[0_16px_40px_rgba(0,0,0,0.7)]'
      }`}
    >
      {/* Top Ambient Glow Line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-90 transition-all"
        style={{
          background: isExpanded
            ? 'linear-gradient(90deg, transparent, #fbcfe8, transparent)'
            : `linear-gradient(90deg, transparent, ${nodeData.color || '#93c5fd'}, transparent)`,
        }}
      />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-[#1a1b1e] !border-2 !border-[#fbcfe8] !rounded-full !-top-2 hover:!scale-125 !transition-transform shadow-md"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-[#1a1b1e] !border-2 !border-[#fbcfe8] !rounded-full !-bottom-2 hover:!scale-125 !transition-transform shadow-md"
      />

      <div className="p-4 space-y-3.5">
        {/* Header: Icon, Purpose Title & Badge */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{
                backgroundColor: `${nodeData.color || '#3b82f6'}20`,
                border: `1px solid ${nodeData.color || '#3b82f6'}50`,
                color: nodeData.color || '#93c5fd',
              }}
            >
              <span className="material-symbols-outlined text-[22px]">
                {nodeData.icon || 'folder'}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#938f98] block">
                Purpose / Module
              </span>
              <h2 className="text-[15px] font-mono font-bold text-white group-hover:text-[#fbcfe8] transition-colors truncate">
                {nodeData.name}
              </h2>
            </div>
          </div>

          <span
            className="px-2 py-1 rounded-xl text-[11px] font-mono font-bold shrink-0 border"
            style={{
              backgroundColor: `${nodeData.color || '#3b82f6'}15`,
              borderColor: `${nodeData.color || '#3b82f6'}40`,
              color: nodeData.color || '#93c5fd',
            }}
          >
            {nodeData.totalSymbols} items
          </span>
        </div>

        {/* Folder Path & Description */}
        <div className="space-y-1">
          <p className="text-[11px] text-[#cac5ce] leading-relaxed line-clamp-2">
            {nodeData.description}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#938f98]">
            <span className="material-symbols-outlined text-[13px] text-[#76737c]">folder_open</span>
            <span className="truncate">{nodeData.folderPath}</span>
          </div>
        </div>

        {/* Symbol Breakdown Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {nodeData.classesCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {nodeData.classesCount} Classes
            </span>
          )}
          {nodeData.interfacesCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {nodeData.interfacesCount} Interfaces
            </span>
          )}
          {nodeData.functionsCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {nodeData.functionsCount} Functions
            </span>
          )}
          {nodeData.enumsCount > 0 && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {nodeData.enumsCount} Enums
            </span>
          )}
        </div>

        {/* Interactive Expand / Unfold Action Button */}
        <div className="pt-2 border-t border-[#48454d]/30 space-y-1.5">
          <button
            onClick={handleExpandClick}
            className={`w-full py-1.5 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              isExpanded
                ? 'bg-[#70485c]/40 border-[#fbcfe8]/60 text-[#fbcfe8] hover:bg-[#70485c]/60'
                : 'bg-[#1e212a] border-[#48454d]/60 text-white hover:bg-[#282c38] hover:border-[#fbcfe8]/60 hover:text-[#fbcfe8]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isExpanded ? 'unfold_less' : 'unfold_more'}
            </span>
            <span>
              {isExpanded
                ? 'Collapse Module'
                : nodeData.totalSymbols > 8
                ? 'Explore Key Classes (Top 8)'
                : `Explore Module (${nodeData.totalSymbols} symbols)`}
            </span>
          </button>

          {isExpanded && nodeData.totalSymbols > 8 && (
            <p className="text-[10px] font-mono text-[#938f98] text-center leading-tight">
              Showing top 8 key classes. Search to explore all {nodeData.totalSymbols} symbols.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

PurposeNode.displayName = 'PurposeNode';
