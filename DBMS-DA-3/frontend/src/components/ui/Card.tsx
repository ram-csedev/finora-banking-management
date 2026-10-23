import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'none' | 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = 'none',
  hoverable = false,
  ...props
}) => {
  const glowStyles = {
    none: 'border-obsidian-700/60 shadow-card-dark',
    cyan: 'border-cyan-500/20 shadow-glow-cyan/50',
    emerald: 'border-emerald-500/20 shadow-glow-emerald/50',
    amber: 'border-amber-500/20 shadow-glow-amber/50',
    violet: 'border-violet-500/20 shadow-glow-violet/50',
    rose: 'border-rose-500/20 shadow-glow-rose/50',
  };

  const hoverStyle = hoverable
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-obsidian-600 hover:shadow-lg'
    : '';

  return (
    <div
      className={clsx(
        'relative rounded-xl bg-obsidian-850/90 border backdrop-blur-md overflow-hidden',
        glowStyles[glow],
        hoverStyle,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={clsx('px-6 py-5 border-b border-obsidian-800/80 flex items-center justify-between gap-4', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={clsx('text-base font-semibold text-white tracking-wide flex items-center gap-2', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => (
  <p className={clsx('text-xs text-obsidian-400 mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={clsx('px-6 py-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={clsx('px-6 py-4 bg-obsidian-900/50 border-t border-obsidian-800/80 flex items-center justify-between text-xs text-obsidian-400', className)}
    {...props}
  >
    {children}
  </div>
);
