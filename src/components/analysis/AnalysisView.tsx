'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Repository, FeaturePlanRecord, FeaturePlanData, GeneratedChangeset } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFeaturePlans,
  useChangesets,
  invalidateFeaturePlans,
  invalidateChangesets,
} from '@/lib/api/queries';
import { DiffViewer } from './DiffViewer';

export interface AnalysisPersistedUiState {
  selectedPlanId?: string | null;
  selectedChangesetId?: string | null;
}

export interface AnalysisViewProps {
  repo: Repository;
  onSelectFile?: (filename: string, startLine?: number, endLine?: number) => void;
  onAskAi?: (prompt: string) => void;
  persistedUiState?: AnalysisPersistedUiState;
  onPersistUiState?: (state: AnalysisPersistedUiState) => void;
}

const SAMPLE_SUGGESTIONS = [
  'Add Google OAuth authentication',
  'Add password reset functionality',
  'Add Stripe subscription payments',
  'Add email notifications',
  'Add role-based authorization',
  'Add rate limiting to API endpoints',
];

const LOADING_STAGES = [
  'Understanding feature request...',
  'Searching relevant repository code...',
  'Analyzing AST symbols & architecture flow...',
  'Mapping dependencies and database schema...',
  'Synthesizing repository-aware implementation plan...',
];

const CODE_GEN_STAGES = [
  'Understanding implementation plan...',
  'Loading repository files from database...',
  'Analyzing related AST symbols & relationships...',
  'Generating proposed code implementations...',
  'Preparing Git-style diff preview...',
];

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  repo,
  onSelectFile,
  onAskAi,
  persistedUiState,
  onPersistUiState,
}) => {
  const queryClient = useQueryClient();
  const [featurePrompt, setFeaturePrompt] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [codeGenStageIdx, setCodeGenStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const planContainerRef = useRef<HTMLDivElement>(null);
  const diffContainerRef = useRef<HTMLDivElement>(null);

  // Load feature plans from TanStack Query cache
  const { data: plansData } = useFeaturePlans(repo.id);
  const previousPlans = plansData?.plans || [];

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    persistedUiState?.selectedPlanId || null
  );

  const currentPlan =
    (selectedPlanId ? previousPlans.find((p) => p.id === selectedPlanId) : null) ||
    previousPlans[0] ||
    null;

  // Load changesets for current plan from TanStack Query cache
  const { data: changesetsData } = useChangesets(currentPlan?.id);
  const allChangesets = changesetsData?.changesets || [];

  const [selectedChangesetId, setSelectedChangesetId] = useState<string | null>(
    persistedUiState?.selectedChangesetId || null
  );

  const currentChangeset =
    (selectedChangesetId ? allChangesets.find((c) => c.id === selectedChangesetId) : null) ||
    allChangesets[0] ||
    null;

  // Persist lightweight UI state to parent
  useEffect(() => {
    onPersistUiState?.({
      selectedPlanId: currentPlan?.id || null,
      selectedChangesetId: currentChangeset?.id || null,
    });
  }, [currentPlan?.id, currentChangeset?.id, onPersistUiState]);

  // Plan loading animation cycle
  useEffect(() => {
    if (!isGeneratingPlan) return;
    const interval = setInterval(() => {
      setLoadingStageIdx((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGeneratingPlan]);

  // Code Gen loading animation cycle
  useEffect(() => {
    if (!isGeneratingCode) return;
    const interval = setInterval(() => {
      setCodeGenStageIdx((prev) => (prev + 1) % CODE_GEN_STAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGeneratingCode]);

  const handleGeneratePlan = async (promptToUse?: string) => {
    const text = (promptToUse || featurePrompt).trim();
    if (!text) {
      setErrorMsg('Please enter a feature request to generate a plan.');
      return;
    }

    setIsGeneratingPlan(true);
    setErrorMsg(null);
    setLoadingStageIdx(0);
    setSelectedChangesetId(null);

    try {
      const res = await fetch(`/api/repositories/${repo.id}/feature-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: text }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate feature implementation plan.');
      }

      const data = await res.json();
      if (data.plan) {
        setSelectedPlanId(data.plan.id);
        invalidateFeaturePlans(queryClient, repo.id);
        setFeaturePrompt('');
        setTimeout(() => {
          planContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      console.error('Error generating feature plan:', err);
      setErrorMsg(err?.message || 'An error occurred while generating the plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleGenerateCodeChanges = async () => {
    if (!currentPlan) return;
    setIsGeneratingCode(true);
    setErrorMsg(null);
    setCodeGenStageIdx(0);

    try {
      const res = await fetch(`/api/feature-plans/${currentPlan.id}/generate-changes`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate code changes.');
      }

      const data = await res.json();
      if (data.changeset) {
        setSelectedChangesetId(data.changeset.id);
        invalidateChangesets(queryClient, currentPlan.id);
        setTimeout(() => {
          diffContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } catch (err: any) {
      console.error('Error generating code changes:', err);
      setErrorMsg(err?.message || 'An error occurred while generating code changes.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleApproveChangeset = async (changesetId: string) => {
    try {
      const res = await fetch(`/api/changesets/${changesetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (res.ok && currentPlan) {
        invalidateChangesets(queryClient, currentPlan.id);
      }
    } catch (err) {
      console.error('Error approving changeset:', err);
    }
  };

  const handleRejectChangeset = async (changesetId: string) => {
    try {
      const res = await fetch(`/api/changesets/${changesetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (res.ok && currentPlan) {
        invalidateChangesets(queryClient, currentPlan.id);
      }
    } catch (err) {
      console.error('Error rejecting changeset:', err);
    }
  };

  const planData: FeaturePlanData | null = currentPlan?.planJson || null;

  return (
    <div className="flex flex-col w-full gap-8 max-w-5xl pb-16 animate-in fade-in duration-200 select-none">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#241c2c] border border-[#fbcfe8]/40 flex items-center justify-center text-[#fbcfe8] shadow-lg shadow-[#fbcfe8]/10">
              <span className="material-symbols-outlined text-[22px]">architecture</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
                AI Feature Planner
              </h1>
              <p className="text-xs text-[#938f98]">
                Plan repository-aware feature implementations and generate Git-style code changes.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbcfe8]/10 text-[#fbcfe8] text-[11px] font-mono border border-[#fbcfe8]/25 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#fbcfe8] animate-pulse" />
            <span>AST & RAG Grounded</span>
          </div>
        </div>
      </header>

      {/* Feature Request Input Section */}
      <section className="bg-[#13151b]/95 backdrop-blur-xl border border-[#48454d]/35 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-[#cac5ce] uppercase tracking-wider block">
            What would you like to add to this project?
          </label>
          <div className="relative">
            <textarea
              value={featurePrompt}
              onChange={(e) => setFeaturePrompt(e.target.value)}
              placeholder="e.g. Add Google OAuth authentication with token persistence and session refresh"
              rows={3}
              disabled={isGeneratingPlan || isGeneratingCode}
              className="w-full bg-[#1c1e26] border border-[#48454d]/40 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder:text-[#6a6770] focus:border-[#fbcfe8]/70 focus:outline-none transition-all shadow-inner font-mono resize-none"
            />
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">
            Suggested Feature Requests
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFeaturePrompt(suggestion);
                  handleGeneratePlan(suggestion);
                }}
                disabled={isGeneratingPlan || isGeneratingCode}
                className="text-[11px] font-mono text-[#cac5ce] hover:text-white bg-[#1c1e26] hover:bg-[#272a36] border border-[#48454d]/30 hover:border-[#fbcfe8]/40 px-3 py-1.5 rounded-xl transition-all text-left cursor-pointer shadow-sm disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#48454d]/25">
          {/* Previous Plans Dropdown */}
          {previousPlans.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#938f98]">Previous Plans:</span>
              <select
                value={currentPlan?.id || ''}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                }}
                className="bg-[#1c1e26] border border-[#48454d]/40 text-xs font-mono text-[#cac5ce] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#fbcfe8]/60 cursor-pointer"
              >
                {previousPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.featureRequest.slice(0, 45)}... ({new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div />
          )}

          {/* Submit Button */}
          <button
            onClick={() => handleGeneratePlan()}
            disabled={isGeneratingPlan || !featurePrompt.trim()}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#70485c] to-[#49273c] hover:from-[#82546c] hover:to-[#573047] border border-[#fbcfe8]/40 text-white text-xs font-mono font-bold transition-all shadow-lg hover:shadow-[#fbcfe8]/20 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGeneratingPlan ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Analyzing Codebase...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>Generate Implementation Plan</span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0">error</span>
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Loading Progress State for Plan */}
      {isGeneratingPlan && (
        <section className="bg-[#13151b]/90 border border-[#fbcfe8]/30 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#241c2c] border border-[#fbcfe8]/50 flex items-center justify-center text-[#fbcfe8] shadow-xl">
            <div className="w-6 h-6 rounded-full border-2 border-[#fbcfe8] border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-heading font-semibold text-white">
              {LOADING_STAGES[loadingStageIdx]}
            </h3>
            <p className="text-xs font-mono text-[#938f98]">
              Grounding analysis on repository files, AST symbols, and architecture flow
            </p>
          </div>
        </section>
      )}

      {/* Structured Implementation Plan Presentation */}
      {!isGeneratingPlan && planData && (
        <div ref={planContainerRef} className="space-y-6 animate-in fade-in duration-300">
          {/* Header Bar with PR & Code Gen Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#161820]/95 border border-[#48454d]/30 rounded-2xl p-4 shadow-xl">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">
                Approved Plan For
              </div>
              <div className="text-sm font-heading font-bold text-white">
                &ldquo;{currentPlan?.featureRequest}&rdquo;
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Generate Code Changes Button */}
              <button
                onClick={handleGenerateCodeChanges}
                disabled={isGeneratingCode}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-400/40 text-white text-xs font-mono font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingCode ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">code</span>
                    <span>Generate Code Changes</span>
                  </>
                )}
              </button>

              {/* Pull Request Action (Coming Soon) */}
              <button
                disabled
                className="py-2 px-4 rounded-xl bg-[#1c1e26] border border-[#48454d]/40 text-[#938f98] text-xs font-mono flex items-center gap-2 cursor-not-allowed opacity-70"
                title="Future CodeGraph workflow: Auto branch and pull request creation"
              >
                <span className="material-symbols-outlined text-[16px] text-[#938f98]">commit</span>
                <span>Create Pull Request</span>
                <span className="px-1.5 py-0.5 rounded-md bg-[#292a2d] text-[9px] font-bold text-[#fbcfe8] uppercase tracking-wider">
                  Coming Soon
                </span>
              </button>
            </div>
          </div>

          {/* 1. Feature Overview */}
          <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-[#fbcfe8]">
              <span className="material-symbols-outlined text-[18px]">lightbulb</span>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                1. Feature Overview
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#e3e2e6] leading-relaxed font-sans">
              {planData.overview}
            </p>
          </section>

          {/* 2. Relevant Existing Architecture */}
          {planData.relevantArchitecture && planData.relevantArchitecture.length > 0 && (
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-[#b7c8e1]">
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                  2. Relevant Existing Architecture
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {planData.relevantArchitecture.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectFile && item.filePath) {
                        onSelectFile(item.filePath);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-[#1c1e26] border border-[#48454d]/30 hover:border-[#b7c8e1]/60 transition-all flex flex-col gap-1.5 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#b7c8e1] group-hover:text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">code</span>
                        {item.symbol}
                      </span>
                      {item.filePath && (
                        <span className="text-[10px] font-mono text-[#938f98] group-hover:text-[#fbcfe8] truncate max-w-[200px]">
                          {item.filePath}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#cac5ce] leading-normal">{item.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3 & 4: Files to Modify and Files to Create */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 3. Files to Modify */}
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-300">
                <span className="material-symbols-outlined text-[18px]">edit_document</span>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                  3. Files to Modify ({planData.filesToModify?.length || 0})
                </h2>
              </div>
              <div className="space-y-3">
                {planData.filesToModify?.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectFile && file.filePath) {
                        onSelectFile(file.filePath);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-[#1c1e26] border border-amber-500/20 hover:border-amber-400/50 transition-all space-y-2 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-200 group-hover:text-white truncate">
                        {file.filePath}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-[9px] font-mono font-bold text-amber-300 uppercase tracking-wider border border-amber-500/30 shrink-0">
                        MODIFY
                      </span>
                    </div>
                    {file.symbols && file.symbols.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.symbols.map((sym, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded-md bg-[#292a2d] text-[10px] font-mono text-[#e3e2e6]"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-[#cac5ce] leading-relaxed">{file.reason}</p>
                    {file.existingReference && (
                      <div className="text-[10px] font-mono text-[#938f98] bg-[#121316] p-1.5 rounded-lg border border-[#48454d]/20">
                        Ref: {file.existingReference}
                      </div>
                    )}
                  </div>
                ))}
                {(!planData.filesToModify || planData.filesToModify.length === 0) && (
                  <div className="text-xs font-mono text-[#938f98] p-4 text-center">
                    No existing files need modification.
                  </div>
                )}
              </div>
            </section>

            {/* 4. New Files to Create */}
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <span className="material-symbols-outlined text-[18px]">note_add</span>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                  4. New Files to Create ({planData.filesToCreate?.length || 0})
                </h2>
              </div>
              <div className="space-y-3">
                {planData.filesToCreate?.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#1c1e26] border border-emerald-500/20 hover:border-emerald-400/50 transition-all space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-200 truncate">
                        {file.filePath}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider border border-emerald-500/30 shrink-0">
                        NEW FILE
                      </span>
                    </div>
                    <p className="text-[11px] text-[#cac5ce] leading-relaxed">{file.purpose}</p>
                  </div>
                ))}
                {(!planData.filesToCreate || planData.filesToCreate.length === 0) && (
                  <div className="text-xs font-mono text-[#938f98] p-4 text-center">
                    No new files required.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 5, 6, 7: Dependencies, Database Changes, API Changes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 5. Dependencies Required */}
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-[#fbcfe8]">
                <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  5. Dependencies
                </h3>
              </div>
              <div className="space-y-2">
                {planData.dependencies && planData.dependencies.length > 0 ? (
                  planData.dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#1c1e26] border border-[#48454d]/25 space-y-0.5"
                    >
                      <div className="text-xs font-mono font-bold text-[#fbcfe8]">{dep.name}</div>
                      <div className="text-[10px] text-[#cac5ce] leading-tight">{dep.reason}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-[#938f98] p-3 text-center">
                    No new packages needed
                  </div>
                )}
              </div>
            </section>

            {/* 6. Database Changes */}
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="material-symbols-outlined text-[17px]">database</span>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  6. Database Changes
                </h3>
              </div>
              <div className="space-y-2">
                {planData.databaseChanges && planData.databaseChanges.length > 0 ? (
                  planData.databaseChanges.map((change, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#1c1e26] border border-cyan-500/20 text-xs font-mono text-[#e3e2e6] leading-relaxed"
                    >
                      {change}
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-[#938f98] p-3 text-center">
                    No database changes required
                  </div>
                )}
              </div>
            </section>

            {/* 7. API Changes */}
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-violet-300">
                <span className="material-symbols-outlined text-[17px]">api</span>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
                  7. API Endpoints
                </h3>
              </div>
              <div className="space-y-2">
                {planData.apiChanges && planData.apiChanges.length > 0 ? (
                  planData.apiChanges.map((api, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#1c1e26] border border-violet-500/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-violet-200 truncate">
                          {api.endpoint}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-[9px] font-mono text-violet-300">
                          {api.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#cac5ce] leading-tight">
                        {api.description}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono text-[#938f98] p-3 text-center">
                    No new endpoints required
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 8. Step-by-Step Implementation Plan */}
          <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-[#fbcfe8]">
              <span className="material-symbols-outlined text-[18px]">checklist</span>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                8. Step-by-Step Implementation Plan
              </h2>
            </div>
            <div className="space-y-3">
              {planData.implementationSteps?.map((step) => (
                <div
                  key={step.step}
                  className="p-4 rounded-2xl bg-[#1c1e26] border border-[#48454d]/30 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#70485c]/40 border border-[#fbcfe8]/40 text-[#fbcfe8] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                      {step.step}
                    </div>
                    <h3 className="text-xs sm:text-sm font-heading font-bold text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#cac5ce] leading-relaxed pl-9 font-sans">
                    {step.description}
                  </p>
                  {(step.files?.length > 0 || step.symbols?.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 pl-9 pt-1">
                      {step.files?.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => onSelectFile && onSelectFile(f)}
                          className="px-2 py-0.5 rounded-lg bg-[#292a2d] hover:bg-[#343538] text-[10px] font-mono text-[#b7c8e1] hover:text-white transition-colors cursor-pointer"
                        >
                          📄 {f}
                        </button>
                      ))}
                      {step.symbols?.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-lg bg-[#241c2c] text-[10px] font-mono text-[#fbcfe8]"
                        >
                          ⚡ {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 9. Potential Side Effects / Risks */}
          {planData.potentialSideEffects && planData.potentialSideEffects.length > 0 && (
            <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-rose-300">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                  9. Potential Side Effects & Risks
                </h2>
              </div>
              <ul className="space-y-2">
                {planData.potentialSideEffects.map((effect, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-200 leading-relaxed font-mono flex items-start gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-rose-400 shrink-0 mt-0.5">
                      priority_high
                    </span>
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 10. Confidence and Evidence */}
          <section className="bg-[#13151b]/95 border border-[#48454d]/35 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#938f98]">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider">
                  10. Repository Evidence Used
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-[#938f98]">
                <span>
                  <strong className="text-white">{planData.evidence?.files?.length || 0}</strong>{' '}
                  files
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white">{planData.evidence?.symbols?.length || 0}</strong>{' '}
                  symbols
                </span>
                <span>•</span>
                <span>
                  <strong className="text-white">{planData.evidence?.chunkCount || 0}</strong> code
                  chunks
                </span>
              </div>
            </div>

            {/* Clickable Evidence Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {planData.evidence?.files?.map((filePath, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectFile && onSelectFile(filePath)}
                  className="px-3 py-1.5 rounded-xl bg-[#1c1e26] hover:bg-[#292a2d] border border-[#48454d]/30 hover:border-[#fbcfe8]/50 text-xs font-mono text-[#cac5ce] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="View file in File Explorer"
                >
                  <span className="material-symbols-outlined text-[14px] text-[#b7c8e1]">
                    description
                  </span>
                  <span>{filePath}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Loading Progress State for Code Gen */}
      {isGeneratingCode && (
        <section className="bg-[#13151b]/90 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-heading font-semibold text-white">
              {CODE_GEN_STAGES[codeGenStageIdx]}
            </h3>
            <p className="text-xs font-mono text-[#938f98]">
              Generating complete code implementations from approved plan and repository source files
            </p>
          </div>
        </section>
      )}

      {/* Code Changes Diff Viewer Section */}
      {!isGeneratingCode && currentChangeset && (
        <div ref={diffContainerRef} className="pt-4">
          <DiffViewer
            changeset={currentChangeset}
            allChangesets={allChangesets}
            onSelectChangeset={(id) => {
              setSelectedChangesetId(id);
            }}
            onApprove={handleApproveChangeset}
            onReject={handleRejectChangeset}
            onRegenerate={handleGenerateCodeChanges}
            isGenerating={isGeneratingCode}
          />
        </div>
      )}
    </div>
  );
};
