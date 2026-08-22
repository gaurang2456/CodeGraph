import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 - 100
  barClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className,
  barClassName,
  ...props
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className={cn(
        'w-full bg-[#121316] rounded-full h-2 overflow-hidden border border-[#48454d]/30',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full bg-gradient-to-r from-[#70485c] via-[#fbcfe8] to-[#f9a8d4] rounded-full transition-all duration-300 ease-out',
          barClassName
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
