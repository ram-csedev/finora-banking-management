import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, registerRaftQuorumChecker } from '../api/client';

export interface RaftSimulatorContextType {
  node1Up: boolean;
  node2Up: boolean;
  node3Up: boolean;
  raftLeader: number;
  raftLog: string[];
  activeNodesCount: number;
  hasQuorum: boolean;
  toggleNode: (nodeNum: number) => void;
  resetRaftSim: () => void;
}

const STORAGE_KEY = 'finora_raft_simulator_state';

const defaultState = {
  node1Up: true,
  node2Up: true,
  node3Up: true,
  raftLeader: 1,
  raftLog: [
    'Cluster initialized: 3 nodes active with Multi-Raft consensus.',
    'Node 1 elected Raft Leader & Leaseholder (term 1).'
  ]
};

const RaftSimulatorContext = createContext<RaftSimulatorContextType | undefined>(undefined);

export const RaftSimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from sessionStorage or fallback to default
  const [state, setState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.node1Up === 'boolean' &&
          typeof parsed.node2Up === 'boolean' &&
          typeof parsed.node3Up === 'boolean'
        ) {
          return {
            node1Up: parsed.node1Up,
            node2Up: parsed.node2Up,
            node3Up: parsed.node3Up,
            raftLeader: typeof parsed.raftLeader === 'number' ? parsed.raftLeader : 1,
            raftLog: Array.isArray(parsed.raftLog) ? parsed.raftLog : defaultState.raftLog
          };
        }
      }
    } catch {}
    return defaultState;
  });

  const { node1Up, node2Up, node3Up, raftLeader, raftLog } = state;

  const activeNodesCount = (node1Up ? 1 : 0) + (node2Up ? 1 : 0) + (node3Up ? 1 : 0);
  const hasQuorum = activeNodesCount >= 2;

  // Register quorum checker with api client for write gating
  useEffect(() => {
    registerRaftQuorumChecker(() => ({
      hasQuorum,
      activeNodesCount
    }));
  }, [hasQuorum, activeNodesCount]);

  // Persist to sessionStorage on state change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Sync to backend on mount & state change
  useEffect(() => {
    api.updateRaftState({
      node1Up,
      node2Up,
      node3Up,
      raftLeader
    }).catch(() => {
      // Backend may be starting or offline; local state still acts as primary gate
    });
  }, [node1Up, node2Up, node3Up, raftLeader]);

  const toggleNode = useCallback((nodeNum: number) => {
    setState((prev) => {
      const timestamp = new Date().toLocaleTimeString();
      let nextN1 = prev.node1Up;
      let nextN2 = prev.node2Up;
      let nextN3 = prev.node3Up;

      if (nodeNum === 1) nextN1 = !prev.node1Up;
      else if (nodeNum === 2) nextN2 = !prev.node2Up;
      else if (nodeNum === 3) nextN3 = !prev.node3Up;

      const isNowUp = nodeNum === 1 ? nextN1 : (nodeNum === 2 ? nextN2 : nextN3);
      const remainingCount = (nextN1 ? 1 : 0) + (nextN2 ? 1 : 0) + (nextN3 ? 1 : 0);
      const newHasQuorum = remainingCount >= 2;

      let newLeader = prev.raftLeader;
      const newLogs: string[] = [];

      if (!isNowUp) {
        // Node went offline
        const logMsg = `[${timestamp}] Node ${nodeNum} stopped! Heartbeats timed out.`;
        if (newHasQuorum) {
          if (nodeNum === prev.raftLeader) {
            // Elect replacement leader
            if (nextN1) newLeader = 1;
            else if (nextN2) newLeader = 2;
            else if (nextN3) newLeader = 3;
            else newLeader = 0;

            newLogs.push(`[${timestamp}] Quorum maintained (${remainingCount}/3). New Leader elected: Node ${newLeader}.`);
          } else {
            newLogs.push(`[${timestamp}] Quorum healthy (${remainingCount}/3). Leader remains Node ${prev.raftLeader}.`);
          }
          newLogs.push(logMsg);
        } else {
          // Quorum lost
          newLeader = 0;
          newLogs.push(`[${timestamp}] CRITICAL: Quorum lost (${remainingCount}/3 < 2). CockroachDB stalls writes to preserve safety.`);
          newLogs.push(logMsg);
        }
      } else {
        // Node recovered
        newLogs.push(`[${timestamp}] Node ${nodeNum} recovered and re-joined. Catching up via Raft log replay.`);
        if (newLeader === 0 && newHasQuorum) {
          if (nextN1) newLeader = 1;
          else if (nextN2) newLeader = 2;
          else newLeader = 3;
          newLogs.push(`[${timestamp}] Quorum restored (${remainingCount}/3). Leader elected: Node ${newLeader}.`);
        }
      }

      return {
        node1Up: nextN1,
        node2Up: nextN2,
        node3Up: nextN3,
        raftLeader: newLeader,
        raftLog: [...newLogs, ...prev.raftLog.slice(0, 5)]
      };
    });
  }, []);

  const resetRaftSim = useCallback(() => {
    setState(defaultState);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    } catch {}
    api.resetRaftState().catch(() => {});
  }, []);

  return (
    <RaftSimulatorContext.Provider
      value={{
        node1Up,
        node2Up,
        node3Up,
        raftLeader,
        raftLog,
        activeNodesCount,
        hasQuorum,
        toggleNode,
        resetRaftSim
      }}
    >
      {children}
    </RaftSimulatorContext.Provider>
  );
};

export const useRaftSimulator = (): RaftSimulatorContextType => {
  const context = useContext(RaftSimulatorContext);
  if (!context) {
    throw new Error('useRaftSimulator must be used within a RaftSimulatorProvider');
  }
  return context;
};
