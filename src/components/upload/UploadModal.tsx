'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { ZipUploadTab } from './ZipUploadTab';
import { GithubUrlTab } from './GithubUrlTab';

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartProcess: (repoSource: string) => void;
  initialTab?: 'zip' | 'github';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onStartProcess,
  initialTab = 'zip'
}) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'github'>(initialTab);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload & Index Repository"
      description="Scan a GitHub repository or upload a local ZIP file to generate vector embeddings and explore code architecture."
      maxWidth="lg"
    >
      {/* Tab Selectors */}
      <div className="flex border-b border-[#48454d]/30 mb-5">
        <button
          onClick={() => setActiveTab('zip')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'zip'
              ? 'border-[#fbcfe8] text-[#fbcfe8] bg-[#fbcfe8]/5'
              : 'border-transparent text-[#938f98] hover:text-[#cac5ce]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">folder_zip</span>
          <span>Upload ZIP</span>
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'github'
              ? 'border-[#fbcfe8] text-[#fbcfe8] bg-[#fbcfe8]/5'
              : 'border-transparent text-[#938f98] hover:text-[#cac5ce]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">link</span>
          <span>GitHub URL</span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'zip' ? (
        <ZipUploadTab
          onStartUpload={(filename) => {
            onClose();
            onStartProcess(filename);
          }}
        />
      ) : (
        <GithubUrlTab
          onStartClone={(url) => {
            onClose();
            onStartProcess(url);
          }}
        />
      )}
    </Dialog>
  );
};
