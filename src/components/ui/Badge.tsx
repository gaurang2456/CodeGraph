import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pink' | 'success' | 'warning' | 'info' | 'slate' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variants = {
    default: 'bg-[#1f1f23] text-[#e3e2e6] border-[#48454d]/30',
    pink: 'bg-[#fbcfe8]/10 text-[#fbcfe8] border-[#fbcfe8]/20',
    slate: 'bg-[#3a4a5f]/30 text-[#b7c8e1] border-[#b7c8e1]/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    info: 'bg-[#b7c8e1]/10 text-[#b7c8e1] border-[#b7c8e1]/30',
    outline: 'bg-transparent text-[#938f98] border-[#48454d]/30'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-mono',
    md: 'px-2.5 py-1 text-xs'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border transition-colors',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
