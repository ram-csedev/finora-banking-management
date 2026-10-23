import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';

export interface MetricTileProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
  className?: string;
  isLoading?: boolean;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  variant = 'cyan',
  className,
  isLoading = false,
}) => {
  const iconBgStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 group-hover:border-cyan-400/60 shadow-[0_0_15px_-4px_rgba(6,182,212,0.3)]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 group-hover:border-emerald-400/60 shadow-[0_0_15px_-4px_rgba(16,185,129,0.3)]',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30 group-hover:border-amber-400/60 shadow-[0_0_15px_-4px_rgba(245,158,11,0.3)]',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/30 group-hover:border-violet-400/60 shadow-[0_0_15px_-4px_rgba(139,92,246,0.3)]',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30 group-hover:border-rose-400/60 shadow-[0_0_15px_-4px_rgba(244,63,94,0.3)]',
  };

  const accentBorderStyles = {
    cyan: 'hover:border-cyan-500/40',
    emerald: 'hover:border-emerald-500/40',
    amber: 'hover:border-amber-500/40',
    violet: 'hover:border-violet-500/40',
    rose: 'hover:border-rose-500/40',
  };

  return (
    <Card
      hoverable
      className={clsx(
        'group transition-all duration-300',
        accentBorderStyles[variant],
        className
      )}
    >
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-obsidian-400 tracking-wider uppercase">
            {label}
          </p>
          <div className="space-y-1">
            {isLoading ? (
              <div className="h-8 w-24 bg-obsidian-800 animate-pulse rounded" />
            ) : (
              <h4 className="text-2xl font-bold font-mono tracking-tight text-white">
                {value}
              </h4>
            )}
            {subValue && (
              <p className="text-xs text-obsidian-400 font-normal">
                {subValue}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300',
              iconBgStyles[variant]
            )}
          >
            {icon}
          </div>

          {trend && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full border',
                trend.positive !== false
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              )}
            >
              {trend.positive !== false ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
