const { getConnection } = require('../backend/db');

async function testColumnDetection() {
  const conn = await getConnection();
  const cache = new Map();

  async function hasCol(table, col) {
    const key = `${table.toUpperCase()}.${col.toUpperCase()}`;
    if (cache.has(key)) return cache.get(key);
    const res = await conn.execute(
      `SELECT COUNT(*) FROM user_tab_cols WHERE table_name = :t AND column_name = :c`,
      { t: table.toUpperCase(), c: col.toUpperCase() }
    );
    const exists = res.rows[0][0] > 0;
    cache.set(key, exists);
    return exists;
  }

  console.log('LOAN has STATUS?', await hasCol('LOAN', 'STATUS'));
  console.log('LOAN has FAKE_COL?', await hasCol('LOAN', 'FAKE_COL'));
  console.log('NOMINEE has STATUS?', await hasCol('NOMINEE', 'STATUS'));
  console.log('ACCOUNT has STATUS?', await hasCol('ACCOUNT', 'STATUS'));
  console.log('TRANSACTION has STATUS?', await hasCol('TRANSACTION', 'STATUS'));
  console.log('Cached size:', cache.size);

  await conn.close();
}

testColumnDetection().catch(console.error);
