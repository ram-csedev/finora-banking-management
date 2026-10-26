import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, registerRaftQuorumChecker } from '../api/client';

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'RECOVERING';
export type ReplicationStatus = 'IN_SYNC' | 'CATCHING_UP' | 'STALLED';

export interface HostedReplica {
  rangeId: string;
  rangeName: string;
  role: 'LEADER' | 'FOLLOWER';
}

export interface SimulatedNode {
  id: number;
  name: string;
  status: NodeStatus;
  logProgress: ReplicationStatus;
  hostedReplicas: HostedReplica[];
}

export type RangeQuorumStatus = 'QUORUM_HEALTHY' | 'LEADER_ELECTION' | 'QUORUM_LOST';
export type RangeWriteStatus = 'WRITES_AVAILABLE' | 'WRITES_BLOCKED';

export interface SimulatedRange {
  id: string; // 'range-1', 'range-2'
  name: string; // 'Range 1', 'Range 2'
  keySpan: string; // '[ -∞, +∞ )', '[ -∞, 100500 )', '[ 100500, +∞ )'
  sizeMb: number; // 24, 32
  splitStatus: 'UNSPLIT' | 'SPLIT_CHILD';
  replicas: number[]; // e.g. [1, 2, 3]
  leaderNodeId: number | null; // e.g. 1, 2, 3 or null
  quorumStatus: RangeQuorumStatus;
  writeStatus: RangeWriteStatus;
  activeReplicasCount: number;
  totalReplicasCount: number;
  votingReplicas: number[];
}

export interface RaftSimulatorContextType {
  // Backward-compatible individual node booleans
  node1Up: boolean;
  node2Up: boolean;
  node3Up: boolean;
  raftLeader: number;
  raftLog: string[];
  activeNodesCount: number;
  hasQuorum: boolean;

  // Rich cluster state
  nodes: SimulatedNode[];
  ranges: SimulatedRange[];
  rangeSizeMb: number;
  splitHappened: boolean;
  recoveringNodeId: number | null;

  // Actions
  toggleNode: (nodeNum: number) => void;
  ingestRangeData: () => void;
  resetRaftSim: () => void;
  resetRangeSim: () => void;
  resetAllSims: () => void;
}

const STORAGE_KEY = 'finora_raft_simulator_state_v2';

interface InternalClusterState {
  nodes: SimulatedNode[];
  ranges: SimulatedRange[];
  rangeSizeMb: number;
  splitHappened: boolean;
  raftLog: string[];
}

// Initial pristine state
function createDefaultClusterState(): InternalClusterState {
  const nodes: SimulatedNode[] = [
    {
      id: 1,
      name: 'Node 1',
      status: 'ONLINE',
      logProgress: 'IN_SYNC',
      hostedReplicas: [{ rangeId: 'range-1', rangeName: 'Range 1', role: 'LEADER' }],
    },
    {
      id: 2,
      name: 'Node 2',
      status: 'ONLINE',
      logProgress: 'IN_SYNC',
      hostedReplicas: [{ rangeId: 'range-1', rangeName: 'Range 1', role: 'FOLLOWER' }],
    },
    {
      id: 3,
      name: 'Node 3',
      status: 'ONLINE',
      logProgress: 'IN_SYNC',
      hostedReplicas: [{ rangeId: 'range-1', rangeName: 'Range 1', role: 'FOLLOWER' }],
    },
  ];

  const ranges: SimulatedRange[] = [
    {
      id: 'range-1',
      name: 'Range 1',
      keySpan: '[ -∞, +∞ )',
      sizeMb: 24,
      splitStatus: 'UNSPLIT',
      replicas: [1, 2, 3],
      leaderNodeId: 1,
      quorumStatus: 'QUORUM_HEALTHY',
      writeStatus: 'WRITES_AVAILABLE',
      activeReplicasCount: 3,
      totalReplicasCount: 3,
      votingReplicas: [1, 2, 3],
    },
  ];

  return {
    nodes,
    ranges,
    rangeSizeMb: 24,
    splitHappened: false,
    raftLog: [
      'Cluster initialized: 3 nodes active with Multi-Raft consensus.',
      'Range 1 [-∞, +∞) replicated across Nodes 1, 2, 3. Node 1 is Raft Leader & Leaseholder.',
    ],
  };
}

const RaftSimulatorContext = createContext<RaftSimulatorContextType | undefined>(undefined);

export const RaftSimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from sessionStorage or fallback to default
  const [clusterState, setClusterState] = useState<InternalClusterState>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.ranges)) {
          return {
            nodes: parsed.nodes,
            ranges: parsed.ranges,
            rangeSizeMb: typeof parsed.rangeSizeMb === 'number' ? parsed.rangeSizeMb : 24,
            splitHappened: Boolean(parsed.splitHappened),
            raftLog: Array.isArray(parsed.raftLog) ? parsed.raftLog : createDefaultClusterState().raftLog,
          };
        }
      }
    } catch {}
    return createDefaultClusterState();
  });

  const [recoveringNodeId, setRecoveringNodeId] = useState<number | null>(null);
  const recoveryTimerRef = useRef<any>(null);

  const { nodes, ranges, rangeSizeMb, splitHappened, raftLog } = clusterState;

  // Derived convenience flags
  const node1 = nodes.find((n) => n.id === 1);
  const node2 = nodes.find((n) => n.id === 2);
  const node3 = nodes.find((n) => n.id === 3);

  const node1Up = node1?.status === 'ONLINE';
  const node2Up = node2?.status === 'ONLINE';
  const node3Up = node3?.status === 'ONLINE';

  // Total active voting nodes count
  const activeNodesCount = nodes.filter((n) => n.status === 'ONLINE').length;

  // Check if every range currently has healthy quorum
  const allRangesHaveQuorum = ranges.length > 0 && ranges.every((r) => r.quorumStatus === 'QUORUM_HEALTHY');
  const hasQuorum = allRangesHaveQuorum && activeNodesCount >= 2;

  // Primary leader (for backward compatibility, leader of Range 1)
  const range1 = ranges.find((r) => r.id === 'range-1');
  const raftLeader = range1?.leaderNodeId ?? (node1Up ? 1 : node2Up ? 2 : node3Up ? 3 : 0);

  // Register quorum checker with api client for write gating
  useEffect(() => {
    registerRaftQuorumChecker(() => ({
      hasQuorum,
      activeNodesCount,
    }));
  }, [hasQuorum, activeNodesCount]);

  // Persist cluster state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clusterState));
    } catch {}
  }, [clusterState]);

  // Sync to backend on mount & state change
  useEffect(() => {
    api.updateRaftState({
      node1Up,
      node2Up,
      node3Up,
      raftLeader,
    }).catch(() => {
      // Backend may be starting; local state still acts as primary gate
    });
  }, [node1Up, node2Up, node3Up, raftLeader]);

  // Clean up recovery timer on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  /**
   * Helper: Given node statuses and ranges, evaluate per-range quorum, leader elections, and node hosted replicas
   */
  const evaluateCluster = useCallback(
    (
      currentNodes: SimulatedNode[],
      currentRanges: SimulatedRange[],
      split: boolean,
      size: number
    ): { updatedNodes: SimulatedNode[]; updatedRanges: SimulatedRange[] } => {
      // 1. Evaluate each range
      const updatedRanges: SimulatedRange[] = currentRanges.map((range) => {
        // Find which replicas are on ONLINE nodes
        const votingReplicas = range.replicas.filter(
          (nid) => currentNodes.find((n) => n.id === nid)?.status === 'ONLINE'
        );
        const activeCount = votingReplicas.length;
        const totalCount = range.replicas.length;
        const quorumNeeded = Math.floor(totalCount / 2) + 1; // 2 of 3
        const hasRangeQuorum = activeCount >= quorumNeeded;

        let leaderId = range.leaderNodeId;

        if (!hasRangeQuorum) {
          // Loss of quorum: leader cannot act, writes are blocked
          leaderId = null;
          return {
            ...range,
            sizeMb: split ? 32 : size,
            activeReplicasCount: activeCount,
            totalReplicasCount: totalCount,
            votingReplicas,
            leaderNodeId: null,
            quorumStatus: 'QUORUM_LOST',
            writeStatus: 'WRITES_BLOCKED',
          };
        }

        // Has quorum: Check if existing leader is still online and in voting replicas
        const currentLeaderIsOnline = leaderId !== null && votingReplicas.includes(leaderId);

        if (currentLeaderIsOnline) {
          // Existing leader remains in place!
          return {
            ...range,
            sizeMb: split ? 32 : size,
            activeReplicasCount: activeCount,
            totalReplicasCount: totalCount,
            votingReplicas,
            leaderNodeId: leaderId,
            quorumStatus: 'QUORUM_HEALTHY',
            writeStatus: 'WRITES_AVAILABLE',
          };
        }

        // Leader was offline or null: Elect a new leader from available voting replicas
        // Deterministic election priority:
        // Range 1 prefers Node 1, then Node 2, then Node 3
        // Range 2 prefers Node 2, then Node 3, then Node 1
        let newLeader: number | null = null;
        if (range.id === 'range-2') {
          if (votingReplicas.includes(2)) newLeader = 2;
          else if (votingReplicas.includes(3)) newLeader = 3;
          else if (votingReplicas.includes(1)) newLeader = 1;
        } else {
          if (votingReplicas.includes(1)) newLeader = 1;
          else if (votingReplicas.includes(2)) newLeader = 2;
          else if (votingReplicas.includes(3)) newLeader = 3;
        }

        return {
          ...range,
          sizeMb: split ? 32 : size,
          activeReplicasCount: activeCount,
          totalReplicasCount: totalCount,
          votingReplicas,
          leaderNodeId: newLeader,
          quorumStatus: 'QUORUM_HEALTHY',
          writeStatus: 'WRITES_AVAILABLE',
        };
      });

      // 2. Map hosted replicas onto each node based on range leadership
      const updatedNodes: SimulatedNode[] = currentNodes.map((node) => {
        const hosted: HostedReplica[] = [];
        for (const range of updatedRanges) {
          if (range.replicas.includes(node.id)) {
            const isLeader = range.leaderNodeId === node.id && node.status === 'ONLINE';
            hosted.push({
              rangeId: range.id,
              rangeName: range.name,
              role: isLeader ? 'LEADER' : 'FOLLOWER',
            });
          }
        }
        return {
          ...node,
          hostedReplicas: hosted,
        };
      });

      return { updatedNodes, updatedRanges };
    },
    []
  );

  /**
   * Toggle Node Online / Offline / Recovery
   */
  const toggleNode = useCallback(
    (nodeNum: number) => {
      const timestamp = new Date().toLocaleTimeString();

      setClusterState((prev) => {
        const targetNode = prev.nodes.find((n) => n.id === nodeNum);
        if (!targetNode) return prev;

        const isCurrentlyUp = targetNode.status === 'ONLINE';
        const newLogs: string[] = [];

        if (isCurrentlyUp) {
          // Node is being KILLED (Transition ONLINE -> OFFLINE)
          const updatedNodes = prev.nodes.map((n) =>
            n.id === nodeNum
              ? { ...n, status: 'OFFLINE' as NodeStatus, logProgress: 'STALLED' as ReplicationStatus }
              : n
          );

          // Evaluate ranges with this node down
          const { updatedNodes: finalNodes, updatedRanges: finalRanges } = evaluateCluster(
            updatedNodes,
            prev.ranges,
            prev.splitHappened,
            prev.rangeSizeMb
          );

          // Build educational event log messages
          const survivingNodeIds = finalNodes.filter((n) => n.status === 'ONLINE').map((n) => `Node ${n.id}`);
          const totalOnline = survivingNodeIds.length;

          newLogs.push(`[${timestamp}] Node ${nodeNum} stopped! Heartbeats timed out.`);

          // Analyze impact on each range
          for (const oldRange of prev.ranges) {
            const newRange = finalRanges.find((r) => r.id === oldRange.id);
            if (!newRange) continue;

            const wasLeader = oldRange.leaderNodeId === nodeNum;

            if (newRange.quorumStatus === 'QUORUM_LOST') {
              newLogs.push(
                `[${timestamp}] ${newRange.name} has only ${newRange.activeReplicasCount} of ${newRange.totalReplicasCount} replicas available. Quorum lost; writes are blocked!`
              );
            } else if (wasLeader) {
              newLogs.push(
                `[${timestamp}] ${newRange.name} leader (Node ${nodeNum}) became unavailable. Surviving replicas (${survivingNodeIds.join(
                  ', '
                )}) retain quorum (${newRange.activeReplicasCount}/${newRange.totalReplicasCount}). Node ${
                  newRange.leaderNodeId
                } elected new Raft Leader & Leaseholder.`
              );
            } else {
              newLogs.push(
                `[${timestamp}] Node ${nodeNum} stopped. ${newRange.name} retains ${newRange.activeReplicasCount} of ${
                  newRange.totalReplicasCount
                } replicas; leader Node ${newRange.leaderNodeId} remains active. Quorum healthy; writes available.`
              );
            }
          }

          if (totalOnline < 2) {
            newLogs.push(
              `[${timestamp}] CRITICAL: Cluster lost majority quorum (${totalOnline}/3 < 2). CockroachDB write gate stalls all state-changing operations to preserve safety.`
            );
          }

          return {
            ...prev,
            nodes: finalNodes,
            ranges: finalRanges,
            raftLog: [...newLogs, ...prev.raftLog.slice(0, 7)],
          };
        } else {
          // Node is being RESTARTED (Transition OFFLINE -> RECOVERING -> ONLINE)
          const recoveringNodes = prev.nodes.map((n) =>
            n.id === nodeNum
              ? { ...n, status: 'RECOVERING' as NodeStatus, logProgress: 'CATCHING_UP' as ReplicationStatus }
              : n
          );

          setRecoveringNodeId(nodeNum);
          newLogs.push(
            `[${timestamp}] Node ${nodeNum} restarted. Status: RECOVERING. Its replicas are catching up with committed entries via Raft log replay.`
          );

          // Schedule auto-completion of recovery after 1.4 seconds
          if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
          recoveryTimerRef.current = setTimeout(() => {
            const finishTime = new Date().toLocaleTimeString();
            setClusterState((latest) => {
              const fullyRecoveredNodes = latest.nodes.map((n) =>
                n.id === nodeNum
                  ? { ...n, status: 'ONLINE' as NodeStatus, logProgress: 'IN_SYNC' as ReplicationStatus }
                  : n
              );

              const { updatedNodes: finalNodes, updatedRanges: finalRanges } = evaluateCluster(
                fullyRecoveredNodes,
                latest.ranges,
                latest.splitHappened,
                latest.rangeSizeMb
              );

              const recoveryLogs: string[] = [
                `[${finishTime}] Node ${nodeNum} replication log replay complete. Node is ONLINE and in sync. Re-joined Raft groups as active voting replica.`,
              ];

              for (const range of finalRanges) {
                if (range.quorumStatus === 'QUORUM_HEALTHY') {
                  recoveryLogs.push(
                    `[${finishTime}] ${range.name} quorum healthy (${range.activeReplicasCount}/${range.totalReplicasCount} replicas active). Leader: Node ${range.leaderNodeId}; writes available.`
                  );
                }
              }

              return {
                ...latest,
                nodes: finalNodes,
                ranges: finalRanges,
                raftLog: [...recoveryLogs, ...latest.raftLog.slice(0, 7)],
              };
            });
            setRecoveringNodeId(null);
          }, 1400);

          // Return interim recovering state immediately
          const { updatedNodes: interimNodes, updatedRanges: interimRanges } = evaluateCluster(
            recoveringNodes,
            prev.ranges,
            prev.splitHappened,
            prev.rangeSizeMb
          );

          return {
            ...prev,
            nodes: interimNodes,
            ranges: interimRanges,
            raftLog: [...newLogs, ...prev.raftLog.slice(0, 7)],
          };
        }
      });
    },
    [evaluateCluster]
  );

  /**
   * Ingest Batch (+20 MB) & Auto-Split at 64MB
   */
  const ingestRangeData = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();

    setClusterState((prev) => {
      if (prev.splitHappened) return prev;

      const nextSize = prev.rangeSizeMb + 20;
      const newLogs: string[] = [];

      if (nextSize < 64) {
        // Growth before split threshold
        newLogs.push(
          `[${timestamp}] Ingested batch (+20 MB rows). Range 1 key-range size increased to ${nextSize} MB / 64 MB split threshold.`
        );

        const updatedRanges = prev.ranges.map((r) => ({ ...r, sizeMb: nextSize }));
        return {
          ...prev,
          rangeSizeMb: nextSize,
          ranges: updatedRanges,
          raftLog: [...newLogs, ...prev.raftLog.slice(0, 7)],
        };
      }

      // Reached 64 MB: Execute automatic range split!
      newLogs.push(
        `[${timestamp}] Range 1 reached 64 MB threshold! CockroachDB executed auto-split at key boundary 100500.`
      );
      newLogs.push(
        `[${timestamp}] Auto-split created two sibling ranges: Range 1 [-∞, 100500) (32 MB, Leader: Node 1) and Range 2 [100500, +∞) (32 MB, Leader: Node 2).`
      );
      newLogs.push(
        `[${timestamp}] Note: Splitting key spans and moving replicas are separate operations. Both ranges initially replicate across Nodes 1, 2, 3 with independent Raft groups.`
      );

      // Create Range 1 and Range 2
      const candidateRanges: SimulatedRange[] = [
        {
          id: 'range-1',
          name: 'Range 1',
          keySpan: '[ -∞, 100500 )',
          sizeMb: 32,
          splitStatus: 'SPLIT_CHILD',
          replicas: [1, 2, 3],
          leaderNodeId: 1,
          quorumStatus: 'QUORUM_HEALTHY',
          writeStatus: 'WRITES_AVAILABLE',
          activeReplicasCount: 3,
          totalReplicasCount: 3,
          votingReplicas: [1, 2, 3],
        },
        {
          id: 'range-2',
          name: 'Range 2',
          keySpan: '[ 100500, +∞ )',
          sizeMb: 32,
          splitStatus: 'SPLIT_CHILD',
          replicas: [1, 2, 3],
          leaderNodeId: 2,
          quorumStatus: 'QUORUM_HEALTHY',
          writeStatus: 'WRITES_AVAILABLE',
          activeReplicasCount: 3,
          totalReplicasCount: 3,
          votingReplicas: [1, 2, 3],
        },
      ];

      // Evaluate according to current node online/offline states
      const { updatedNodes, updatedRanges } = evaluateCluster(
        prev.nodes,
        candidateRanges,
        true,
        64
      );

      return {
        ...prev,
        rangeSizeMb: 64,
        splitHappened: true,
        nodes: updatedNodes,
        ranges: updatedRanges,
        raftLog: [...newLogs, ...prev.raftLog.slice(0, 7)],
      };
    });
  }, [evaluateCluster]);

  /**
   * Reset Cluster Nodes to Online
   */
  const resetRaftSim = useCallback(() => {
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    setRecoveringNodeId(null);
    const timestamp = new Date().toLocaleTimeString();

    setClusterState((prev) => {
      const restoredNodes: SimulatedNode[] = prev.nodes.map((n) => ({
        ...n,
        status: 'ONLINE' as NodeStatus,
        logProgress: 'IN_SYNC' as ReplicationStatus,
      }));

      const { updatedNodes, updatedRanges } = evaluateCluster(
        restoredNodes,
        prev.ranges,
        prev.splitHappened,
        prev.rangeSizeMb
      );

      const resetLog = [
        `[${timestamp}] Reset Cluster: All 3 nodes restored to ONLINE and in sync. Quorum fully satisfied across all ranges.`,
      ];

      return {
        ...prev,
        nodes: updatedNodes,
        ranges: updatedRanges,
        raftLog: [...resetLog, ...prev.raftLog.slice(0, 7)],
      };
    });

    api.resetRaftState().catch(() => {});
  }, [evaluateCluster]);

  /**
   * Reset Range Simulation to initial unsplit 24 MB range
   */
  const resetRangeSim = useCallback(() => {
    const timestamp = new Date().toLocaleTimeString();

    setClusterState((prev) => {
      const unsplitRanges: SimulatedRange[] = [
        {
          id: 'range-1',
          name: 'Range 1',
          keySpan: '[ -∞, +∞ )',
          sizeMb: 24,
          splitStatus: 'UNSPLIT',
          replicas: [1, 2, 3],
          leaderNodeId: 1,
          quorumStatus: 'QUORUM_HEALTHY',
          writeStatus: 'WRITES_AVAILABLE',
          activeReplicasCount: 3,
          totalReplicasCount: 3,
          votingReplicas: [1, 2, 3],
        },
      ];

      const { updatedNodes, updatedRanges } = evaluateCluster(
        prev.nodes,
        unsplitRanges,
        false,
        24
      );

      const resetLog = [
        `[${timestamp}] Reset Range: Reverted partitioned ranges to single initial 24 MB range [-∞, +∞).`,
      ];

      return {
        ...prev,
        rangeSizeMb: 24,
        splitHappened: false,
        nodes: updatedNodes,
        ranges: updatedRanges,
        raftLog: [...resetLog, ...prev.raftLog.slice(0, 7)],
      };
    });
  }, [evaluateCluster]);

  /**
   * Reset All Simulations to complete pristine state
   */
  const resetAllSims = useCallback(() => {
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    setRecoveringNodeId(null);

    const pristine = createDefaultClusterState();
    setClusterState(pristine);

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pristine));
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
        nodes,
        ranges,
        rangeSizeMb,
        splitHappened,
        recoveringNodeId,
        toggleNode,
        ingestRangeData,
        resetRaftSim,
        resetRangeSim,
        resetAllSims,
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
