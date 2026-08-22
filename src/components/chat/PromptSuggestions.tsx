'use client';

import React from 'react';
import { Sparkles, HelpCircle } from 'lucide-react';

export interface PromptSuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (question: string) => void;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  suggestions,
  onSelectSuggestion
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span>Suggested Codebase Queries:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((question) => (
          <button
            key={question}
            onClick={() => onSelectSuggestion(question)}
            className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/30 text-xs text-slate-300 hover:text-blue-300 font-medium transition-all text-left flex items-center gap-1.5 group"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
            <span>{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
