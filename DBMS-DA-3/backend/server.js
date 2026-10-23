/**
 * Finora DA3 - Backend REST API Server
 * Target: CockroachDB Cloud (finora_da3)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const db = require('./config/db');

// Route imports
const healthRoutes = require('./routes/healthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const bankingRoutes = require('./routes/bankingRoutes');
const deletionRoutes = require('./routes/deletionRoutes');
const entityRoutes = require('./routes/entityRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const workbenchRoutes = require('./routes/workbenchRoutes');
const { router: showcaseRoutes, raftQuorumGate } = require('./routes/showcaseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Telemetry Logger (Non-blocking)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    service: 'Finora DA3 - Banking Management System API',
    status: 'ONLINE',
    version: '1.0.0',
    engine: 'CockroachDB Cloud (Distributed SQL)',
    endpoints: {
      health: '/api/health',
      dashboardSummary: '/api/dashboard/summary',
      banking: '/api/banking/(deposit, withdraw, transfer, loan-payment)',
      entities: '/api/entities/:entity',
      metadata: '/api/metadata/(tables, columns, relationships, schema)',
      workbenchPolicy: '/api/workbench/policy',
      showcaseRaft: '/api/showcase/raft-state'
    }
  });
});

// Mount Simulated Raft Quorum Gate on all /api routes
app.use('/api', raftQuorumGate);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/showcase', showcaseRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/workbench', workbenchRoutes);
app.use('/api', deletionRoutes);
app.use('/api', entityRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found.',
    path: req.originalUrl
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Server Startup
let server;
if (process.env.NODE_ENV !== 'test_embedded') {
  server = app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 FINORA DA3 REST API RUNNING ON PORT ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`☁️  Target: CockroachDB Cloud (finora_da3)`);
    console.log(`================================================================`);
  });
}

// Graceful Shutdown Handler
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      db.pool.end().then(() => {
        console.log('CockroachDB pool closed.');
        process.exit(0);
      });
    });
  } else {
    db.pool.end().then(() => process.exit(0));
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, server };
