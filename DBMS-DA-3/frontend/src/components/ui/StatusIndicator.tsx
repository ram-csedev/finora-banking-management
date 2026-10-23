import React from 'react';
import clsx from 'clsx';
import { Database, ShieldCheck, AlertCircle } from 'lucide-react';
import { CockroachDBHealth } from '../../types';

export interface StatusIndicatorProps {
  health: CockroachDBHealth;
  showDetails?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  health,
  showDetails = false,
  className,
}) => {
  const isUp = health.status === 'UP';
  const isConnecting = health.status === 'CONNECTING';

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-300',
        isUp
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_-2px_rgba(16,185,129,0.2)]'
          : isConnecting
          ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          : 'bg-rose-950/40 border-rose-500/30 text-rose-300 shadow-[0_0_12px_-2px_rgba(244,63,94,0.2)]',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={clsx(
            'w-2 h-2 rounded-full inline-block',
            isUp ? 'bg-emerald-400' : isConnecting ? 'bg-amber-400' : 'bg-rose-500'
          )}
        />
        {isUp && (
          <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/40 animate-ping" />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5 opacity-80" />
        <span className="font-semibold uppercase tracking-wider">
          {health.status === 'UP' ? 'CockroachDB UP' : health.status}
        </span>
      </div>

      {showDetails && health.database && (
        <>
          <span className="text-obsidian-600">|</span>
          <span className="text-obsidian-400">{health.database}</span>
          {health.ssl && (
            <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/20">
              <ShieldCheck className="w-3 h-3" />
              TLS
            </span>
          )}
        </>
      )}
    </div>
  );
};
