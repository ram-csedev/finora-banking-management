const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Health Check Endpoint
 * Verifies CockroachDB connection status, version, and server time.
 * Never exposes credentials or environment secrets.
 */
router.get('/', async (req, res, next) => {
  try {
    const health = await db.getHealth();
    res.json({
      success: true,
      service: 'Finora DA3 Backend REST API',
      timestamp: new Date().toISOString(),
      cockroachDB: health
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      service: 'Finora DA3 Backend REST API',
      status: 'DOWN',
      error: 'CockroachDB connection unavailable.',
      message: err.message
    });
  }
});

module.exports = router;
