'use client';

import React, { useState } from 'react';
import { Repository, FileTreeNode } from '@/types';
import { LOAN_MANAGEMENT_FILE_TREE, CODE_SNIPPETS } from '@/services/mockData';

export interface FileExplorerViewProps {
  repo: Repository;
  selectedFile?: string;
  onFileSelect?: (filename: string) => void;
  onAskAi?: (prompt: string) => void;
}

export const FileExplorerView: React.FC<FileExplorerViewProps> = ({
  repo,
  selectedFile: externalSelectedFile,
  onFileSelect,
  onAskAi
}) => {
  const [openTabs, setOpenTabs] = useState<string[]>([
    'SecurityConfig.java',
    'LoanEvaluationService.java',
    'application.yml'
  ]);
  const [activeTab, setActiveTab] = useState<string>(
    externalSelectedFile || 'SecurityConfig.java'
  );
  const [copied, setCopied] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'root': true,
    'folder-backend': true,
    'src-main-java': true,
    'com-example-loan': true,
    'folder-config': true,
    'folder-controllers': true,
    'folder-services': true,
    'folder-repositories': false,
    'src-main-resources': true,
    'folder-frontend': true,
    'folder-fe-src': true,
    'folder-fe-components': false,
    'folder-fe-app': false
  });

  const fileTree = repo.fileTree || LOAN_MANAGEMENT_FILE_TREE;

  const handleSelectFile = (filename: string) => {
    if (!openTabs.includes(filename)) {
      setOpenTabs((prev) => [...prev, filename]);
    }
    setActiveTab(filename);
    if (onFileSelect) {
      onFileSelect(filename);
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

  const activeSnippet = CODE_SNIPPETS[activeTab] || {
    language: 'text',
    code: `// File: ${activeTab}\n// Content loaded from vector database index\n\npackage com.example.loan;\n\npublic class ${activeTab.replace(/\..+$/, '')} {\n    // Implementation details indexed.\n}`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recursive Tree Rendering
  const renderTree = (node: FileTreeNode, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.id] !== false;
    const isSelected = !isFolder && activeTab === node.name;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          onClick={() => (isFolder ? toggleFolder(node.id) : handleSelectFile(node.name))}
          className={`flex items-center gap-1.5 py-1 pr-2 text-xs rounded-md cursor-pointer transition-colors relative group select-none ${
            isSelected
              ? 'bg-[#fbcfe8]/10 text-[#fbcfe8] font-medium'
              : 'text-[#cac5ce] hover:bg-[#292a2d] hover:text-[#e3e2e6]'
          }`}
        >
          {isSelected && (
            <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#fbcfe8] rounded-r"></div>
          )}
          <span
            className={`material-symbols-outlined text-[15px] ${
              isFolder
                ? 'text-[#938f98] group-hover:text-[#cac5ce]'
                : isSelected
                ? 'text-[#fbcfe8]'
                : 'text-[#b7c8e1]'
            }`}
          >
            {isFolder
              ? isExpanded
                ? 'folder_open'
                : 'folder'
              : node.name.endsWith('.yml') || node.name.endsWith('.xml')
              ? 'description'
              : 'code'}
          </span>
          <span className="truncate text-xs">{node.name}</span>
        </div>

        {isFolder && isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const codeLines = activeSnippet.code.split('\n');

  return (
    <div className="w-full h-[calc(100vh-8.5rem)] min-h-[540px] rounded-xl border border-[#48454d]/25 bg-[#111316] overflow-hidden flex flex-col md:flex-row shadow-lg">
      {/* Left: Explorer Panel */}
      <div className="w-full md:w-64 bg-[#1a1b1e] border-r border-[#48454d]/20 flex flex-col shrink-0">
        {/* Explorer Title */}
        <div className="px-3.5 py-2.5 bg-[#1f1f23]/60 border-b border-[#48454d]/20 flex items-center justify-between">
          <span className="font-heading font-semibold text-[11px] text-[#e3e2e6] tracking-wider uppercase">
            Explorer
          </span>
          <span className="text-[10px] font-mono text-[#938f98]">{repo.fileCount} files</span>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto p-1.5">
          {renderTree(fileTree)}
        </div>
      </div>

      {/* Center: Code Editor Area */}
      <div className="flex-1 flex flex-col bg-[#111316] min-w-0 overflow-hidden">
        {/* Editor Tabs */}
        <div className="flex items-center bg-[#0c0e11] border-b border-[#48454d]/20 overflow-x-auto no-scrollbar">
          {openTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <div
                key={tab}
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
                  {tab.endsWith('.yml') || tab.endsWith('.xml') ? 'description' : 'code'}
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

        {/* Code Content & Header Actions */}
        <div className="px-3.5 py-1.5 bg-[#1a1b1e]/40 border-b border-[#48454d]/20 flex items-center justify-between text-xs text-[#938f98]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#fbcfe8] text-[11px]">{activeTab}</span>
            <span>•</span>
            <span className="font-mono text-[#cac5ce] text-[11px]">{codeLines.length} lines</span>
          </div>

          <div className="flex items-center gap-2">
            {onAskAi && (
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

        {/* Code Viewer with Line Numbers */}
        <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed flex bg-[#111316]">
          {/* Line Numbers */}
          <div className="select-none text-[#938f98]/40 pr-3 text-right border-r border-[#48454d]/20 flex flex-col font-mono text-xs">
            {codeLines.map((_, i) => (
              <span key={i} className="leading-5">
                {i + 1}
              </span>
            ))}
          </div>

          {/* Code Text with custom syntax colors */}
          <div className="pl-3 flex-1 overflow-x-auto text-[#e3e2e6] font-mono text-xs">
            {codeLines.map((line, i) => {
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
                line.includes('@Bean')
              ) {
                colorClass = 'text-[#fbcfe8]';
              } else if (line.includes('return') || line.includes('new') || line.includes('boolean')) {
                colorClass = 'text-[#b7c8e1]';
              }

              return (
                <div key={i} className={`leading-5 whitespace-pre ${colorClass}`}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
