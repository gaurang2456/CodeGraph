'use client';

import React from 'react';
import { GraphApiNode, GraphApiEdge, SYMBOL_META, RELATIONSHIP_META } from './graphUtils';

export interface SymbolDetailsPanelProps {
  selectedNode: GraphApiNode | null;
  allNodes: GraphApiNode[];
  allEdges: GraphApiEdge[];
  isFocused: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onToggleFocus: (nodeId: string) => void;
  onExpandNode: (nodeId: string) => void;
  onSelectFile?: (filename: string, startLine?: number, endLine?: number) => void;
  onAskAi?: (prompt: string) => void;
  repoName: string;
}

export const SymbolDetailsPanel: React.FC<SymbolDetailsPanelProps> = ({
  selectedNode,
  allNodes,
  allEdges,
  isFocused,
  onClose,
  onSelectNode,
  onToggleFocus,
  onExpandNode,
  onSelectFile,
  onAskAi,
  repoName,
}) => {
  const nodeMap = React.useMemo(() => {
    return new Map<string, GraphApiNode>(allNodes.map((n) => [n.id, n]));
  }, [allNodes]);

  const incomingEdges = React.useMemo(() => {
    if (!selectedNode) return [];
    return allEdges.filter((e) => e.target === selectedNode.id);
  }, [allEdges, selectedNode]);

  const outgoingEdges = React.useMemo(() => {
    if (!selectedNode) return [];
    return allEdges.filter((e) => e.source === selectedNode.id);
  }, [allEdges, selectedNode]);

  if (!selectedNode) return null;

  const meta = SYMBOL_META[selectedNode.type] || SYMBOL_META.variable;
  const fileBasename = selectedNode.filePath.split('/').pop() || selectedNode.filePath;

  return (
    <div className="absolute right-6 top-6 bottom-6 w-[360px] max-w-[calc(100vw-3rem)] bg-[#14161d]/95 backdrop-blur-xl border border-[#48454d]/40 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col z-30 overflow-hidden text-[#e3e2e6] select-none animate-in fade-in slide-in-from-right-6 duration-200">
      {/* Header */}
      <div className="p-5 border-b border-[#48454d]/25 flex items-start justify-between gap-3 bg-[#0d0e12]/60">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold tracking-wide border shadow-sm ${meta.bg} ${meta.text} ${meta.border}`}
            >
              <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
              {meta.label}
            </span>
            {selectedNode.exported && (
              <span className="px-2 py-0.5 rounded bg-[#2a2b30] text-[#e3e2e6] border border-[#48454d]/30 text-[10px] font-mono font-medium">
                export
              </span>
            )}
          </div>
          <h2 className="text-base font-mono font-bold text-white truncate" title={selectedNode.name}>
            {selectedNode.name}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-[#938f98] hover:text-white hover:bg-[#252830] transition-colors cursor-pointer"
          title="Close details"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* File & Location Metadata */}
        <div className="p-3 rounded-xl bg-[#121316] border border-[#48454d]/20 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#938f98]">File:</span>
            <span className="text-[#e3e2e6] truncate max-w-[170px]" title={selectedNode.filePath}>
              {fileBasename}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#938f98]">Location:</span>
            <span className="text-[#b7c8e1]">
              Lines {selectedNode.startLine} - {selectedNode.endLine}
            </span>
          </div>
          <div className="pt-1 text-[10px] font-mono text-[#76737c] truncate" title={selectedNode.filePath}>
            {selectedNode.filePath}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {onSelectFile && (
            <button
              onClick={() => onSelectFile(selectedNode.filePath, selectedNode.startLine, selectedNode.endLine)}
              className="w-full px-3 py-2 bg-[#70485c] hover:bg-[#865970] text-[#fdf2f8] rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[16px]">code</span>
              Open Source File (L{selectedNode.startLine})
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onToggleFocus(selectedNode.id)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                isFocused
                  ? 'bg-[#fbcfe8]/20 border-[#fbcfe8] text-[#fbcfe8]'
                  : 'bg-[#1f1f23] hover:bg-[#292a2d] border-[#48454d]/30 text-[#e3e2e6]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isFocused ? 'filter_center_focus' : 'center_focus_strong'}
              </span>
              {isFocused ? 'Exit Focus' : 'Focus Graph'}
            </button>

            <button
              onClick={() => onExpandNode(selectedNode.id)}
              className="px-3 py-2 bg-[#1f1f23] hover:bg-[#292a2d] border border-[#48454d]/30 text-[#e3e2e6] rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Expand
            </button>
          </div>
        </div>

        {/* Incoming Relationships */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-[#938f98]">
            <span>Incoming Dependencies</span>
            <span className="text-[#fbcfe8]">{incomingEdges.length}</span>
          </div>

          {incomingEdges.length === 0 ? (
            <p className="text-[11px] text-[#76737c] italic">No incoming relationships recorded.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {incomingEdges.map((edge) => {
                const sourceNode = nodeMap.get(edge.source);
                const relMeta = RELATIONSHIP_META[edge.type] || { label: edge.type, color: '#938f98' };
                return (
                  <button
                    key={edge.id}
                    onClick={() => sourceNode && onSelectNode(sourceNode.id)}
                    className="w-full p-2 rounded-lg bg-[#121316] hover:bg-[#222428] border border-[#48454d]/20 text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-medium text-[#e3e2e6] block truncate">
                        {sourceNode?.name || edge.source.split(':').pop()}
                      </span>
                      <span className="text-[10px] font-mono text-[#76737c] block truncate">
                        {sourceNode?.filePath.split('/').pop()}
                      </span>
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0"
                      style={{ backgroundColor: `${relMeta.color}15`, color: relMeta.color }}
                    >
                      {edge.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Outgoing Relationships */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-[#938f98]">
            <span>Outgoing Dependencies</span>
            <span className="text-[#38bdf8]">{outgoingEdges.length}</span>
          </div>

          {outgoingEdges.length === 0 ? (
            <p className="text-[11px] text-[#76737c] italic">No outgoing dependencies recorded.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {outgoingEdges.map((edge) => {
                const targetNode = nodeMap.get(edge.target);
                const relMeta = RELATIONSHIP_META[edge.type] || { label: edge.type, color: '#938f98' };
                return (
                  <button
                    key={edge.id}
                    onClick={() => targetNode && onSelectNode(targetNode.id)}
                    className="w-full p-2 rounded-lg bg-[#121316] hover:bg-[#222428] border border-[#48454d]/20 text-left transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono font-medium text-[#e3e2e6] block truncate">
                        {targetNode?.name || edge.target.split(':').pop()}
                      </span>
                      <span className="text-[10px] font-mono text-[#76737c] block truncate">
                        {targetNode?.filePath.split('/').pop()}
                      </span>
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0"
                      style={{ backgroundColor: `${relMeta.color}15`, color: relMeta.color }}
                    >
                      {edge.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Insight Action */}
        {onAskAi && (
          <div className="pt-2 border-t border-[#48454d]/20">
            <button
              onClick={() =>
                onAskAi(
                  `Explain the responsibility of the ${selectedNode.type} "${selectedNode.name}" in ${selectedNode.filePath} and how it connects with related components in ${repoName}.`
                )
              }
              className="w-full px-3 py-2 bg-[#1f1f23] hover:bg-[#292a2d] border border-[#48454d]/30 text-[#fbcfe8] rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">smart_toy</span>
              Ask AI About {selectedNode.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
