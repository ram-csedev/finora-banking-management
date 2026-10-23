/**
 * Finora DA3 - CockroachDB Simulated Raft Consensus & Quorum State Service
 * Controls educational simulation quorum state and acts as the gatekeeper for demo writes.
 */

let simulationState = {
  node1Up: true,
  node2Up: true,
  node3Up: true,
  raftLeader: 1,
  activeNodesCount: 3,
  hasQuorum: true,
  lastUpdated: new Date().toISOString()
};

function calculateQuorum(n1, n2, n3) {
  const activeCount = (n1 ? 1 : 0) + (n2 ? 1 : 0) + (n3 ? 1 : 0);
  return {
    activeNodesCount: activeCount,
    hasQuorum: activeCount >= 2 // Majority of 3 nodes: floor(3/2) + 1 = 2
  };
}

function getState() {
  return { ...simulationState };
}

function updateState({ node1Up, node2Up, node3Up, raftLeader }) {
  const n1 = node1Up !== undefined ? Boolean(node1Up) : simulationState.node1Up;
  const n2 = node2Up !== undefined ? Boolean(node2Up) : simulationState.node2Up;
  const n3 = node3Up !== undefined ? Boolean(node3Up) : simulationState.node3Up;
  
  const { activeNodesCount, hasQuorum } = calculateQuorum(n1, n2, n3);
  
  let leader = raftLeader !== undefined ? Number(raftLeader) : simulationState.raftLeader;
  if (!hasQuorum) {
    leader = 0; // No leader possible when quorum is lost
  } else if (leader === 1 && !n1) {
    leader = n2 ? 2 : (n3 ? 3 : 0);
  } else if (leader === 2 && !n2) {
    leader = n1 ? 1 : (n3 ? 3 : 0);
  } else if (leader === 3 && !n3) {
    leader = n1 ? 1 : (n2 ? 2 : 0);
  } else if (leader === 0 && hasQuorum) {
    leader = n1 ? 1 : (n2 ? 2 : 3);
  }

  simulationState = {
    node1Up: n1,
    node2Up: n2,
    node3Up: n3,
    raftLeader: leader,
    activeNodesCount,
    hasQuorum,
    lastUpdated: new Date().toISOString()
  };

  return { ...simulationState };
}

function resetState() {
  simulationState = {
    node1Up: true,
    node2Up: true,
    node3Up: true,
    raftLeader: 1,
    activeNodesCount: 3,
    hasQuorum: true,
    lastUpdated: new Date().toISOString()
  };
  return { ...simulationState };
}

function isWritePermitted(req) {
  // Check client-supplied simulated quorum header first
  const headerQuorum = req.headers['x-simulated-quorum'];
  if (headerQuorum !== undefined) {
    return headerQuorum === 'true';
  }
  // Fall back to server simulation state
  return simulationState.hasQuorum;
}

function getActiveNodesCount(req) {
  const headerCount = req.headers['x-simulated-active-nodes'];
  if (headerCount !== undefined) {
    const parsed = parseInt(headerCount, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return simulationState.activeNodesCount;
}

module.exports = {
  getState,
  updateState,
  resetState,
  isWritePermitted,
  getActiveNodesCount
};
