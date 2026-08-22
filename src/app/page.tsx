'use client';

import React, { useState } from 'react';
import { Repository, TabType, IndexingStepStatus } from '@/types';
import { SAMPLE_REPOSITORIES } from '@/services/mockData';
import { MockApiService, INITIAL_INDEXING_STEPS } from '@/services/mockApi';

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
  const [repositories, setRepositories] = useState<Repository[]>(SAMPLE_REPOSITORIES);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(SAMPLE_REPOSITORIES[0]);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [showLanding, setShowLanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string>('SecurityConfig.java');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'zip' | 'github'>('zip');

  const [isIndexingModalOpen, setIsIndexingModalOpen] = useState(false);
  const [indexingSteps, setIndexingSteps] = useState<IndexingStepStatus[]>(INITIAL_INDEXING_STEPS);
  const [indexingRepoName, setIndexingRepoName] = useState('');
  const [pendingRepo, setPendingRepo] = useState<Repository | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Trigger simulated indexing process
  const handleStartIndexingProcess = async (repoSource: string) => {
    setIndexingRepoName(repoSource);
    setIndexingSteps(INITIAL_INDEXING_STEPS);
    setIsIndexingModalOpen(true);

    try {
      const newRepo = await MockApiService.startIndexing(repoSource, (updatedSteps) => {
        setIndexingSteps(updatedSteps);
      });
      setPendingRepo(newRepo);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishIndexing = () => {
    if (pendingRepo) {
      setRepositories((prev) => [pendingRepo, ...prev]);
      setActiveRepo(pendingRepo);
      setPendingRepo(null);
    }
    setIsIndexingModalOpen(false);
    setShowLanding(false);
    setActiveTab('summary');
  };

  const handleSelectFileFromAnywhere = (filename: string) => {
    const cleanName = filename.split('/').pop() || filename;
    setSelectedFile(cleanName);
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
          setActiveRepo(repo);
          setShowLanding(false);
        }}
        onOpenUploadModal={() => {
          setUploadInitialTab('zip');
          setIsUploadModalOpen(true);
        }}
        onNavigateHome={() => setShowLanding(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onToggleRightPanel={() => setIsRightPanelOpen((o) => !o)}
      />

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowLanding(false);
        }}
        onNewChat={() => {
          setIsRightPanelOpen(true);
        }}
        onOpenUploadModal={() => {
          setUploadInitialTab('zip');
          setIsUploadModalOpen(true);
        }}
      />

      {/* Main Workspace Frame (Matches Stitch pl-[260px] pr-[320px] pt-14) */}
      <div
        className={`flex min-h-screen pt-14 transition-all duration-200 ${
          showLanding
            ? 'pl-[260px] pr-0'
            : `pl-[260px] ${isRightPanelOpen ? 'pr-[320px]' : 'pr-0'}`
        }`}
      >
        <main className="flex-1 p-6 overflow-y-auto">
          {showLanding ? (
            /* LANDING PAGE VIEW */
            <div className="space-y-8 animate-in fade-in duration-200 max-w-6xl mx-auto">
              <HeroSection
                onOpenUploadZip={() => {
                  setUploadInitialTab('zip');
                  setIsUploadModalOpen(true);
                }}
                onOpenUploadGithub={() => {
                  setUploadInitialTab('github');
                  setIsUploadModalOpen(true);
                }}
                onSelectSampleRepo={(repo) => {
                  setActiveRepo(repo);
                  setShowLanding(false);
                  setActiveTab('summary');
                }}
              />
              <FeatureCards />
            </div>
          ) : !activeRepo ? (
            /* EMPTY STATE VIEW */
            <EmptyState
              onOpenUpload={() => {
                setUploadInitialTab('zip');
                setIsUploadModalOpen(true);
              }}
            />
          ) : (
            /* ACTIVE WORKSPACE TABS */
            <div className="w-full">
              {/* TAB: SUMMARY */}
              {activeTab === 'summary' && (
                <RepositorySummaryView
                  repo={activeRepo}
                  onNavigateToGraph={() => setActiveTab('graph')}
                  onNavigateToFiles={() => setActiveTab('files')}
                  onAskQuestion={handleAskAiFromAnywhere}
                />
              )}

              {/* TAB: GRAPH */}
              {activeTab === 'graph' && (
                <DependencyGraphView
                  repo={activeRepo}
                  onSelectFile={handleSelectFileFromAnywhere}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {/* TAB: FILES */}
              {activeTab === 'files' && (
                <FileExplorerView
                  repo={activeRepo}
                  selectedFile={selectedFile}
                  onFileSelect={(file) => setSelectedFile(file)}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {/* TAB: ANALYSIS */}
              {activeTab === 'analysis' && (
                <AnalysisView
                  repo={activeRepo}
                  onAskAi={handleAskAiFromAnywhere}
                />
              )}

              {/* TAB: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-heading font-semibold text-[#e3e2e6]">Settings</h1>
                    <p className="text-xs text-[#cac5ce]">Manage repository parsing & AI preferences</p>
                  </div>

                  <div className="p-6 bg-[#1a1b1e] border border-[#48454d]/30 rounded-2xl space-y-4">
                    <h3 className="text-sm font-heading font-semibold text-[#e3e2e6]">
                      Vector Engine Configuration
                    </h3>
                    <div className="space-y-3 text-xs text-[#cac5ce]">
                      <div className="flex items-center justify-between p-3 bg-[#1f1f23] rounded-xl border border-[#48454d]/20">
                        <div>
                          <span className="font-medium text-[#e3e2e6] block">Embedding Model</span>
                          <span className="text-[#938f98]">text-embedding-3-small (1536 dims)</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-[#fbcfe8]/10 text-[#fbcfe8] text-[11px] font-mono">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[#1f1f23] rounded-xl border border-[#48454d]/20">
                        <div>
                          <span className="font-medium text-[#e3e2e6] block">AST Chunking Strategy</span>
                          <span className="text-[#938f98]">Semantic Class & Method Boundaries</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-mono">
                          Optimal
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right AI Assistant Panel */}
        {!showLanding && activeRepo && (
          <RightPanel
            activeRepo={activeRepo}
            isOpen={isRightPanelOpen}
            onClose={() => setIsRightPanelOpen(false)}
            onSelectFile={handleSelectFileFromAnywhere}
          />
        )}
      </div>

      {/* Upload & Indexing Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onStartProcess={handleStartIndexingProcess}
        initialTab={uploadInitialTab}
      />

      <IndexingProgressModal
        isOpen={isIndexingModalOpen}
        steps={indexingSteps}
        repoName={indexingRepoName}
        onFinish={handleFinishIndexing}
      />
    </div>
  );
}
