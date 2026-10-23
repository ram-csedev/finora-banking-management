/**
 * Centralized CockroachDB Connection Pool and Transaction Runner
 * Finora DA3 Distributed Architecture
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const caPath = process.env.DB_SSL_ROOT_CERT;

if (!connectionString || !caPath) {
  console.error('FATAL: Missing DATABASE_URL or DB_SSL_ROOT_CERT in .env');
  process.exit(1);
}

// Ensure the connection targets finora_da3 directly with proper TLS configuration
const url = new URL(connectionString);
url.pathname = '/finora_da3';
url.searchParams.delete('sslmode');
url.searchParams.delete('sslrootcert');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle CockroachDB client:', err.message);
});

/**
 * Execute a standard parameterized query
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Can log query telemetry if needed
  return res;
}

/**
 * Execute an atomic transaction with bounded retry handling for CockroachDB
 * serializable transaction conflict errors (SQLSTATE 40001).
 *
 * @param {Function} callback Function that receives the transaction client: async (client) => { ... }
 * @param {number} maxRetries Maximum retry attempts (default: 5)
 */
async function executeTransaction(callback, maxRetries = 5) {
  const client = await pool.connect();
  let attempt = 0;

  try {
    while (true) {
      attempt++;
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});

        // Check if error is CockroachDB serialization retry error (40001)
        if (err.code === '40001' && attempt < maxRetries) {
          const backoff = Math.min(50 * Math.pow(2, attempt) + Math.floor(Math.random() * 50), 1000);
          console.warn(`[CockroachDB Retry] Serialization conflict (40001) on attempt ${attempt}. Retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        // Not a retryable error or max retries exceeded
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Health check querying CockroachDB without exposing secrets
 */
async function getHealth() {
  const res = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS user,
      version() AS version,
      clock_timestamp() AS server_time
  `);
  const row = res.rows[0];
  return {
    status: 'UP',
    database: row.database,
    user: row.user,
    engine: row.version.split('\n')[0],
    serverTime: row.server_time,
    pool: {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    }
  };
}

module.exports = {
  pool,
  query,
  executeTransaction,
  getHealth
};
