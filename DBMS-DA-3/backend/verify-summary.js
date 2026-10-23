/**
 * Finora DA3 - Detailed Schema Summary
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/finora_da3';
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT, 'utf8'), rejectUnauthorized: true }
  });

  const client = await pool.connect();
  try {
    // 1. Tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log('--- ALL CREATED TABLES (' + tables.rows.length + ') ---');
    tables.rows.forEach(r => console.log(`✓ ${r.table_name}`));

    // 2. Views
    const views = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'VIEW'
      ORDER BY table_name;
    `);
    console.log('\n--- ALL CREATED VIEWS (' + views.rows.length + ') ---');
    views.rows.forEach(r => console.log(`✓ ${r.table_name}`));

    // 3. Foreign Keys
    const fks = await client.query(`
      SELECT
        tc.table_name AS child_table,
        kcu.column_name AS fk_column,
        ccu.table_name AS parent_table,
        ccu.column_name AS pk_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log('\n--- FOREIGN KEY RELATIONSHIPS (' + fks.rows.length + ') ---');
    fks.rows.forEach(r => console.log(`  ${r.child_table}.${r.fk_column} -> ${r.parent_table}.${r.pk_column} [ON DELETE ${r.delete_rule}]`));

    // 4. Primary Keys
    const pks = await client.query(`
      SELECT
        tc.table_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.table_name
      ORDER BY tc.table_name;
    `);
    console.log('\n--- PRIMARY KEYS (' + pks.rows.length + ') ---');
    pks.rows.forEach(r => console.log(`  ${r.table_name} PRIMARY KEY (${r.pk_columns})`));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
