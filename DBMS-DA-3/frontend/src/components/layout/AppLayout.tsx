import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { api } from '../../api/client';
import { CockroachDBHealth } from '../../types';
import { AlertTriangle, ServerOff } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<CockroachDBHealth>({
    status: 'CONNECTING',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getHealth();
      if (data && data.cockroachDB) {
        setHealth(data.cockroachDB);
        setConnectionError(null);
      } else {
        setHealth({ status: 'DOWN' });
        setConnectionError('Backend response did not contain CockroachDB status');
      }
    } catch (err: any) {
      setHealth({ status: 'DOWN' });
      setConnectionError(
        err.message || 'Unable to connect to Node.js backend. Ensure backend is running on port 5000.'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Heartbeat every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="flex h-screen bg-obsidian-950 text-obsidian-100 overflow-hidden font-sans">
      {/* Collapsible Navigation Sidebar */}
      <Sidebar health={health} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Header Topbar */}
        <Topbar
          health={health}
          onRefresh={fetchHealth}
          isRefreshing={isRefreshing}
        />

        {/* Offline Warning Banner if connection drops */}
        {connectionError && (
          <div className="bg-rose-950/40 border-b border-rose-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <ServerOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Backend Communication Offline:</strong> {connectionError}
              </span>
            </div>
            <button
              onClick={fetchHealth}
              className="text-cyan-400 underline hover:text-cyan-300 font-mono text-[11px]"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 tech-grid-bg">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet context={{ health, refreshHealth: fetchHealth }} />
          </div>
        </main>
      </div>
    </div>
  );
};
