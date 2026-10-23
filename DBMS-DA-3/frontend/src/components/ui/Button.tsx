import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  icon,
  iconRight,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-obsidian-950';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1.5 gap-1.5',
    sm: 'text-xs px-3 py-2 gap-2',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-glow-cyan focus:ring-cyan-500 active:scale-[0.98]',
    secondary: 'bg-obsidian-800 text-obsidian-200 border border-obsidian-700 hover:bg-obsidian-750 hover:border-obsidian-600 focus:ring-obsidian-500 active:scale-[0.98]',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:shadow-glow-emerald focus:ring-emerald-500 active:scale-[0.98]',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-400/50 hover:shadow-glow-rose focus:ring-rose-500 active:scale-[0.98]',
    ghost: 'bg-transparent text-obsidian-300 hover:bg-obsidian-800 hover:text-white focus:ring-obsidian-600',
    outline: 'bg-transparent text-obsidian-200 border border-obsidian-700 hover:border-cyan-500/40 hover:text-cyan-300 focus:ring-cyan-500',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!isLoading && iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
};
