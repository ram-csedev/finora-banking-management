import React from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-obsidian-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-obsidian-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3.5 py-2 text-sm text-obsidian-100 placeholder-obsidian-500 transition-all duration-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const SearchInput: React.FC<InputProps> = (props) => (
  <Input
    icon={<Search className="w-4 h-4 text-obsidian-400" />}
    placeholder="Search records, accounts, or IDs..."
    {...props}
  />
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-obsidian-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full bg-obsidian-900 border border-obsidian-750 rounded-lg px-3.5 py-2 text-sm text-obsidian-100 transition-all duration-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 disabled:opacity-50',
            error && 'border-rose-500',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
