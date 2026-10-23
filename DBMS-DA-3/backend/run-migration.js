/**
 * Finora DA3 - Migration Runner
 * Executes version-controlled SQL migrations against CockroachDB Cloud (finora_da3).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  const caPath = process.env.DB_SSL_ROOT_CERT;

  if (!connectionString || !caPath) {
    console.error('❌ Error: Missing DATABASE_URL or DB_SSL_ROOT_CERT in .env');
    process.exit(1);
  }

  // Parse and explicitly target finora_da3 database
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
    connectionTimeoutMillis: 15000
  });

  const targetFile = process.argv[2] || '001_initial_schema.sql';
  const migrationFile = path.join(__dirname, 'migrations', targetFile);
  console.log(`🚀 Executing migration: ${migrationFile}`);

  const sql = fs.readFileSync(migrationFile, 'utf8');

  const client = await pool.connect();
  try {
    // Confirm target database
    const dbCheck = await client.query('SELECT current_database() AS current_db, current_user AS user');
    console.log(`📌 Connected to database: '${dbCheck.rows[0].current_db}' as user: '${dbCheck.rows[0].user}'`);

    if (dbCheck.rows[0].current_db !== 'finora_da3') {
      throw new Error(`Safety violation: Connected to '${dbCheck.rows[0].current_db}', expected 'finora_da3'! Aborting.`);
    }

    console.log('⚡ Applying DDL statements...');
    await client.query(sql);

    console.log('✅ Migration 001_initial_schema.sql executed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.position) {
      console.error(`Position: ${err.position}`);
    }
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
