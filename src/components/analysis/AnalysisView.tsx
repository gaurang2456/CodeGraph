'use client';

import React from 'react';
import { Repository } from '@/types';

export interface AnalysisViewProps {
  repo: Repository;
  onAskAi?: (prompt: string) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ repo, onAskAi }) => {
  return (
    <div className="flex flex-col w-full gap-6 max-w-5xl pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-heading font-semibold text-[#e3e2e6] tracking-tight">
          Architecture Analysis
        </h1>
        <p className="text-xs text-[#938f98]">
          Deep structural audit, API endpoints index, and security evaluation
        </p>
      </header>

      {/* Top Health Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Architecture Score</span>
            <span className="material-symbols-outlined text-[#fbcfe8] text-[18px]">verified</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#fbcfe8]">94 / 100</div>
          <p className="text-[11px] text-[#cac5ce]">Clean separation of Controller, Service, and DAO layers.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Security Posture</span>
            <span className="material-symbols-outlined text-[#b7c8e1] text-[18px]">shield</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#b7c8e1]">Stateless JWT</div>
          <p className="text-[11px] text-[#cac5ce]">BCrypt hashing + Spring Security 6 Filter Chain active.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#1a1b1e] border border-[#48454d]/25 flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#938f98] uppercase tracking-wider">Cache Hit Ratio</span>
            <span className="material-symbols-outlined text-[#d7c3b6] text-[18px]">bolt</span>
          </div>
          <div className="text-2xl font-heading font-bold text-[#d7c3b6]">98.2%</div>
          <p className="text-[11px] text-[#cac5ce]">Redis key-value cache prevents redundant bureau calls.</p>
        </div>
      </div>

      {/* REST API Endpoints Index */}
      <section className="bg-[#1a1b1e] border border-[#48454d]/25 rounded-xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-heading font-semibold text-[#e3e2e6] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#fbcfe8] text-[18px]">api</span>
            REST API Endpoints Inventory
          </h2>
          <span className="text-[10px] font-mono text-[#938f98]">5 documented endpoints</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#cac5ce]">
            <thead className="bg-[#1f1f23] text-[#938f98] font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2 px-2.5 rounded-l-lg">Method</th>
                <th className="py-2 px-2.5">Path</th>
                <th className="py-2 px-2.5">Controller Class</th>
                <th className="py-2 px-2.5">Auth Guard</th>
                <th className="py-2 px-2.5 rounded-r-lg text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#48454d]/20 text-[11px]">
              <tr>
                <td className="py-2.5 px-2.5">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold text-[9px]">
                    POST
                  </span>
                </td>
                <td className="py-2.5 px-2.5 font-mono text-[#e3e2e6]">/api/auth/login</td>
                <td className="py-2.5 px-2.5 font-mono text-[#b7c8e1]">AuthController.java</td>
                <td className="py-2.5 px-2.5">PermitAll</td>
                <td className="py-2.5 px-2.5 text-right">
                  {onAskAi && (
                    <button
                      onClick={() => onAskAi('Explain the login authentication flow')}
                      className="text-[#fbcfe8] hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      Audit
                    </button>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2.5">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold text-[9px]">
                    POST
                  </span>
                </td>
                <td className="py-2.5 px-2.5 font-mono text-[#e3e2e6]">/api/auth/register</td>
                <td className="py-2.5 px-2.5 font-mono text-[#b7c8e1]">AuthController.java</td>
                <td className="py-2.5 px-2.5">PermitAll</td>
                <td className="py-2.5 px-2.5 text-right">
                  {onAskAi && (
                    <button
                      onClick={() => onAskAi('Explain user registration')}
                      className="text-[#fbcfe8] hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      Audit
                    </button>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2.5">
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono font-semibold text-[9px]">
                    POST
                  </span>
                </td>
                <td className="py-2.5 px-2.5 font-mono text-[#e3e2e6]">/api/loans/apply</td>
                <td className="py-2.5 px-2.5 font-mono text-[#b7c8e1]">LoanApplicationController.java</td>
                <td className="py-2.5 px-2.5 text-[#fbcfe8]">JWT Authenticated</td>
                <td className="py-2.5 px-2.5 text-right">
                  {onAskAi && (
                    <button
                      onClick={() => onAskAi('How does loan application eligibility underwriting work?')}
                      className="text-[#fbcfe8] hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      Audit
                    </button>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-2.5">
                  <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-mono font-semibold text-[9px]">
                    GET
                  </span>
                </td>
                <td className="py-2.5 px-2.5 font-mono text-[#e3e2e6]">/api/loans/calculate-emi</td>
                <td className="py-2.5 px-2.5 font-mono text-[#b7c8e1]">LoanApplicationController.java</td>
                <td className="py-2.5 px-2.5">PermitAll</td>
                <td className="py-2.5 px-2.5 text-right">
                  {onAskAi && (
                    <button
                      onClick={() => onAskAi('Show EMI calculation formula')}
                      className="text-[#fbcfe8] hover:underline font-mono text-[10px] cursor-pointer"
                    >
                      Audit
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Suggested Architectural Refactoring */}
      <section className="bg-[#1a1b1e] border border-[#48454d]/25 rounded-xl p-5 shadow-sm flex flex-col gap-3">
        <h2 className="text-xs font-heading font-semibold text-[#e3e2e6] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#b7c8e1] text-[18px]">lightbulb</span>
          AI Architecture Recommendations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-[#1f1f23] rounded-lg border border-[#48454d]/20 flex flex-col gap-1">
            <span className="font-semibold text-xs text-[#e3e2e6]">Add OAuth2 Social Sign-In</span>
            <p className="text-[11px] text-[#cac5ce]">
              Integrate Google / GitHub OAuth alongside the existing JWT filter with custom OAuth2SuccessHandler.
            </p>
          </div>
          <div className="p-3 bg-[#1f1f23] rounded-lg border border-[#48454d]/20 flex flex-col gap-1">
            <span className="font-semibold text-xs text-[#e3e2e6]">Circuit Breaker for Credit Bureau API</span>
            <p className="text-[11px] text-[#cac5ce]">
              Wrap external HTTP calls in Resilience4j circuit breakers to provide graceful fallbacks during downtime.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
