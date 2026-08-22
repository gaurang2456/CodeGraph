'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Repository, ChatMessage as ChatMessageType, FileCitation } from '@/types';
import { ChatMessage } from './ChatMessage';
import { PromptSuggestions } from './PromptSuggestions';
import { FileViewerModal } from './FileViewerModal';
import { MockApiService } from '@/services/mockApi';
import { Button } from '@/components/ui/Button';
import { Send, Sparkles, MessageSquareCode, Trash2, Bot } from 'lucide-react';

export interface ChatInterfaceProps {
  activeRepo: Repository;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ activeRepo }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      content: `Hello! I have indexed **${activeRepo.name}**. You can ask me anything about its architecture, authentication flow, database schemas, REST endpoints, or business logic.`,
      timestamp: 'Just now',
      confidenceScore: 0.99
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<FileCitation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendQuery = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim() || isGenerating) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessageType = {
      id: userMsgId,
      sender: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setInputQuery('');
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = `msg-assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessageType = {
      id: assistantMsgId,
      sender: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const result = await MockApiService.streamChatResponse(query, (streamedText) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: streamedText }
              : msg
          )
        );
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: result.answer,
                citations: result.citations,
                confidenceScore: result.confidenceScore,
                isStreaming: false
              }
            : msg
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: 'Sorry, an error occurred while processing your question.',
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] glass-panel rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
              Codebase RAG Chat
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Vector Graph Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Querying repository: {activeRepo.name}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setMessages([
              {
                id: 'welcome-reset',
                sender: 'assistant',
                content: `Chat history cleared. How can I assist you with **${activeRepo.name}**?`,
                timestamp: 'Just now'
              }
            ])
          }
          leftIcon={<Trash2 className="w-3.5 h-3.5 text-slate-500" />}
          className="text-xs text-slate-400 hover:text-red-400"
        >
          Clear Chat
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onCitationClick={(citation) => setSelectedCitation(citation)}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Prompt Suggestions Bar */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 space-y-3 shrink-0">
        {activeRepo.sampleQuestions && activeRepo.sampleQuestions.length > 0 && (
          <PromptSuggestions
            suggestions={activeRepo.sampleQuestions}
            onSelectSuggestion={(q) => handleSendQuery(q)}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about this repository..."
              disabled={isGenerating}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-slate-700 transition-all font-sans"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!inputQuery.trim() || isGenerating}
            isLoading={isGenerating}
            rightIcon={<Send className="w-4 h-4" />}
            className="h-11 px-5"
          >
            Send
          </Button>
        </form>
      </div>

      {/* Citation Inspector Modal */}
      <FileViewerModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
};
