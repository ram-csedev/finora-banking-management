import React from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Globe, Clock, ShieldCheck, TerminalSquare, AlertOctagon } from 'lucide-react';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';
import { CockroachDBHealth } from '../../types';
import { useRaftSimulator } from '../../context/RaftSimulatorContext';

interface TopbarProps {
  health: CockroachDBHealth;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  health,
  onRefresh,
  isRefreshing = false,
}) => {
  const location = useLocation();

  const routeTitles: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Financial Command Center', subtitle: 'Real-time telemetry and overview across all banking operations' },
    '/customers': { title: 'Customer Management', subtitle: 'Individual profiles, contact records, and relationship officers' },
    '/accounts': { title: 'Accounts & Joint Ownership', subtitle: 'Checking, savings, and M:N joint account holder structure' },
    '/transactions': { title: 'Transactions & Transfers', subtitle: 'Atomic deposits, withdrawals, and bilateral fund transfers' },
    '/loans': { title: 'Lending & Credit Facilities', subtitle: 'Active loans, interest calculations, and repayment schedules' },
    '/branches': { title: 'Branch Network', subtitle: 'Physical branch locations, IFSC codes, and assets' },
    '/employees': { title: 'Staff & Operational Duties', subtitle: 'Employee hierarchy and responsible_for operational duty logs' },
    '/showcase': { title: 'CockroachDB Distributed Architecture', subtitle: 'Raft consensus, multi-region replication, and serializable isolation' },
    '/schema': { title: 'Interactive Schema Visualizer', subtitle: '14-table relational architecture, foreign keys, and indexes' },
    '/database': { title: 'Database Catalog Explorer', subtitle: 'Inspect CockroachDB information_schema and analytical views' },
    '/workbench': { title: 'Safe SQL Workbench', subtitle: 'Read-only queries with CockroachDB cost-based EXPLAIN plans' },
  };

  const { hasQuorum, activeNodesCount, resetRaftSim } = useRaftSimulator();

  const current = routeTitles[location.pathname] || {
    title: 'Finora DA3',
    subtitle: 'CockroachDB Banking Management System',
  };

  return (
    <header className="h-16 px-6 bg-obsidian-900/80 border-b border-obsidian-800/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Title & Subtitle */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
          {current.title}
        </h1>
        <p className="text-[11px] text-obsidian-400 truncate hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      {/* Telemetry Actions Strip */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Simulated Raft Quorum Loss Indicator */}
        {!hasQuorum && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Simulated Quorum Lost ({activeNodesCount}/3) — Writes Paused</span>
            <span className="sm:hidden font-bold">Sim Quorum Lost</span>
            <button
              onClick={resetRaftSim}
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold ml-1 cursor-pointer"
              title="Reset all 3 simulated nodes to online"
            >
              Reset
            </button>
          </div>
        )}

        {/* Region Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-obsidian-850 border border-obsidian-750 text-xs font-mono text-obsidian-300">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>ap-south-1</span>
          <span className="text-obsidian-500">•</span>
          <span className="text-[10px] text-obsidian-400">AWS Mumbai</span>
        </div>

        {/* Server Time */}
        {health.serverTime && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-obsidian-850 border border-obsidian-750 text-xs font-mono text-obsidian-300">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[11px]">
              {new Date(health.serverTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}

        {/* Live CockroachDB Health Indicator */}
        <StatusIndicator health={health} showDetails={true} />

        {/* Re-ping / Refresh Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />}
          title="Refresh cluster telemetry and backend health"
        >
          <span className="hidden md:inline">Ping Health</span>
        </Button>
      </div>
    </header>
  );
};
