'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

export interface HeroSectionProps {
  onOpenUploadZip: () => void;
  onOpenGithubModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenUploadZip,
  onOpenGithubModal,
}) => {
  return (
    <div className="space-y-10 py-8 text-center max-w-4xl mx-auto">
      {/* Top Tagline Pill */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fbcfe8]/10 border border-[#fbcfe8]/20 text-xs font-mono text-[#fbcfe8] shadow-sm">
        <span className="material-symbols-outlined text-[16px]">hub</span>
        <span>Repository Intelligence & Vector RAG Platform</span>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-heading font-bold tracking-tight text-[#e3e2e6] leading-tight">
          Explore Code Architecture <br />
          <span className="text-[#fbcfe8]">
            with Vector Embeddings & RAG
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[#cac5ce] max-w-2xl mx-auto leading-relaxed">
          Upload any GitHub repository or ZIP archive to index source files in PostgreSQL + pgvector, ask architecture questions, and inspect verified source citations.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={onOpenUploadZip}
          className="w-full sm:w-auto font-semibold px-6 shadow-md"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">upload_file</span>
          Upload Repository ZIP
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={onOpenGithubModal}
          className="w-full sm:w-auto font-semibold px-6"
        >
          <span className="material-symbols-outlined text-[18px] mr-2">link</span>
          Import GitHub Repository
        </Button>
      </div>
    </div>
  );
};
