'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface ZipUploadTabProps {
  onStartUpload: (file: File) => void;
}

export const ZipUploadTab: React.FC<ZipUploadTabProps> = ({ onStartUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip')) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 ${
          isDragging
            ? 'border-[#fbcfe8] bg-[#fbcfe8]/5 scale-[1.01]'
            : 'border-[#48454d]/40 bg-[#1f1f23]/40 hover:border-[#fbcfe8]/40'
        }`}
      >
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="w-12 h-12 rounded-2xl bg-[#292a2d] text-[#fbcfe8] flex items-center justify-center mb-3 shadow-md">
          <span className="material-symbols-outlined text-[26px]">folder_zip</span>
        </div>

        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#e3e2e6]">{selectedFile.name}</p>
            <p className="text-xs text-[#938f98] font-mono">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#e3e2e6]">
              Drag & drop your repository <span className="text-[#fbcfe8]">ZIP</span> here
            </p>
            <p className="text-xs text-[#938f98]">or click anywhere to browse from local computer</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="primary"
          disabled={!selectedFile}
          onClick={() => selectedFile && onStartUpload(selectedFile)}
          className="w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px] mr-1.5">rocket_launch</span>
          Start Indexing Codebase
        </Button>
      </div>
    </div>
  );
};
