
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');

const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete('sslmode');
url.searchParams.delete('sslrootcert');

const pool = new Pool({
  connectionString: url.toString(),
  ssl: {
    ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT, 'utf8'),
    rejectUnauthorized: true
  },
  connectionTimeoutMillis: 15000,
  query_timeout: 30000
});

async function main() {
  try {
    await pool.query('CREATE DATABASE finora_da3');
    console.log('SUCCESS: finora_da3 created.');

    const result = await pool.query('SHOW DATABASES');
    console.table(result.rows);
  } catch (error) {
    console.error('Database creation failed.');
    console.error('Code:', error.code || 'N/A');
    console.error('Message:', error.message);
  } finally {
    await pool.end();
  }
}

main();
