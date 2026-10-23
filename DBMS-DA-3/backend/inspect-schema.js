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
    const res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const tableCols = {};
    for (const row of res.rows) {
      if (!tableCols[row.table_name]) tableCols[row.table_name] = [];
      tableCols[row.table_name].push(`${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}${row.column_default ? ', default: ' + row.column_default : ''})`);
    }

    for (const [tbl, cols] of Object.entries(tableCols)) {
      console.log(`\nTable: ${tbl}`);
      cols.forEach(c => console.log(`  - ${c}`));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
