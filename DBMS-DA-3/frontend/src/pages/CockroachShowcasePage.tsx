import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  Zap,
  Database,
  GitBranch,
  RefreshCw,
  Cpu,
  Server,
  Activity,
  Lock,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Split,
  ChevronRight,
  Sparkles,
  Info,
  Crown,
  Radio,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { HealthResponse } from '../types';
import { useRaftSimulator } from '../context/RaftSimulatorContext';

export const CockroachShowcasePage: React.FC = () => {
  // Live cluster health state
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Active Interactive Simulator Tab
  const [activeSim, setActiveSim] = useState<'raft' | 'range' | 'serializable'>('raft');

  // Shared Architectural Simulator Context (persists across navigation)
  const {
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
  } = useRaftSimulator();

  // Simulator 3: Serializable SSI & 40001 Retry State
  const [ssiStep, setSsiStep] = useState<number>(0);
  const [ssiAutoPlay, setSsiAutoPlay] = useState<boolean>(false);

  // Fetch Live Telemetry
  useEffect(() => {
    let isMounted = true;
    setLoadingHealth(true);
    api.getHealth()
      .then((data) => {
        if (isMounted) setHealth(data);
      })
      .catch((err) => console.error('Failed to fetch cluster health:', err))
      .finally(() => {
        if (isMounted) setLoadingHealth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Simulator 3: SSI Steps Walkthrough
  const ssiSteps = [
    {
      title: 'Step 0: Initial State',
      desc: 'Account ACC-101 has an initial balance of ₹50,000.00. Two clients initiate concurrent debit transactions.',
      status: 'idle',
      accBalance: '₹50,000.00',
      txAState: 'Idle',
      txBState: 'Idle',
    },
    {
      title: 'Step 1: Concurrent Snapshot Reads',
      desc: 'Transaction A (withdrawal ₹15,000) and Transaction B (withdrawal ₹10,000) both issue SELECT balance from CockroachDB at MVCC read timestamp T1.',
      status: 'active',
      accBalance: '₹50,000.00',
      txAState: 'Read balance = ₹50,000.00 (T1)',
      txBState: 'Read balance = ₹50,000.00 (T1)',
    },
    {
      title: 'Step 2: Transaction B Commits First',
      desc: 'Transaction B writes balance = ₹40,000.00 and commits via Raft quorum consensus at timestamp T2.',
      status: 'active',
      accBalance: '₹40,000.00 (Committed by Tx B)',
      txAState: 'Preparing write debit ₹15,000',
      txBState: 'COMMITTED at T2 (balance: ₹40,000.00)',
    },
    {
      title: 'Step 3: Hazard Detected — SQLSTATE 40001',
      desc: 'Transaction A attempts write. CockroachDB Serializable MVCC detects write-skew hazard: read timestamp T1 has been invalidated by Tx B commit! CockroachDB rejects Tx A with SQLSTATE 40001: restart transaction.',
      status: 'conflict',
      accBalance: '₹40,000.00',
      txAState: 'ABORTED: SQLSTATE 40001 (Serialization Hazard)',
      txBState: 'Committed',
    },
    {
      title: 'Step 4: Client Retry Wrapper with Exponential Backoff',
      desc: 'Finora DA3 transaction wrapper catches 40001, applies jittered backoff, and transparently retries Transaction A with fresh balance ₹40,000.00.',
      status: 'retry',
      accBalance: '₹40,000.00',
      txAState: 'Auto-retrying with fresh snapshot (T3)',
      txBState: 'Finished',
    },
    {
      title: 'Step 5: Transaction A Successfully Commits',
      desc: 'Transaction A writes balance = ₹25,000.00 (₹40,000 - ₹15,000) and commits. Final balance is completely consistent with zero data loss or race condition!',
      status: 'success',
      accBalance: '₹25,000.00 (Final Consistent Balance)',
      txAState: 'COMMITTED at T3 (balance: ₹25,000.00)',
      txBState: 'Finished',
    },
  ];

  const handleNextSsi = () => {
    setSsiStep((prev) => (prev < ssiSteps.length - 1 ? prev + 1 : 0));
  };

  const handleResetSsi = () => {
    setSsiStep(0);
  };

  // Auto-play timer for SSI simulation
  useEffect(() => {
    let timer: any;
    if (ssiAutoPlay) {
      timer = setInterval(() => {
        setSsiStep((prev) => {
          if (prev >= ssiSteps.length - 1) {
            setSsiAutoPlay(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [ssiAutoPlay, ssiSteps.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            CockroachDB Distributed Architecture Showcase
          </h2>
          <p className="text-xs text-obsidian-400 mt-1">
            Deep dive into NewSQL distributed consensus, serializable ACID isolation, and LSM storage engine powering Finora DA3
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="emerald" size="sm" dot>Live Cluster Telemetry</Badge>
        </div>
      </div>

      {/* Live Cluster Facts Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Database Engine</span>
          <div className="font-mono text-xs font-semibold text-white mt-1">
            {health?.cockroachDB.engine || 'CockroachDB v26.2'}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Cloud Region</span>
          <div className="font-mono text-xs font-semibold text-cyan-400 mt-1">
            AWS Mumbai (ap-south-1)
          </div>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Consensus Engine</span>
          <div className="font-mono text-xs font-semibold text-emerald-400 mt-1">
            Multi-Raft Consensus
          </div>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Isolation Guarantee</span>
          <div className="font-mono text-xs font-semibold text-violet-400 mt-1">
            Serializable (SSI)
          </div>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Storage Engine</span>
          <div className="font-mono text-xs font-semibold text-amber-400 mt-1">
            Pebble (LSM Tree)
          </div>
        </div>
        <div className="p-3 rounded-xl bg-obsidian-900 border border-obsidian-800">
          <span className="text-[10px] uppercase font-mono text-obsidian-500">Transport Security</span>
          <div className="font-mono text-xs font-semibold text-emerald-400 mt-1">
            TLS 1.3 CA Verified
          </div>
        </div>
      </div>

      {/* 4 Architectural Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Multi-Raft */}
        <Card className="border-cyan-500/20 shadow-glow-cyan/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Multi-Raft Distributed Consensus</CardTitle>
                <CardDescription>Horizontal sharding into autonomous 64MB key-value ranges</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-obsidian-300 leading-relaxed">
            <p>
              CockroachDB partitions the entire keyspace into 64MB ranges. Each range replicates across nodes using the Raft consensus algorithm. Writes require confirmation from a majority quorum (<code className="text-cyan-300">⌊N/2⌋ + 1</code>).
            </p>
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1 font-mono text-[11px]">
              <div className="text-cyan-400">Range Leaseholder: Serves strongly consistent reads without Raft round-trips</div>
              <div className="text-obsidian-400">Rebalance Worker: Moves replicas automatically when disk or CPU hot spots arise</div>
            </div>
          </CardContent>
        </Card>

        {/* Pillar 2: Serializable SSI */}
        <Card className="border-emerald-500/20 shadow-glow-emerald/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Serializable ACID Isolation (SSI)</CardTitle>
                <CardDescription>Multi-Version Concurrency Control preventing all write-skew</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-obsidian-300 leading-relaxed">
            <p>
              Unlike legacy databases defaulting to Read Committed, CockroachDB natively enforces full Serializable isolation. Conflicting concurrent transactions trigger <code className="text-emerald-300 font-mono">SQLSTATE 40001</code> for client retry rather than corrupting balances.
            </p>
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1 font-mono text-[11px]">
              <div className="text-emerald-400">Concurrency: Lock-free MVCC snapshots with intent resolution</div>
              <div className="text-obsidian-400">Retry Protocol: Exponential backoff with random jitter wrapper</div>
            </div>
          </CardContent>
        </Card>

        {/* Pillar 3: Pebble LSM Engine */}
        <Card className="border-violet-500/20 shadow-glow-violet/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Pebble Storage Engine</CardTitle>
                <CardDescription>High-throughput Go-based Log-Structured Merge (LSM) Tree</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-obsidian-300 leading-relaxed">
            <p>
              CockroachDB replaced RocksDB with Pebble, an LSM storage engine written in Go. Writes append sequentially to an in-memory Memtable and Write-Ahead Log (WAL), flushing to immutable Sorted String Tables (SSTables).
            </p>
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1 font-mono text-[11px]">
              <div className="text-violet-400">Write Path: Memtable &rarr; WAL &rarr; Level 0-6 Multi-Tier SST Compaction</div>
              <div className="text-obsidian-400">Read Path: Block cache &rarr; Bloom filter check &rarr; SST range scan</div>
            </div>
          </CardContent>
        </Card>

        {/* Pillar 4: Oracle vs CockroachDB Comparison */}
        <Card className="border-amber-500/20 shadow-glow-amber/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Oracle PL/SQL vs CockroachDB NewSQL</CardTitle>
                <CardDescription>Monolithic relational paradigm vs Distributed Cloud NewSQL</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-obsidian-300 leading-relaxed">
            <p>
              Finora DA3 migrates from a centralized Oracle database relying on procedural PL/SQL triggers and sequence contention to a modern distributed NewSQL architecture with declarative constraints.
            </p>
            <div className="p-3 rounded-lg bg-obsidian-950 border border-obsidian-800 space-y-1 font-mono text-[11px]">
              <div className="text-amber-400">Key Gen: Oracle Sequences (Central Bottleneck) &rarr; unique_rowid() / UUID</div>
              <div className="text-obsidian-400">Resilience: Manual active/passive failover &rarr; Multi-Master zero downtime</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Architectural Comparison Matrix</CardTitle>
          <CardDescription className="text-xs">
            Direct comparison between Finora Oracle (DA2) and Finora DA3 CockroachDB Cloud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-obsidian-800 text-obsidian-400">
                  <th className="py-2.5 px-3">Dimension</th>
                  <th className="py-2.5 px-3 text-amber-400">Legacy Oracle System (DA2)</th>
                  <th className="py-2.5 px-3 text-cyan-400 font-semibold">CockroachDB Cloud (Finora DA3)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-800/60">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">System Architecture</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Monolithic, single-host relational instance</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-semibold">Distributed shared-nothing NewSQL cluster</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Default Isolation</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Read Committed (susceptible to write-skew)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">Strict Serializable (SSI) natively enforced</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Consensus & Quorum</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Centralized storage / OS active-passive failover</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-semibold">Multi-Raft autonomous consensus groups</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Scalability & Sharding</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Vertical hardware scaling or manual sharding</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">Automatic 64MB range splitting & rebalancing</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Integrity Enforcement</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Procedural PL/SQL triggers & sequence objects</td>
                  <td className="py-2.5 px-3 text-cyan-300 font-semibold">Declarative SQL check constraints & atomic transfers</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Primary Key Generation</td>
                  <td className="py-2.5 px-3 text-obsidian-300">Oracle SEQUENCE (inter-node lock contention)</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">Distributed unique_rowid() / unordered UUIDs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Architecture Demonstrations (Simulators) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Interactive Architectural Simulations
            </h3>
            <p className="text-xs text-obsidian-400">
              Browser-based interactive models demonstrating CockroachDB internal distributed algorithms
            </p>
          </div>

          {/* Simulator switcher */}
          <div className="flex items-center p-1 bg-obsidian-900 border border-obsidian-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveSim('raft')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeSim === 'raft' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-obsidian-400 hover:text-white'
              }`}
            >
              1. Raft Quorum & Failover
            </button>
            <button
              onClick={() => setActiveSim('range')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeSim === 'range' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-obsidian-400 hover:text-white'
              }`}
            >
              2. 64MB Range Split
            </button>
            <button
              onClick={() => setActiveSim('serializable')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeSim === 'serializable' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-obsidian-400 hover:text-white'
              }`}
            >
              3. Serializable 40001 Retry
            </button>
          </div>
        </div>

        {/* SIMULATOR 1: RAFT QUORUM */}
        {activeSim === 'raft' && (
          <Card className="border-cyan-500/20">
            <CardHeader className="border-b border-obsidian-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">Multi-Raft Consensus & Node Failover Simulator</CardTitle>
                    <Badge variant="cyan" size="xs">Interactive Simulation</Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Toggle individual cluster nodes offline to observe heartbeat timeouts, autonomous Raft elections, and per-range quorum availability.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="xs" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetRaftSim} title="Restore all 3 cluster nodes to online">
                    Reset Cluster
                  </Button>
                  <Button variant="outline" size="xs" icon={<RotateCcw className="w-3.5 h-3.5 text-cyan-400" />} onClick={resetAllSims} title="Reset both nodes and ranges to initial defaults">
                    Reset All Sims
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Architecture Terminology Callout */}
              <div className="p-3 rounded-xl bg-obsidian-950/70 border border-obsidian-800 flex items-start gap-2.5 text-xs text-obsidian-300">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-white">Multi-Raft Shared-Nothing Architecture:</span> A CockroachDB node is an independent process that can host replicas of many ranges across the keyspace. Each range runs its own independent Raft consensus group with its own leader leaseholder. Nodes are not limited to single ranges.
                </div>
              </div>

              {/* 3 Node Cluster Visual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nodes.map((node) => {
                  const isRecovering = node.status === 'RECOVERING';
                  const isOnline = node.status === 'ONLINE';
                  const isOffline = node.status === 'OFFLINE';
                  const hostsAnyLeader = node.hostedReplicas.some((r) => r.role === 'LEADER' && isOnline);

                  return (
                    <div
                      key={node.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isOnline
                          ? hostsAnyLeader
                            ? 'bg-cyan-500/10 border-cyan-400/60 shadow-glow-cyan/20'
                            : 'bg-obsidian-900 border-obsidian-800'
                          : isRecovering
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-glow-amber/10'
                          : 'bg-rose-500/10 border-rose-500/30 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Server
                            className={`w-4 h-4 ${
                              isOnline ? (hostsAnyLeader ? 'text-cyan-400' : 'text-emerald-400') : isRecovering ? 'text-amber-400 animate-spin' : 'text-rose-400'
                            }`}
                          />
                          <span className="font-mono text-sm font-bold text-white">{node.name}</span>
                        </div>
                        <Badge
                          variant={isOnline ? (hostsAnyLeader ? 'cyan' : 'emerald') : isRecovering ? 'amber' : 'rose'}
                          size="xs"
                        >
                          {isOnline ? 'ONLINE' : isRecovering ? 'RECOVERING' : 'OFFLINE'}
                        </Badge>
                      </div>

                      {/* Replication Progress */}
                      <div className="space-y-1.5 font-mono text-[11px] text-obsidian-300">
                        <div className="flex items-center justify-between">
                          <span className="text-obsidian-400">Replication Log:</span>
                          <span
                            className={
                              node.logProgress === 'IN_SYNC'
                                ? 'text-emerald-400 font-semibold'
                                : node.logProgress === 'CATCHING_UP'
                                ? 'text-amber-400 font-semibold animate-pulse'
                                : 'text-rose-400 font-semibold'
                            }
                          >
                            {node.logProgress === 'IN_SYNC'
                              ? 'In Sync (Committed)'
                              : node.logProgress === 'CATCHING_UP'
                              ? 'Replaying Log...'
                              : 'Stalled / Unreachable'}
                          </span>
                        </div>

                        {/* Hosted Range Replicas */}
                        <div className="pt-2 border-t border-obsidian-800/80 space-y-1">
                          <div className="text-[10px] uppercase font-mono text-obsidian-500">
                            Hosted Range Replicas:
                          </div>
                          {node.hostedReplicas.length === 0 ? (
                            <div className="text-obsidian-500 text-[11px]">No active replicas</div>
                          ) : (
                            node.hostedReplicas.map((rep) => (
                              <div
                                key={rep.rangeId}
                                className={`flex items-center justify-between px-2 py-1 rounded text-[11px] font-mono ${
                                  isOffline
                                    ? 'bg-obsidian-950/60 text-obsidian-500'
                                    : rep.role === 'LEADER'
                                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                                    : 'bg-obsidian-950 text-obsidian-300'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  {rep.role === 'LEADER' && isOnline && <Crown className="w-3 h-3 text-cyan-400" />}
                                  {rep.rangeName}
                                </span>
                                <span className="text-[10px]">
                                  {isOffline ? 'Offline Replica' : rep.role === 'LEADER' ? 'Raft Leader' : 'Follower'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Card Action Button */}
                      <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between">
                        <span className="text-[10px] text-obsidian-400 font-mono">
                          {isOnline ? 'Active in Quorum' : isRecovering ? 'Catching up...' : 'Heartbeat failed'}
                        </span>
                        <Button
                          variant={isOnline ? 'danger' : 'outline'}
                          size="xs"
                          onClick={() => toggleNode(node.id)}
                          disabled={isRecovering}
                          icon={isRecovering ? <RefreshCw className="w-3 h-3 animate-spin" /> : undefined}
                        >
                          {isOnline ? 'Kill Node' : isRecovering ? 'Catching Up...' : 'Start Node'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Raft Range Replication & Quorum Status Panel */}
              <div className="p-4 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-xs text-white flex items-center gap-2">
                      <Split className="w-4 h-4 text-cyan-400" />
                      Active Key-Ranges & Multi-Raft Consensus Groups
                    </div>
                    <p className="text-[11px] text-obsidian-400 mt-0.5">
                      Each range operates an autonomous Raft group requiring majority consensus (&ge; 2 of 3 replicas) to commit writes.
                    </p>
                  </div>
                  {ranges.length === 1 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveSim('range')}
                      icon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Split to 2 Ranges in Tab 2
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {ranges.map((range) => {
                    const isQuorumHealthy = range.quorumStatus === 'QUORUM_HEALTHY';
                    const hasLeader = range.leaderNodeId !== null;

                    return (
                      <div
                        key={range.id}
                        className={`p-3.5 rounded-xl border space-y-2.5 font-mono text-xs ${
                          isQuorumHealthy
                            ? 'bg-obsidian-900 border-obsidian-800'
                            : 'bg-rose-950/20 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-cyan-400" />
                            {range.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isQuorumHealthy ? 'emerald' : 'rose'} size="xs">
                              {range.quorumStatus}
                            </Badge>
                            <Badge variant={range.writeStatus === 'WRITES_AVAILABLE' ? 'emerald' : 'rose'} size="xs">
                              {range.writeStatus}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px]">
                          <div className="text-cyan-300">
                            Key Span: <span className="font-semibold">{range.keySpan}</span> &bull; {range.sizeMb} MB
                          </div>
                          <div className="text-obsidian-300 flex items-center gap-2">
                            <span>Current Leader:</span>
                            {hasLeader ? (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-cyan-400" />
                                Node {range.leaderNodeId}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                None (Quorum Lost)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Replica Placement Indicator */}
                        <div className="pt-2 border-t border-obsidian-800 flex items-center justify-between text-[11px]">
                          <span className="text-obsidian-400">Replica Placement:</span>
                          <div className="flex items-center gap-2">
                            {range.replicas.map((nodeId) => {
                              const rNode = nodes.find((n) => n.id === nodeId);
                              const isRepUp = rNode?.status === 'ONLINE';
                              const isRepRec = rNode?.status === 'RECOVERING';
                              const isLeader = range.leaderNodeId === nodeId && isRepUp;

                              return (
                                <span
                                  key={nodeId}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 ${
                                    isRepUp
                                      ? isLeader
                                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : isRepRec
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 opacity-60'
                                  }`}
                                  title={`Node ${nodeId}: ${rNode?.status || 'UNKNOWN'}${isLeader ? ' (Leader)' : ''}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isRepUp ? (isLeader ? 'bg-cyan-400' : 'bg-emerald-400') : isRepRec ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                                    }`}
                                  />
                                  Node {nodeId}
                                  {isLeader && ' (L)'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cluster Quorum Status Bar */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  hasQuorum
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {hasQuorum ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-xs">
                      {hasQuorum
                        ? 'Multi-Raft Consensus Operational — Linearizable Writes Active'
                        : 'Loss of Quorum — CockroachDB Write Safety Gate Activated'}
                    </div>
                    <div className="text-[11px] opacity-90 mt-0.5 font-mono">
                      Active Voting Nodes: {activeNodesCount} of 3 &bull; Quorum required: &ge; 2 votes majority
                    </div>
                  </div>
                </div>
                <Badge variant={hasQuorum ? 'emerald' : 'rose'} size="sm">
                  {hasQuorum ? 'WRITES AVAILABLE' : 'WRITES STALLED'}
                </Badge>
              </div>

              {/* Demo Write Gate Banner */}
              {!hasQuorum && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-3">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-rose-300">
                      Simulated Multi-Raft Write Gate Active
                    </div>
                    <p className="text-[11px] text-rose-200/80 leading-relaxed">
                      With fewer than 2 voting nodes online, ranges cannot achieve majority consensus (⌊3/2⌋ + 1 = 2). The CockroachDB simulation gate blocks all state-changing operations (customer mutations, accounts, transfers, loans) across the application to prevent split-brain anomalies. Click <strong>Reset Cluster</strong> above to resume writes.
                    </p>
                  </div>
                </div>
              )}

              {/* Event Log Output */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-obsidian-400">
                  Consensus Event Log:
                </span>
                <div className="p-3 rounded-xl bg-obsidian-950 border border-obsidian-800 font-mono text-[11px] text-cyan-300 space-y-1 max-h-56 overflow-y-auto">
                  {raftLog.map((log, idx) => (
                    <div key={idx} className={idx === 0 ? 'text-cyan-300 font-semibold' : 'text-obsidian-400'}>
                      &gt; {log}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SIMULATOR 2: RANGE SPLIT */}
        {activeSim === 'range' && (
          <Card className="border-cyan-500/20">
            <CardHeader className="border-b border-obsidian-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">64MB Key-Range Partitioning & Auto-Split</CardTitle>
                    <Badge variant="cyan" size="xs">Interactive Simulation</Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Simulate sequential transaction ingestion filling a range until it reaches CockroachDB's 64MB split threshold.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="xs" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetRangeSim} title="Reset range to single 24 MB unsplit range">
                    Reset Range
                  </Button>
                  <Button variant="outline" size="xs" icon={<RotateCcw className="w-3.5 h-3.5 text-cyan-400" />} onClick={resetAllSims} title="Reset both nodes and ranges to initial defaults">
                    Reset All Sims
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Range Growth Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white">Active Range Size: {rangeSizeMb} MB</span>
                  <span className="text-cyan-400">Split Threshold: 64 MB</span>
                </div>
                <div className="w-full h-3 rounded-full bg-obsidian-950 border border-obsidian-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      rangeSizeMb >= 64 ? 'bg-amber-400' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min((rangeSizeMb / 64) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Sparkles className="w-4 h-4" />}
                  onClick={ingestRangeData}
                  disabled={splitHappened}
                >
                  {splitHappened ? 'Split Completed (64 MB Threshold Reached)' : 'Ingest Batch (+20 MB Rows)'}
                </Button>
                {splitHappened && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Range reached 64MB boundary! Partitioned at key midpoint 100500 into Range 1 and Range 2.
                  </span>
                )}
              </div>

              {/* Educational Explanation: Range Splitting vs Replica Rebalancing */}
              <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-obsidian-800 space-y-1.5 text-xs text-obsidian-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Info className="w-4 h-4 text-cyan-400" />
                  Range Splitting vs. Replica Rebalancing
                </div>
                <p className="text-[11px] text-obsidian-400 leading-relaxed font-sans">
                  In CockroachDB, <strong>range splitting</strong> is a fast, local metadata operation that partitions the key-span at a key boundary (<code className="text-cyan-300 font-mono">100500</code>). Initially, both child ranges retain the parent’s configured replica placement across Nodes 1, 2, and 3. Each child range forms its own autonomous Raft group with its own leader leaseholder. <strong>Replica rebalancing</strong> (moving replicas to underutilized nodes) occurs subsequently and independently via the replicate queue.
                </p>
              </div>

              {/* Partitioned Ranges Display */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-obsidian-400">
                    Partitioned Key-Ranges in Cluster:
                  </span>
                  <span className="text-[11px] font-mono text-obsidian-400">
                    Arithmetic: {splitHappened ? '32 MB + 32 MB = 64 MB Total' : '24 MB Initial'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ranges.map((r) => {
                    const isQuorumHealthy = r.quorumStatus === 'QUORUM_HEALTHY';
                    const hasLeader = r.leaderNodeId !== null;

                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-xl border space-y-3 font-mono text-xs ${
                          isQuorumHealthy
                            ? 'bg-obsidian-900 border-cyan-500/30'
                            : 'bg-rose-950/20 border-rose-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-2">
                            <Split className="w-4 h-4 text-cyan-400" />
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isQuorumHealthy ? 'emerald' : 'rose'} size="xs">
                              {r.quorumStatus}
                            </Badge>
                            <Badge variant={r.writeStatus === 'WRITES_AVAILABLE' ? 'emerald' : 'rose'} size="xs">
                              {r.writeStatus}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div className="text-cyan-300">
                            Key Span: <span className="font-semibold">{r.keySpan}</span>
                          </div>
                          <div className="text-obsidian-400">
                            Size: <span className="text-white font-semibold">{r.sizeMb} MB</span> &bull; Status:{' '}
                            <span className="text-cyan-400">{r.splitStatus}</span>
                          </div>
                          <div className="text-obsidian-300 flex items-center gap-2 pt-1">
                            <span>Current Raft Leader:</span>
                            {hasLeader ? (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-cyan-400" />
                                Node {r.leaderNodeId}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                                None (Quorum Lost)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Configured Replica Placement */}
                        <div className="pt-2 border-t border-obsidian-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-obsidian-400">Configured Replica Placement:</span>
                            <span className="text-cyan-400 font-semibold">{r.activeReplicasCount}/3 Online</span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            {r.replicas.map((nodeId) => {
                              const rNode = nodes.find((n) => n.id === nodeId);
                              const isRepUp = rNode?.status === 'ONLINE';
                              const isRepRec = rNode?.status === 'RECOVERING';
                              const isLeader = r.leaderNodeId === nodeId && isRepUp;

                              return (
                                <span
                                  key={nodeId}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1.5 ${
                                    isRepUp
                                      ? isLeader
                                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : isRepRec
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 opacity-60'
                                  }`}
                                  title={`Node ${nodeId}: ${rNode?.status || 'UNKNOWN'}${isLeader ? ' (Leader)' : ''}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isRepUp ? (isLeader ? 'bg-cyan-400' : 'bg-emerald-400') : isRepRec ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                                    }`}
                                  />
                                  Node {nodeId}
                                  {isLeader && ' (L)'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cross-Simulation Demonstration Box (Requirement 3) */}
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-cyan-300">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Reproducible Demonstration: Test Multi-Raft Failover on Range 2
                  </div>
                  <Badge variant="cyan" size="xs">Live Interactive Link</Badge>
                </div>
                <p className="text-[11px] text-obsidian-300 leading-relaxed font-sans">
                  {splitHappened
                    ? "Both Range 1 and Range 2 are active with independent Raft leaders. Toggle Node 2 below to observe how Range 1 remains unaffected with leader Node 1, while Range 2's surviving replicas (Nodes 1 & 3) immediately elect Node 3 as their new Raft leader — keeping writes available on both ranges with zero downtime!"
                    : "Click 'Ingest Batch (+20 MB Rows)' above twice to reach the 64MB threshold and split Range 1 into two independent ranges. Then test failover on Range 2!"}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {splitHappened && (
                    <Button
                      variant={node2Up ? 'danger' : 'outline'}
                      size="xs"
                      onClick={() => toggleNode(2)}
                      disabled={recoveringNodeId === 2}
                      icon={recoveringNodeId === 2 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                    >
                      {node2Up
                        ? 'Kill Node 2 (Test Range 2 Failover)'
                        : recoveringNodeId === 2
                        ? 'Node 2 Recovering (Log Replay)...'
                        : 'Start Node 2 (Test Log Catch-Up)'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setActiveSim('raft')}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Consensus in Tab 1 (Multi-Raft)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SIMULATOR 3: SERIALIZABLE 40001 RETRY */}
        {activeSim === 'serializable' && (
          <Card className="border-cyan-500/20">
            <CardHeader className="border-b border-obsidian-800 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">Serializable SSI Hazard & 40001 Auto-Retry Simulator</CardTitle>
                    <Badge variant="cyan" size="xs">Interactive Simulation</Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Step-by-step walkthrough of two concurrent balance debits, write-skew hazard detection, and automatic backoff retry.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    icon={<Play className="w-3.5 h-3.5" />}
                    onClick={() => setSsiAutoPlay(!ssiAutoPlay)}
                  >
                    {ssiAutoPlay ? 'Pause Auto' : 'Auto Play'}
                  </Button>
                  <Button variant="ghost" size="xs" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleResetSsi}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Timeline Stepper */}
              <div className="flex items-center justify-between border-b border-obsidian-800 pb-4">
                {ssiSteps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSsiStep(idx)}
                    className={`flex items-center gap-1.5 text-xs font-mono transition-all ${
                      ssiStep === idx
                        ? 'text-cyan-400 font-bold'
                        : ssiStep > idx
                        ? 'text-emerald-400'
                        : 'text-obsidian-600'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      ssiStep === idx
                        ? 'bg-cyan-500 text-obsidian-950 font-bold'
                        : ssiStep > idx
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-obsidian-800 text-obsidian-500'
                    }`}>
                      {idx}
                    </div>
                    <span className="hidden md:inline">Step {idx}</span>
                  </button>
                ))}
              </div>

              {/* Current Step Description Card */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                ssiSteps[ssiStep].status === 'conflict'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : ssiSteps[ssiStep].status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-obsidian-900 border-obsidian-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">
                    {ssiSteps[ssiStep].title}
                  </span>
                  <Badge
                    variant={
                      ssiSteps[ssiStep].status === 'conflict'
                        ? 'rose'
                        : ssiSteps[ssiStep].status === 'success'
                        ? 'emerald'
                        : 'cyan'
                    }
                    size="xs"
                  >
                    {ssiSteps[ssiStep].status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-obsidian-300 leading-relaxed font-sans">
                  {ssiSteps[ssiStep].desc}
                </p>
              </div>

              {/* Transactions Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Account State */}
                <div className="p-3.5 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-1">
                  <span className="text-[10px] uppercase text-obsidian-500">Database Record (ACC-101)</span>
                  <div className="text-base font-bold text-amber-300">
                    {ssiSteps[ssiStep].accBalance}
                  </div>
                  <div className="text-[10px] text-obsidian-400">CockroachDB MVCC Row Version</div>
                </div>

                {/* Txn A */}
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  ssiSteps[ssiStep].status === 'conflict'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    : 'bg-obsidian-950 border-obsidian-800 text-cyan-300'
                }`}>
                  <span className="text-[10px] uppercase text-obsidian-500">Transaction A (Withdraw ₹15,000)</span>
                  <div className="font-semibold text-xs">
                    {ssiSteps[ssiStep].txAState}
                  </div>
                  <div className="text-[10px] text-obsidian-400">Handled by Finora Retry Wrapper</div>
                </div>

                {/* Txn B */}
                <div className="p-3.5 rounded-xl bg-obsidian-950 border border-obsidian-800 space-y-1 text-emerald-300">
                  <span className="text-[10px] uppercase text-obsidian-500">Transaction B (Withdraw ₹10,000)</span>
                  <div className="font-semibold text-xs">
                    {ssiSteps[ssiStep].txBState}
                  </div>
                  <div className="text-[10px] text-obsidian-400">First Committer Wins</div>
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-mono text-obsidian-400">
                  Step {ssiStep + 1} of {ssiSteps.length}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ChevronRight className="w-4 h-4" />}
                  onClick={handleNextSsi}
                >
                  {ssiStep === ssiSteps.length - 1 ? 'Start Over' : 'Next Step'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
