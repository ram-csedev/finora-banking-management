const { getConnection } = require('../backend/db');

async function inspectTriggers() {
  const conn = await getConnection();
  const trgs = await conn.execute(
    `SELECT TRIGGER_NAME, TABLE_NAME, TRIGGERING_EVENT, TRIGGER_BODY FROM USER_TRIGGERS ORDER BY TRIGGER_NAME`
  );
  for (const row of trgs.rows) {
    console.log('==============================================');
    console.log('Trigger:', row[0], 'on', row[1], 'Event:', row[2]);
    console.log('Body:\n', row[3]);
  }

  console.log('\n==============================================');
  console.log('=== ACCOUNT CONSTRAINTS ===');
  const cons = await conn.execute(
    `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'ACCOUNT'`
  );
  console.table(cons.rows);

  await conn.close();
}
inspectTriggers().catch(console.error);
