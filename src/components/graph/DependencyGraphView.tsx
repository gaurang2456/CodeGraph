'use client';

import React, { useState } from 'react';
import { Repository, GraphNode } from '@/types';
import { LOAN_MANAGEMENT_NODES, LOAN_MANAGEMENT_EDGES } from '@/services/mockData';

export interface DependencyGraphViewProps {
  repo: Repository;
  onSelectFile?: (filename: string) => void;
  onAskAi?: (prompt: string) => void;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  repo,
  onSelectFile,
  onAskAi
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nodes = repo.graphNodes && repo.graphNodes.length > 0 ? repo.graphNodes : LOAN_MANAGEMENT_NODES;
  const edges = repo.graphEdges && repo.graphEdges.length > 0 ? repo.graphEdges : LOAN_MANAGEMENT_EDGES;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  const filteredNodes = activeCategoryFilter
    ? nodes.filter((n) => n.category === activeCategoryFilter)
    : nodes;

  return (
    <div
      className={`relative w-full rounded-xl border border-[#48454d]/25 bg-[#111316] overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-xl shadow-2xl' : 'h-[calc(100vh-8.5rem)] min-h-[540px]'
      }`}
    >
      {/* Top Bar / Controls */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Zoom & Screen Controls */}
        <div className="flex items-center bg-[#1f1f23]/90 backdrop-blur-md rounded-full shadow-md border border-[#48454d]/30 p-1 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">zoom_out</span>
          </button>
          <div className="w-px h-3.5 bg-[#48454d]/40 mx-0.5"></div>
          <button
            onClick={handleResetZoom}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6] transition-colors cursor-pointer"
            title="Reset View"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6] transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
          <span className="text-[10px] font-mono text-[#938f98] px-1.5">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>

        {/* Legend / Category Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#1f1f23]/90 backdrop-blur-md rounded-full shadow-md border border-[#48454d]/30 px-2.5 py-1 pointer-events-auto">
          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'controller' ? null : 'controller')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              activeCategoryFilter === 'controller'
                ? 'bg-[#70485c] text-white font-medium'
                : 'text-[#e3e2e6] hover:bg-[#292a2d]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#fbcfe8]"></div>
            <span>Controllers</span>
          </button>

          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'service' ? null : 'service')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              activeCategoryFilter === 'service'
                ? 'bg-[#3a4a5f] text-white font-medium'
                : 'text-[#e3e2e6] hover:bg-[#292a2d]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#b7c8e1]"></div>
            <span>Services</span>
          </button>

          <button
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'repository' ? null : 'repository')}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
              activeCategoryFilter === 'repository'
                ? 'bg-[#9f8d81] text-white font-medium'
                : 'text-[#e3e2e6] hover:bg-[#292a2d]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#d7c3b6]"></div>
            <span>Repositories</span>
          </button>
        </div>
      </div>

      {/* Graph Visual Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-auto bg-dot-pattern p-6">
        <div
          className="relative transition-transform duration-200 origin-top-left"
          style={{
            transform: `scale(${zoomLevel})`,
            minWidth: '1050px',
            minHeight: '600px'
          }}
        >
          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="graph-arrow"
                markerHeight="6"
                markerWidth="6"
                orient="auto-start-reverse"
                refX="9"
                refY="5"
                viewBox="0 0 10 10"
              >
                <path className="fill-[#48454d]" d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>

            {/* Controller -> Service Connections */}
            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 280 205 C 320 205, 340 235, 360 235"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="320" y="210">
                calls
              </text>
            </g>

            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 280 415 C 320 415, 330 395, 360 395"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="320" y="400">
                calls
              </text>
            </g>

            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 280 415 C 320 415, 330 535, 360 535"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="320" y="480">
                uses
              </text>
            </g>

            {/* Service -> Repository Connections */}
            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 560 235 C 600 235, 610 235, 640 235"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="600" y="225">
                accesses
              </text>
            </g>

            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 560 395 C 600 395, 610 415, 640 415"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="600" y="400">
                accesses
              </text>
            </g>

            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 560 535 C 600 535, 610 415, 640 415"
                markerEnd="url(#graph-arrow)"
              />
              <text className="fill-[#938f98] font-mono text-[9px]" textAnchor="middle" x="600" y="485">
                queries
              </text>
            </g>

            {/* Repo -> DB Connections */}
            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 840 235 C 870 235, 880 325, 900 325"
                markerEnd="url(#graph-arrow)"
              />
            </g>
            <g className="transition-opacity hover:opacity-100 opacity-60">
              <path
                className="stroke-[#48454d] stroke-2 fill-none"
                d="M 840 415 C 870 415, 880 325, 900 325"
                markerEnd="url(#graph-arrow)"
              />
            </g>
          </svg>

          {/* Render Interactive Nodes */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const categoryColors = {
              controller: 'border-[#fbcfe8]/40 hover:border-[#fbcfe8] text-[#fbcfe8]',
              service: 'border-[#b7c8e1]/40 hover:border-[#b7c8e1] text-[#b7c8e1]',
              repository: 'border-[#d7c3b6]/40 hover:border-[#d7c3b6] text-[#d7c3b6]',
              database: 'border-[#48454d]/50 hover:border-[#fbcfe8] text-[#fbcfe8]'
            };

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(isSelected ? null : node)}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className={`absolute w-[190px] bg-[#1f1f23] rounded-xl shadow-md border p-3 flex flex-col gap-1.5 cursor-pointer transition-all duration-200 z-10 group hover:-translate-y-0.5 ${
                  categoryColors[node.category]
                } ${isSelected ? 'ring-2 ring-[#fbcfe8]' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">{node.icon}</span>
                  <span className="font-heading font-medium text-xs text-[#e3e2e6] truncate">
                    {node.label}
                  </span>
                </div>
                <p className="text-[10px] text-[#938f98] leading-tight line-clamp-2">{node.details}</p>
                {node.methods && node.methods.length > 0 && (
                  <div className="pt-1 border-t border-[#48454d]/20 text-[9px] font-mono text-[#cac5ce] flex items-center justify-between">
                    <span>{node.methods.length} methods</span>
                    <span className="material-symbols-outlined text-[12px] text-[#938f98]">
                      info
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 bg-[#1a1b1e] border border-[#fbcfe8]/30 rounded-xl p-4 shadow-xl z-30 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#292a2d] flex items-center justify-center text-[#fbcfe8]">
                <span className="material-symbols-outlined text-[18px]">{selectedNode.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-heading font-semibold text-[#e3e2e6]">
                    {selectedNode.label}
                  </h3>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#292a2d] text-[#b7c8e1]">
                    {selectedNode.category}
                  </span>
                </div>
                <p className="text-[11px] text-[#cac5ce] mt-0.5">{selectedNode.details}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedNode.file && onSelectFile && (
                <button
                  onClick={() => onSelectFile(selectedNode.file!.split('/').pop() || selectedNode.file!)}
                  className="px-2.5 py-1 bg-[#1f1f23] hover:bg-[#292a2d] border border-[#48454d]/30 rounded text-[11px] font-mono text-[#fbcfe8] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">code</span>
                  View Source
                </button>
              )}
              {onAskAi && (
                <button
                  onClick={() => onAskAi(`Explain ${selectedNode.label} and how it connects to other services`)}
                  className="px-2.5 py-1 bg-[#fbcfe8] hover:bg-[#f9a8d4] text-[#3d1729] rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                  Ask AI
                </button>
              )}
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-[#938f98] hover:text-white rounded transition-colors ml-1"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
