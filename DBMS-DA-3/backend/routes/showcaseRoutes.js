/**
 * Finora DA3 - CockroachDB Showcase & Raft Simulator Routes
 * Exposes endpoints to synchronize and reset the educational Raft simulation state,
 * and exports the Raft quorum write gate middleware.
 */
const express = require('express');
const router = express.Router();
const raftService = require('../services/raftSimulationService');

// Retrieve current simulator state
router.get('/raft-state', (req, res) => {
  res.json({
    success: true,
    data: raftService.getState()
  });
});

// Update simulator state
router.post('/raft-state', (req, res) => {
  const { node1Up, node2Up, node3Up, raftLeader } = req.body || {};
  const updated = raftService.updateState({ node1Up, node2Up, node3Up, raftLeader });
  res.json({
    success: true,
    data: updated
  });
});

// Reset simulator cluster
router.post('/raft-reset', (req, res) => {
  const reset = raftService.resetState();
  res.json({
    success: true,
    message: 'Simulated Raft cluster reset: 3 nodes active with healthy quorum.',
    data: reset
  });
});

/**
 * Middleware: Enforce Simulated Raft Quorum Write Gate
 * Intercepts mutations when simulated quorum is lost (< 2 nodes active)
 */
function raftQuorumGate(req, res, next) {
  // Only evaluate state-modifying requests
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  if (!isMutation) {
    return next();
  }

  // Exempt internal simulator controls and read-only tools
  if (
    req.path.includes('/showcase/raft-') ||
    req.path.includes('/workbench/validate')
  ) {
    return next();
  }

  // Evaluate whether write is permitted
  if (!raftService.isWritePermitted(req)) {
    const activeCount = raftService.getActiveNodesCount(req);
    return res.status(503).json({
      success: false,
      error: `Simulated Raft Quorum Unavailable: Only ${activeCount} of 3 simulated nodes online (minimum 2 required for consensus). Write operations are paused by the CockroachDB Multi-Raft simulation gate. Restore at least 2 nodes or click 'Reset Cluster' in the Architecture Showcase.`,
      code: 'SIMULATED_RAFT_QUORUM_UNAVAILABLE',
      simulated: true,
      activeNodesCount: activeCount
    });
  }

  next();
}

module.exports = {
  router,
  raftQuorumGate
};
