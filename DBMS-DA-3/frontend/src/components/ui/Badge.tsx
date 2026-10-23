import React from 'react';
import clsx from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'slate',
  size = 'sm',
  dot = false,
  ...props
}) => {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-2',
  };

  const variantStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    slate: 'bg-obsidian-800 text-obsidian-300 border-obsidian-700',
  };

  const dotColors = {
    cyan: 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]',
    emerald: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
    amber: 'bg-amber-400 shadow-[0_0_6px_#f59e0b]',
    rose: 'bg-rose-400 shadow-[0_0_6px_#f43f5e]',
    violet: 'bg-violet-400 shadow-[0_0_6px_#8b5cf6]',
    slate: 'bg-obsidian-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full border tracking-wide select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full inline-block shrink-0', dotColors[variant])} />}
      <span>{children}</span>
    </span>
  );
};
