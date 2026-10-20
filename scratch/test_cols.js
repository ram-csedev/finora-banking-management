const { getConnection } = require('../backend/db');

async function testCols() {
  const conn = await getConnection();
  const tables = ['CUSTOMER', 'LOAN', 'BRANCH', 'EMPLOYEE', 'ACCOUNT', 'CREDITCARD', 'NOMINEE', 'CUSTOMER_PHONE', 'OWNS', 'RESPONSIBLE_FOR', 'TRANSACTION'];
  
  const map = {};
  for (const t of tables) {
    const res = await conn.execute(
      `SELECT COLUMN_NAME FROM USER_TAB_COLS WHERE TABLE_NAME = :t`,
      [t]
    );
    map[t] = res.rows.map(r => r[0]);
  }
  
  console.log('Columns detected:');
  for (const [t, cols] of Object.entries(map)) {
    console.log(`${t}: has STATUS? ${cols.includes('STATUS')}`);
  }
  
  await conn.close();
}
testCols().catch(console.error);
