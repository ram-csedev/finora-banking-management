/**
 * Finora DA3 - Schema Verification Script
 * Validates tables, primary keys, foreign keys, check constraints, unique constraints,
 * and views in finora_da3 against CockroachDB Cloud.
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

async function verifySchema() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/finora_da3';
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT, 'utf8'),
      rejectUnauthorized: true
    },
    connectionTimeoutMillis: 15000
  });

  const client = await pool.connect();
  try {
    console.log('================================================================');
    console.log('FINORA DA3: COCKROACHDB SCHEMA VERIFICATION REPORT');
    console.log('================================================================\n');

    // 1. Current Database & Cluster Info
    const dbInfo = await client.query(`
      SELECT current_database() AS database, current_user AS user, version() AS version
    `);
    console.log(`📌 Connected Database: ${dbInfo.rows[0].database}`);
    console.log(`👤 Connected User:     ${dbInfo.rows[0].user}`);
    console.log(`☁️  Engine Version:     ${dbInfo.rows[0].version.split('\n')[0]}\n`);

    // 2. Table Catalog Verification
    console.log('--- 1. TABLE INVENTORY (14 EXPECTED) ---');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.table(tablesResult.rows);
    console.log(`Total Tables Found: ${tablesResult.rows.length} / 14\n`);

    // 3. Views Inventory
    console.log('--- 2. ANALYTICAL VIEWS INVENTORY ---');
    const viewsResult = await client.query(`
      SELECT table_name AS view_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'VIEW'
      ORDER BY table_name;
    `);
    console.table(viewsResult.rows);
    console.log(`Total Views Found: ${viewsResult.rows.length}\n`);

    // 4. Primary Keys Verification
    console.log('--- 3. PRIMARY KEY CONSTRAINTS ---');
    const pkResult = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.table_name, tc.constraint_name
      ORDER BY tc.table_name;
    `);
    console.table(pkResult.rows);

    // 5. Foreign Key Relationships Metadata
    console.log('\n--- 4. FOREIGN KEY RELATIONSHIPS (METADATA DISCOVERY) ---');
    const fkResult = await client.query(`
      SELECT
        tc.table_name AS child_table,
        kcu.column_name AS child_column,
        ccu.table_name AS parent_table,
        ccu.column_name AS parent_column,
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
    console.table(fkResult.rows);

    // 6. Check Constraints & Unique Constraints
    console.log('\n--- 5. CHECK & UNIQUE CONSTRAINTS ---');
    const constraintsResult = await client.query(`
      SELECT
        table_name,
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY table_name, constraint_type, constraint_name;
    `);
    console.table(constraintsResult.rows);

    // 7. Verify Schema Queryability
    console.log('\n--- 6. SCHEMA QUERYABILITY TEST ---');
    const countQueries = [
      'SELECT count(*) FROM branch',
      'SELECT count(*) FROM employee',
      'SELECT count(*) FROM customer',
      'SELECT count(*) FROM account',
      'SELECT count(*) FROM account_holder',
      'SELECT count(*) FROM loan',
      'SELECT count(*) FROM loan_payment',
      'SELECT count(*) FROM creditcard',
      'SELECT count(*) FROM beneficiary',
      'SELECT count(*) FROM "transaction"',
      'SELECT count(*) FROM nominee',
      'SELECT count(*) FROM audit_log',
      'SELECT count(*) FROM responsible_for',
      'SELECT count(*) FROM customer_phone'
    ];

    let successCount = 0;
    for (const q of countQueries) {
      await client.query(q);
      successCount++;
    }
    console.log(`✅ All ${successCount} core tables successfully queried without errors!`);

    // Test View Query
    const dashResult = await client.query('SELECT * FROM dashboard_summary');
    console.log('✅ Analytical view `dashboard_summary` queried successfully:', dashResult.rows[0]);

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema();
