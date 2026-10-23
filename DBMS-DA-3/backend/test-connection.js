
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;
const caPath = process.env.DB_SSL_ROOT_CERT;

if (!connectionString || !caPath) {
  console.error('Missing DATABASE_URL or DB_SSL_ROOT_CERT in .env');
  process.exit(1);
}

const url = new URL(connectionString);

// Configure TLS explicitly using the downloaded CockroachDB CA certificate.
url.searchParams.delete('sslmode');
url.searchParams.delete('sslrootcert');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true
  },
  connectionTimeoutMillis: 15000
});

async function testConnection() {
  try {
    const result = await pool.query(`
      SELECT
        version() AS database_version,
        current_database() AS database_name,
        current_user AS connected_user
    `);

    console.log('✅ Connected to CockroachDB Cloud!');
    console.table(result.rows);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
