'use client';

import React, { useState, useEffect } from 'react';
import { Repository, TabType, ArchitectureFlowNode } from '@/types';

import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightPanel } from '@/components/layout/RightPanel';

import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureCards } from '@/components/landing/FeatureCards';
import { EmptyState } from '@/components/landing/EmptyState';

import { UploadModal } from '@/components/upload/UploadModal';
import { IndexingProgressModal } from '@/components/indexing/IndexingProgressModal';

import { RepositorySummaryView } from '@/components/summary/RepositorySummaryView';
import { DependencyGraphView } from '@/components/graph/DependencyGraphView';
import { FileExplorerView } from '@/components/files/FileExplorerView';
import { AnalysisView } from '@/components/analysis/AnalysisView';

export default function Home() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showLanding, setShowLanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [targetLineRange, setTargetLineRange] = useState<{ startLine?: number; endLine?: number }>({});
  const [activeLayerFilter, setActiveLayerFilter] = useState<{ label: string; count: number; files: string[] } | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'zip' | 'github'>('zip');

  // Real Indexing progress polling state
  const [isIndexingModalOpen, setIsIndexingModalOpen] = useState(false);
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null);
  const [indexingRepoName, setIndexingRepoName] = useState('');
  const [indexingStage, setIndexingStage] = useState('Pending Ingestion');
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [indexingStatus, setIndexingStatus] = useState<string>('PENDING');
  const [indexingError, setIndexingError] = useState<string | undefined>(undefined);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Global app history stack for back navigation across tabs and views
  const [navHistory, setNavHistory] = useState<
    {
      tab: TabType;
      selectedFile: string;
      targetLineRange: { startLine?: number; endLine?: number };
      activeLayerFilter: { label: string; count: number; files: string[] } | null;
      showLanding: boolean;
    }[]
  >([]);

  const pushNavHistory = () => {
    setNavHistory((prev) => [
      ...prev.slice(-29),
      {
        tab: activeTab,
        selectedFile,
        targetLineRange,
        activeLayerFilter,
        showLanding,
      },
    ]);
  };

  const handleGoBack = () => {
    setNavHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const previousSnapshot = nextHistory.pop()!;
      setActiveTab(previousSnapshot.tab);
      setSelectedFile(previousSnapshot.selectedFile);
      setTargetLineRange(previousSnapshot.targetLineRange);
      setActiveLayerFilter(previousSnapshot.activeLayerFilter);
      setShowLanding(previousSnapshot.showLanding);
      return nextHistory;
    });
  };

  const handleTabChange = (newTab: TabType) => {
    if (newTab !== activeTab) {
      pushNavHistory();
      if (newTab !== 'files') {
        setActiveLayerFilter(null);
      }
      setActiveTab(newTab);
    }
  };

  // Load repositories from real backend on mount
  const fetchRepositories = async () => {
    try {
      const res = await fetch('/api/repositories');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const repos: Repository[] = (data.repositories || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          url: r.github_url,
          primaryLanguage: r.primary_language || 'Code',
          framework: r.framework || 'Standard',
          fileCount: r.file_count || 0,
          folderCount: r.folder_count || 0,
          estimatedTokens: r.token_count || 0,
          branch: r.branch || 'main',
          status: r.status,
          stage: r.stage,
          progress: r.progress,
          lastIndexedAt: new Date(r.updated_at || r.created_at).toLocaleDateString(),
          stats: r.stats,
          technologies: r.technologies || [],
          summary: r.summary || {
            projectType: 'Repository',
            architecture: 'Modular',
            backend: 'Standard',
            frontend: 'N/A',
            database: 'N/A',
            authentication: 'Standard',
            description: `Repository ${r.name}`,
            keyPackages: [],
          },
          errorMessage: r.error_message,
        }));

        setRepositories(repos);
        if (repos.length > 0 && !activeRepo) {
          const completedRepo = repos.find((r) => r.status === 'COMPLETED') || repos[0];
          setActiveRepo(completedRepo);
        }
      }
    } catch (err) {
      console.error('Failed to load repositories from API:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Poll backend for indexing progress
  useEffect(() => {
    if (!indexingRepoId || !isIndexingModalOpen) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/repositories/${indexingRepoId}`);
        if (res.ok) {
          const data = await res.json();
          const repo = data.repository;
          if (repo) {
            setIndexingStage(repo.stage || 'Processing');
            setIndexingProgress(repo.progress || 0);
            setIndexingStatus(repo.status);
            setIndexingError(repo.error_message);

            if (repo.status === 'COMPLETED' || repo.status === 'FAILED') {
              clearInterval(interval);
              fetchRepositories();
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [indexingRepoId, isIndexingModalOpen]);

  // Handle Real ZIP Upload
  const handleUploadZip = async (file: File) => {
    setIndexingRepoName(file.name.replace(/\.zip$/i, ''));
    setIndexingStage('Uploading ZIP archive...');
    setIndexingProgress(5);
    setIndexingStatus('PENDING');
    setIndexingError(undefined);
    setIsIndexingModalOpen(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.zip$/i, ''));

      const res = await fetch('/api/repositories', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload repository ZIP');
      }

      const data = await res.json();
      setIndexingRepoId(data.id);
    } catch (err: any) {
      setIndexingStatus('FAILED');
      setIndexingError(err?.message || 'Failed to upload repository ZIP.');
    }
  };

  // Handle Real GitHub Import
  const handleImportGithub = async (url: string) => {
    setIndexingRepoName(url.split('/').pop() || url);
    setIndexingStage('Connecting to GitHub API...');
    setIndexingProgress(5);
    setIndexingStatus('PENDING');
    setIndexingError(undefined);
    setIsIndexingModalOpen(true);

    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: url }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to import GitHub repository');
      }

      const data = await res.json();
      setIndexingRepoId(data.id);
    } catch (err: any) {
      setIndexingStatus('FAILED');
      setIndexingError(err?.message || 'Failed to import GitHub repository.');
    }
  };

  const handleFinishIndexing = () => {
    if (indexingRepoId) {
      const found = repositories.find((r) => r.id === indexingRepoId);
      if (found) {
        setActiveRepo(found);
      }
    }
    setIsIndexingModalOpen(false);
    setShowLanding(false);
    setActiveTab('summary');
  };

  const handleSelectFileFromAnywhere = (filename: string, startLine?: number, endLine?: number) => {
    pushNavHistory();
    setSelectedFile(filename);
    if (startLine && endLine) {
      setTargetLineRange({ startLine, endLine });
    } else {
      setTargetLineRange({});
    }
    setActiveTab('files');
    setShowLanding(false);
  };

  const handleNavigateToArchitectureLayer = (node: ArchitectureFlowNode) => {
    pushNavHistory();
    setActiveLayerFilter({
      label: node.label,
      count: node.files.length,
      files: node.files,
    });

    const primaryRef = node.references?.[0];
    const primaryFile = primaryRef?.filePath || node.files[0] || '';

    if (primaryFile) {
      setSelectedFile(primaryFile);
      if (primaryRef?.startLine && primaryRef?.endLine) {
        setTargetLineRange({ startLine: primaryRef.startLine, endLine: primaryRef.endLine });
      } else {
        setTargetLineRange({});
      }
    }

    setActiveTab('files');
    setShowLanding(false);
  };

  const handleAskAiFromAnywhere = (prompt: string) => {
    setIsRightPanelOpen(true);
  };

  return (
    <div className="bg-[#121316] text-[#e3e2e6] min-h-screen flex flex-col font-sans selection:bg-[#fbcfe8]/20 selection:text-[#fbcfe8]">
      {/* Top Fixed Header */}
      <Navbar
        repositories={repositories}
        activeRepo={activeRepo}
        onSelectRepo={(repo) => {
          pushNavHistory();
          setActiveRepo(repo);
          setShowLanding(false);
        }}
        onOpenUploadModal={() => {
          setUploadInitialTab('zip');
          setIsUploadModalOpen(true);
        }}
        onNavigateHome={() => {
          pushNavHistory();
          setShowLanding(true);
        }}
        canGoBack={navHistory.length > 0}
        onGoBack={handleGoBack}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Main Workspace Body */}
      {showLanding ? (
        /* Landing Showcase View */
        <main className="flex-1 pt-14 flex flex-col items-center justify-start max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          <HeroSection
            onOpenUploadZip={() => {
              setUploadInitialTab('zip');
              setIsUploadModalOpen(true);
            }}
            onOpenGithubModal={() => {
              setUploadInitialTab('github');
              setIsUploadModalOpen(true);
            }}
          />
          <FeatureCards />
        </main>
      ) : activeRepo ? (
        /* Fixed Shell Workspace Layout */
        <div className="flex-1 flex w-full relative">
          {/* Left Sidebar Fixed 260px */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenUploadModal={() => {
              setUploadInitialTab('zip');
              setIsUploadModalOpen(true);
            }}
            onNewChat={() => {
              setIsRightPanelOpen(true);
            }}
          />

          {/* Center Scrollable Content with fixed left and dynamic right padding */}
          <main
            className={`flex-1 min-w-0 pl-[260px] ${
              isRightPanelOpen ? 'pr-[320px]' : 'pr-0'
            } pt-14 flex flex-col transition-all duration-200 ${
              activeTab === 'graph'
                ? 'h-[calc(100vh-3.5rem)] p-2 items-stretch overflow-hidden'
                : 'items-center overflow-y-auto'
            }`}
          >
            <div
              className={`w-full ${
                activeTab === 'graph'
                  ? 'h-full flex-1 flex flex-col'
                  : 'max-w-5xl px-6 py-7'
              }`}
            >
              {activeTab === 'summary' && (
                <RepositorySummaryView
                  repo={activeRepo}
                  onNavigateToGraph={() => setActiveTab('graph')}
                  onNavigateToFiles={() => {
                    setActiveLayerFilter(null);
                    setActiveTab('files');
                  }}
                  onNavigateToArchitectureNode={handleNavigateToArchitectureLayer}
                  onAskQuestion={handleAskAiFromAnywhere}
                />
              )}

              {activeTab === 'graph' && (
                <DependencyGraphView
                  repo={activeRepo}
                  onSelectFile={handleSelectFileFromAnywhere}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {activeTab === 'files' && (
                <FileExplorerView
                  repo={activeRepo}
                  selectedFile={selectedFile}
                  targetLineRange={targetLineRange}
                  activeLayerFilter={activeLayerFilter}
                  onClearFilter={() => setActiveLayerFilter(null)}
                  onFileSelect={handleSelectFileFromAnywhere}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisView
                  repo={activeRepo}
                  onSelectFile={handleSelectFileFromAnywhere}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                  <h1 className="text-xl font-heading font-semibold text-[#e3e2e6]">Settings</h1>
                  <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 space-y-3">
                    <span className="font-semibold text-xs text-[#e3e2e6] block">Database & Vector Storage</span>
                    <p className="text-xs text-[#938f98]">
                      Connected to PostgreSQL + pgvector at <span className="font-mono text-[#fbcfe8]">localhost:5432/codegraph</span>
                    </p>
                    <div className="pt-2">
                      <span className="text-[11px] font-mono text-[#b7c8e1] bg-[#121316] px-2.5 py-1 rounded border border-[#48454d]/20 inline-block">
                        Model: OpenAI text-embedding-3-small (1536 dims)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right Assistant Panel Fixed 320px */}
          <RightPanel
            activeRepo={activeRepo}
            isOpen={isRightPanelOpen}
            onClose={() => setIsRightPanelOpen(false)}
            onSelectFile={handleSelectFileFromAnywhere}
          />
        </div>
      ) : (
        /* Empty State when no repository is indexed */
        <main className="flex-1 pt-14 flex items-center justify-center p-6">
          <EmptyState
            onOpenUpload={() => {
              setUploadInitialTab('zip');
              setIsUploadModalOpen(true);
            }}
          />
        </main>
      )}

      {/* Upload Modal (ZIP & GitHub) */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadZip={handleUploadZip}
        onImportGithub={handleImportGithub}
        initialTab={uploadInitialTab}
      />

      {/* Indexing Progress Modal */}
      <IndexingProgressModal
        isOpen={isIndexingModalOpen}
        repoName={indexingRepoName}
        stage={indexingStage}
        progress={indexingProgress}
        status={indexingStatus}
        errorMessage={indexingError}
        onFinish={handleFinishIndexing}
        onClose={() => setIsIndexingModalOpen(false)}
      />
    </div>
  );
}
