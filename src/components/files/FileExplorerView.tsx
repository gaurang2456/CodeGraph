'use client';

import React, { useState, useEffect } from 'react';
import { Repository, FileTreeNode } from '@/types';

export interface FileExplorerViewProps {
  repo: Repository;
  selectedFile?: string;
  targetLineRange?: { startLine?: number; endLine?: number };
  activeLayerFilter?: { label: string; count: number; files: string[] } | null;
  onClearFilter?: () => void;
  onFileSelect?: (filename: string, startLine?: number, endLine?: number) => void;
  onAskAi?: (prompt: string) => void;
}

export const FileExplorerView: React.FC<FileExplorerViewProps> = ({
  repo,
  selectedFile: externalSelectedFile,
  targetLineRange,
  activeLayerFilter,
  onClearFilter,
  onFileSelect,
  onAskAi
}) => {
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [snippets, setSnippets] = useState<Record<string, { code: string; language: string; lineCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'root': true,
  });

  // Fetch real files from API
  useEffect(() => {
    let isMounted = true;
    async function loadFiles() {
      setLoading(true);
      try {
        const res = await fetch(`/api/repositories/${repo.id}/files`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.fileTree) {
            setFileTree(data.fileTree);
            setSnippets(data.snippets || {});

            // Auto-expand all folders if a layer filter is active
            if (activeLayerFilter && activeLayerFilter.files.length > 0) {
              const newExpanded: Record<string, boolean> = { root: true };
              const expandNodes = (node: FileTreeNode) => {
                if (node.type === 'folder') {
                  newExpanded[node.id] = true;
                  if (node.children) node.children.forEach(expandNodes);
                }
              };
              expandNodes(data.fileTree);
              setExpandedFolders(newExpanded);
            }

            // Set initial tab based on external selection or first file
            const snippetKeys = Object.keys(data.snippets || {});
            const firstFile = snippetKeys.find((k) => !k.includes('/')) || snippetKeys[0];

            if (externalSelectedFile && data.snippets?.[externalSelectedFile]) {
              setOpenTabs([externalSelectedFile]);
              setActiveTab(externalSelectedFile);
            } else if (firstFile) {
              setOpenTabs([firstFile]);
              setActiveTab(firstFile);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load repository files:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [repo.id, activeLayerFilter]);

  // Sync external file selection
  useEffect(() => {
    if (externalSelectedFile) {
      const cleanName = externalSelectedFile.split('/').pop() || externalSelectedFile;
      if (!openTabs.includes(cleanName) && !openTabs.includes(externalSelectedFile)) {
        setOpenTabs((prev) => [...prev, cleanName]);
      }
      setActiveTab(cleanName);
    }
  }, [externalSelectedFile]);

  const handleSelectFile = (node: FileTreeNode) => {
    const filename = node.name;
    if (!openTabs.includes(filename)) {
      setOpenTabs((prev) => [...prev, filename]);
    }
    setActiveTab(filename);
    if (onFileSelect) {
      onFileSelect(node.path || filename);
    }
  };

  const handleCloseTab = (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t !== filename);
    setOpenTabs(newTabs);
    if (activeTab === filename && newTabs.length > 0) {
      setActiveTab(newTabs[0]);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const activeSnippet = snippets[activeTab] ||
    snippets[externalSelectedFile || ''] || {
      language: 'text',
      code: `// File: ${activeTab}\n// Select a file from the explorer on the left to view its contents.`,
      lineCount: 2,
    };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to check if file or node belongs to active layer filter
  const isFileInActiveFilter = (filePathOrName: string) => {
    if (!activeLayerFilter || !activeLayerFilter.files || activeLayerFilter.files.length === 0) return true;
    return activeLayerFilter.files.some((f) => f === filePathOrName || f.endsWith('/' + filePathOrName) || filePathOrName.endsWith('/' + f));
  };

  // Recursive Tree Rendering
  const renderTree = (node: FileTreeNode, depth = 0): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.id] !== false;
    const isSelected = !isFolder && (activeTab === node.name || activeTab === node.path);
    const isHighlightedByFilter = !isFolder && activeLayerFilter && isFileInActiveFilter(node.path || node.name);

    return (
      <div key={node.id} className="flex flex-col">
        <div
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          onClick={() => (isFolder ? toggleFolder(node.id) : handleSelectFile(node))}
          className={`flex items-center justify-between py-1 pr-2 text-xs rounded-md cursor-pointer transition-colors relative group select-none ${
            isSelected
              ? 'bg-[#fbcfe8]/10 text-[#fbcfe8] font-medium'
              : isHighlightedByFilter
              ? 'bg-[#1f1f23] text-[#e3e2e6] font-medium'
              : 'text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6]'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isSelected && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#fbcfe8] rounded-r"></div>
            )}
            <span
              className={`material-symbols-outlined text-[15px] shrink-0 ${
                isFolder
                  ? 'text-[#938f98] group-hover:text-[#cac5ce]'
                  : isSelected
                  ? 'text-[#fbcfe8]'
                  : isHighlightedByFilter
                  ? 'text-emerald-400'
                  : 'text-[#b7c8e1]'
              }`}
            >
              {isFolder
                ? isExpanded
                  ? 'folder_open'
                  : 'folder'
                : node.name.endsWith('.yml') || node.name.endsWith('.xml') || node.name.endsWith('.json')
                ? 'description'
                : 'code'}
            </span>
            <span className="truncate text-xs">{node.name}</span>
          </div>

          {isHighlightedByFilter && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 shrink-0 ml-1">
              layer
            </span>
          )}
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const codeLines = activeSnippet.code ? activeSnippet.code.split('\n') : [];

  return (
    <div className="w-full h-[calc(100vh-8.5rem)] min-h-[540px] rounded-xl border border-[#48454d]/25 bg-[#111316] overflow-hidden flex flex-col md:flex-row shadow-lg">
      {/* Left: Explorer Panel */}
      <div className="w-full md:w-72 bg-[#1a1b1e] border-r border-[#48454d]/20 flex flex-col shrink-0">
        {/* Explorer Header */}
        <div className="px-3.5 py-2.5 bg-[#1f1f23]/60 border-b border-[#48454d]/20 flex items-center justify-between">
          <span className="font-heading font-semibold text-[11px] text-[#e3e2e6] tracking-wider uppercase">
            Explorer
          </span>
          <span className="text-[10px] font-mono text-[#938f98]">
            {loading ? 'Loading...' : `${repo.fileCount || Object.keys(snippets).length} files`}
          </span>
        </div>

        {/* Active Architecture Layer Filter Banner */}
        {activeLayerFilter && (
          <div className="px-3 py-2 bg-[#292a2d]/80 border-b border-[#48454d]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[14px] text-[#fbcfe8]">
                filter_alt
              </span>
              <span className="text-[11px] font-mono text-[#e3e2e6] truncate">
                Layer: <strong className="text-[#fbcfe8]">{activeLayerFilter.label}</strong>
              </span>
              <span className="text-[10px] font-mono text-[#938f98]">
                ({activeLayerFilter.count})
              </span>
            </div>

            {onClearFilter && (
              <button
                onClick={onClearFilter}
                className="text-[10px] font-mono text-[#938f98] hover:text-[#e3e2e6] hover:bg-[#343538] px-1.5 py-0.5 rounded border border-[#48454d]/30 flex items-center gap-0.5 transition-colors shrink-0"
                title="Clear architecture filter"
              >
                Clear
                <span className="material-symbols-outlined text-[11px]">close</span>
              </button>
            )}
          </div>
        )}

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-1.5">
          {loading ? (
            <div className="p-4 text-xs text-[#938f98] flex items-center gap-2 font-mono">
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Loading files...
            </div>
          ) : fileTree ? (
            renderTree(fileTree)
          ) : (
            <div className="p-4 text-xs text-[#938f98] font-mono">No files found.</div>
          )}
        </div>
      </div>

      {/* Center: Code Editor Area */}
      <div className="flex-1 flex flex-col bg-[#111316] min-w-0 overflow-hidden">
        {/* Editor Tabs */}
        <div className="flex items-center bg-[#0c0e11] border-b border-[#48454d]/20 overflow-x-auto no-scrollbar">
          {openTabs.map((tab, index) => {
            const isActive = activeTab === tab;
            return (
              <div
                key={`${tab}-${index}`}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 min-w-fit cursor-pointer border-b-2 text-xs transition-colors group ${
                  isActive
                    ? 'bg-[#111316] border-[#fbcfe8] text-[#e3e2e6] font-medium'
                    : 'border-transparent text-[#938f98] hover:bg-[#1a1b1e] hover:text-[#cac5ce]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    isActive ? 'text-[#b7c8e1]' : 'text-[#938f98]'
                  }`}
                >
                  {tab.endsWith('.yml') || tab.endsWith('.xml') || tab.endsWith('.json') ? 'description' : 'code'}
                </span>
                <span>{tab}</span>
                <button
                  onClick={(e) => handleCloseTab(tab, e)}
                  className="p-0.5 hover:bg-[#292a2d] rounded ml-1 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Code Content Header */}
        <div className="px-3.5 py-1.5 bg-[#1a1b1e]/40 border-b border-[#48454d]/20 flex items-center justify-between text-xs text-[#938f98]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#fbcfe8] text-[11px]">{activeTab || 'No file selected'}</span>
            <span>•</span>
            <span className="font-mono text-[#cac5ce] text-[11px]">{codeLines.length} lines</span>
            {targetLineRange?.startLine && targetLineRange?.endLine && (
              <>
                <span>•</span>
                <span className="font-mono text-emerald-400 text-[11px]">
                  Lines {targetLineRange.startLine}-{targetLineRange.endLine} highlighted
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onAskAi && activeTab && (
              <button
                onClick={() => onAskAi(`Explain how ${activeTab} works in this codebase`)}
                className="px-2 py-0.5 bg-[#1f1f23] hover:bg-[#292a2d] text-[#fbcfe8] rounded border border-[#48454d]/30 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                Explain File
              </button>
            )}
            <button
              onClick={handleCopyCode}
              className="px-2 py-0.5 bg-[#1f1f23] hover:bg-[#292a2d] text-[#cac5ce] hover:text-white rounded border border-[#48454d]/30 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Synchronous Code Viewer with Line Numbers & Range Highlighting */}
        <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed bg-[#111316] select-text">
          <table className="w-full border-collapse">
            <tbody>
              {codeLines.map((line, i) => {
                const lineNum = i + 1;
                const isHighlighted =
                  targetLineRange?.startLine && targetLineRange?.endLine
                    ? lineNum >= targetLineRange.startLine && lineNum <= targetLineRange.endLine
                    : false;

                let colorClass = 'text-[#e3e2e6]';
                if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('<!--')) {
                  colorClass = 'text-[#938f98] italic';
                } else if (
                  line.includes('public') ||
                  line.includes('class') ||
                  line.includes('package') ||
                  line.includes('import') ||
                  line.includes('@Configuration') ||
                  line.includes('@Service') ||
                  line.includes('@RestController') ||
                  line.includes('@Controller') ||
                  line.includes('@Repository') ||
                  line.includes('@Entity') ||
                  line.includes('@Injectable') ||
                  line.includes('@Module') ||
                  line.includes('@Bean') ||
                  line.includes('export') ||
                  line.includes('function')
                ) {
                  colorClass = 'text-[#fbcfe8]';
                } else if (
                  line.includes('return') ||
                  line.includes('new') ||
                  line.includes('boolean') ||
                  line.includes('const')
                ) {
                  colorClass = 'text-[#b7c8e1]';
                }

                return (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-[#fbcfe8]/10 border-l-2 border-[#fbcfe8]'
                        : 'hover:bg-[#1a1b1e]/50 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Synchronized Line Number Gutter */}
                    <td
                      className={`select-none py-0.5 pl-3 pr-4 text-right align-top w-12 shrink-0 border-r border-[#48454d]/20 text-[11px] font-mono sticky left-0 z-10 ${
                        isHighlighted ? 'text-[#fbcfe8] font-bold bg-[#1d1419]' : 'text-[#938f98]/40 bg-[#111316]'
                      }`}
                    >
                      {lineNum}
                    </td>

                    {/* Synchronized Code Text */}
                    <td className={`py-0.5 pl-4 pr-3 whitespace-pre font-mono text-xs align-top ${colorClass} ${isHighlighted ? 'text-white font-medium' : ''}`}>
                      {line || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
