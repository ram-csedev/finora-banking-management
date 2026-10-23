import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  Landmark,
  Building2,
  UserCheck,
  Layers,
  Network,
  Database,
  Terminal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { CockroachDBHealth } from '../../types';

interface SidebarProps {
  health: CockroachDBHealth;
}

export const Sidebar: React.FC<SidebarProps> = ({ health }) => {
  const [collapsed, setCollapsed] = useState(false);

  const bankingNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/accounts', label: 'Accounts', icon: Wallet, badge: 'Joint' },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/loans', label: 'Loans & Credit', icon: Landmark },
    { to: '/branches', label: 'Branches', icon: Building2 },
    { to: '/employees', label: 'Employees & Duty', icon: UserCheck },
  ];

  const dbmsNav = [
    { to: '/showcase', label: 'Cockroach Showcase', icon: Layers, badge: 'NewSQL' },
    { to: '/schema', label: 'Schema Visualizer', icon: Network },
    { to: '/database', label: 'Database Catalog', icon: Database },
    { to: '/workbench', label: 'SQL Workbench', icon: Terminal, badge: 'Safe' },
  ];

  return (
    <aside
      className={clsx(
        'relative flex flex-col h-screen bg-obsidian-900 border-r border-obsidian-800 transition-all duration-300 z-30 select-none shrink-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-obsidian-800/80 gap-3 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 p-0.5 shadow-glow-cyan shrink-0">
            <div className="w-full h-full bg-obsidian-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-wide text-white leading-tight">
                FINORA <span className="text-cyan-400 font-mono text-sm">DA3</span>
              </span>
              <span className="text-[10px] tracking-wider text-obsidian-400 uppercase font-mono truncate">
                CockroachDB Engine
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Banking Operations Section */}
        <div>
          {!collapsed && (
            <h4 className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-obsidian-500 uppercase font-mono">
              Banking Operations
            </h4>
          )}
          <nav className="space-y-1">
            {bankingNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-glow-cyan/40'
                        : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/60'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-obsidian-800 text-obsidian-400 border border-obsidian-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Database Showcase Section */}
        <div>
          {!collapsed && (
            <h4 className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-obsidian-500 uppercase font-mono">
              DBMS Showcase
            </h4>
          )}
          <nav className="space-y-1">
            {dbmsNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30 shadow-glow-violet/40'
                        : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-800/60'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-950/60 text-violet-300 border border-violet-800/60">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Cluster Footer Card */}
      <div className="p-3 border-t border-obsidian-800/80 bg-obsidian-950/60">
        {!collapsed ? (
          <div className="rounded-xl p-3 bg-obsidian-900 border border-obsidian-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-obsidian-400 font-mono">Cluster</span>
              <span className="text-cyan-400 font-mono font-semibold">finora-da3</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-obsidian-400 font-mono">Region</span>
              <span className="text-obsidian-300 font-mono text-[11px]">AWS Mumbai</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-obsidian-400 font-mono">State</span>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold',
                  health.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    health.status === 'UP' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  )}
                />
                {health.status === 'UP' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Cluster: finora-da3 (AWS Mumbai)">
            <span
              className={clsx(
                'w-3 h-3 rounded-full',
                health.status === 'UP' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              )}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
