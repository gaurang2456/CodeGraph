'use client';

import React from 'react';

export const FeatureCards: React.FC = () => {
  const features = [
    {
      title: 'Interactive Dependency Graph',
      description: 'Visualize controllers, services, repositories, and data stores with interactive SVG bezier paths and relationship inspectors.',
      icon: 'hub',
      color: 'text-[#fbcfe8]'
    },
    {
      title: 'Deep File & Code Explorer',
      description: 'Browse the entire directory tree with syntax-colored Java/Spring/YAML/XML code viewers and line-level navigation.',
      icon: 'folder_open',
      color: 'text-[#b7c8e1]'
    },
    {
      title: 'AI Architectural Assistant',
      description: 'Ask complex questions and receive structured step-by-step implementation plans with direct file citations.',
      icon: 'smart_toy',
      color: 'text-[#d7c3b6]'
    },
    {
      title: 'Structural Health Analysis',
      description: 'Inspect endpoints inventory, authentication strategy, caching layers, and potential architectural bottlenecks.',
      icon: 'insights',
      color: 'text-[#fbcfe8]'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {features.map((feature, i) => (
        <div
          key={i}
          className="bg-[#1a1b1e] rounded-2xl p-5 border border-[#48454d]/25 hover:border-[#fbcfe8]/40 transition-all group flex flex-col gap-3 shadow-md"
        >
          <div className={`w-10 h-10 rounded-xl bg-[#292a2d] flex items-center justify-center ${feature.color}`}>
            <span className="material-symbols-outlined text-[22px]">{feature.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-heading font-semibold text-[#e3e2e6] group-hover:text-[#fbcfe8] transition-colors">
              {feature.title}
            </h3>
            <p className="text-xs text-[#cac5ce] mt-1.5 leading-relaxed">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
