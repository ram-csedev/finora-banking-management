const { getConnection } = require('../backend/db');

async function test() {
  const conn = await getConnection();
  await conn.execute('DELETE FROM "TRANSACTION" WHERE t_id = 9705');
  await conn.execute('INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (9705, 401, SYSDATE, \'TRANSFER\', 5000, \'ONLINE\', \'SUCCESS\')');
  await conn.commit();
  await conn.close();

  const pRes = await fetch('http://127.0.0.1:5000/api/transactions/9705/delete-preview');
  const p = await pRes.json();
  console.log('Preview (Status ' + pRes.status + '):', p);

  const dRes = await fetch('http://127.0.0.1:5000/api/transactions/9705', { method: 'DELETE' });
  const d = await dRes.json();
  console.log('Delete (Status ' + dRes.status + '):', d);

  const conn2 = await getConnection();
  await conn2.execute('DELETE FROM "TRANSACTION" WHERE t_id = 9705');
  await conn2.commit();
  await conn2.close();
}

test().catch(console.error);
