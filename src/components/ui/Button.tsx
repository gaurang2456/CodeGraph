import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#fbcfe8]/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none rounded-xl cursor-pointer';

    const variants = {
      primary:
        'bg-[#fbcfe8] hover:bg-[#f9a8d4] text-[#3d1729] font-semibold shadow-sm border border-[#fbcfe8]/20',
      secondary:
        'bg-[#1f1f23] hover:bg-[#292a2d] text-[#e3e2e6] border border-[#48454d]/30 hover:border-[#fbcfe8]/30 shadow-sm',
      outline:
        'bg-transparent hover:bg-[#292a2d] text-[#cac5ce] hover:text-white border border-[#48454d]/30',
      ghost:
        'bg-transparent hover:bg-[#292a2d] text-[#938f98] hover:text-[#e3e2e6]',
      danger:
        'bg-[#93000a] hover:bg-red-700 text-[#ffdad6] border border-red-500/30'
    };

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
