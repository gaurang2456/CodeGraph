'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Repository, ChatMessage as ChatMessageType } from '@/types';
import { MockApiService } from '@/services/mockApi';

export interface RightPanelProps {
  activeRepo: Repository;
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (filename: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  activeRepo,
  isOpen,
  onClose,
  onSelectFile
}) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'msg-user-1',
      sender: 'user',
      content: 'How can I add Google OAuth to this project?',
      timestamp: '2 mins ago'
    },
    {
      id: 'msg-assistant-1',
      sender: 'assistant',
      content: 'Your application already uses Spring Security and JWT authentication. The cleanest approach is to add Google OAuth2 alongside the existing authentication flow.',
      timestamp: 'Just now',
      confidenceScore: 0.98,
      implementationPlan: [
        { step: 1, title: 'Add dependencies', targetFile: 'pom.xml' },
        { step: 2, title: 'Configure Google OAuth', targetFile: 'application.yml' },
        { step: 3, title: 'OAuth success handler', targetFile: 'SecurityConfig.java' },
        { step: 4, title: 'Update security config', targetFile: 'SecurityConfig.java' },
        { step: 5, title: 'Handle user persistence', targetFile: 'AuthService.java' }
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isGenerating) return;

    const userMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: 'Just now'
    };

    setInputQuery('');
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    const initialAssistantMsg: ChatMessageType = {
      id: assistantMsgId,
      sender: 'assistant',
      content: '',
      timestamp: 'Just now',
      isStreaming: true
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const result = await MockApiService.streamChatResponse(text, (chunk) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: chunk } : msg))
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
                implementationPlan: result.implementationPlan,
                isStreaming: false
              }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: 'Failed to process question. Please try again.',
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-[320px] bg-[#0c0e11] border-l border-[#48454d]/20 flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b border-[#48454d]/10 flex items-center justify-between">
        <span className="text-sm font-heading font-semibold text-[#e3e2e6]">AI Assistant</span>
        <span
          onClick={onClose}
          className="material-symbols-outlined text-[#cac5ce] hover:text-white cursor-pointer text-[18px]"
        >
          close
        </span>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-xs text-[#938f98] italic text-center py-10">
            No active conversation. Start a new chat to analyze your code.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="w-full">
              {msg.sender === 'user' ? (
                /* User Message */
                <div className="flex flex-col gap-1 items-end">
                  <div className="bg-[#292a2d] text-[#e3e2e6] px-4 py-3 rounded-2xl rounded-tr-sm text-xs leading-relaxed shadow-sm max-w-[90%]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* AI Message */
                <div className="flex flex-col gap-3 items-start animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-[#fbcfe8] text-[11px] font-mono uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                    CodeGraph AI
                  </div>
                  <div className="text-[#cac5ce] text-xs leading-relaxed">
                    {msg.content || (msg.isStreaming && <span className="animate-pulse">Thinking...</span>)}
                  </div>

                  {/* Implementation Plan Step Buttons */}
                  {msg.implementationPlan && msg.implementationPlan.length > 0 && (
                    <div className="w-full flex flex-col gap-2 mt-1">
                      <div className="text-xs font-heading font-semibold text-[#e3e2e6]">
                        Implementation Plan
                      </div>
                      <div className="flex flex-col gap-1.5 w-full">
                        {msg.implementationPlan.map((step) => (
                          <button
                            key={step.step}
                            onClick={() => onSelectFile && onSelectFile(step.targetFile)}
                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 bg-[#1f1f23] shadow-sm hover:bg-[#292a2d] transition-colors rounded-xl group cursor-pointer border border-[#48454d]/20"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#fbcfe8]/10 text-[#fbcfe8] flex items-center justify-center text-[10px] font-mono font-medium shrink-0">
                              {step.step}
                            </div>
                            <div className="flex-1 text-xs text-[#e3e2e6] truncate font-medium">
                              {step.title}
                            </div>
                            <div className="text-[10px] font-mono text-[#938f98] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {step.targetFile}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1f1f23] border-t border-[#48454d]/20">
        <div className="relative flex items-center">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full bg-[#121316] border border-[#48454d]/30 rounded-xl p-3 pr-12 text-xs text-[#e3e2e6] placeholder:text-[#938f98] resize-none focus:outline-none focus:border-[#fbcfe8]/50"
            placeholder="Ask anything..."
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isGenerating}
            className="absolute right-3 p-1.5 bg-[#fbcfe8] text-[#3d1729] rounded-lg hover:bg-[#f9a8d4] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
