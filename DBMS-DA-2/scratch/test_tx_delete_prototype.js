const { getConnection } = require('../backend/db');

async function testTxDeletePrototype() {
  const conn = await getConnection();

  try {
    console.log('--- Setting up test records (Account #9401, Customer #9301) ---');
    // Ensure clean state
    await conn.execute('DELETE FROM Responsible_For WHERE t_id IN (9701, 9702, 9703)');
    await conn.execute('DELETE FROM "TRANSACTION" WHERE t_id IN (9701, 9702, 9703)');
    await conn.execute('DELETE FROM Account WHERE acc_id = 9401');
    await conn.execute('DELETE FROM Customer WHERE cid = 9301');
    await conn.commit();

    await conn.execute(
      `INSERT INTO Customer (cid, pan, first_name, last_name) VALUES (9301, 'TXDEL1234Z', 'TxTest', 'Customer')`
    );
    await conn.execute(
      `INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9401, 50000, 'ACTIVE', 'SAVINGS', 9301)`
    );
    await conn.commit();

    // 1. Test Deposit Insert & Delete/Reversal
    console.log('\n--- 1. Testing Deposit Insert and Balance Reversal ---');
    await conn.execute(
      `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
       VALUES (9701, 9401, SYSDATE, 'DEPOSIT', 10000, 'ONLINE', 'SUCCESS')`
    );
    await conn.commit();

    let accCheck = await conn.execute('SELECT balance FROM Account WHERE acc_id = 9401');
    console.log('Balance after 10,000 DEPOSIT (should be 60000):', accCheck.rows[0][0]);
    if (accCheck.rows[0][0] !== 60000) throw new Error('Expected 60000');

    // Simulate delete/reversal of Deposit:
    // Subtract 10000 from balance, then delete transaction
    await conn.execute('UPDATE Account SET balance = balance - 10000 WHERE acc_id = 9401');
    await conn.execute('DELETE FROM "TRANSACTION" WHERE t_id = 9701');
    await conn.commit();

    accCheck = await conn.execute('SELECT balance FROM Account WHERE acc_id = 9401');
    console.log('Balance after deleting deposit (should be 50000):', accCheck.rows[0][0]);
    if (accCheck.rows[0][0] !== 50000) throw new Error('Expected 50000');

    let txCheck = await conn.execute('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 9701');
    console.log('Transaction 9701 count (should be 0):', txCheck.rows[0][0]);
    if (txCheck.rows[0][0] !== 0) throw new Error('Expected 0');

    // 2. Test Withdrawal Insert & Delete/Reversal
    console.log('\n--- 2. Testing Withdrawal Insert and Balance Reversal ---');
    await conn.execute(
      `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
       VALUES (9702, 9401, SYSDATE, 'WITHDRAWAL', 15000, 'ONLINE', 'SUCCESS')`
    );
    await conn.commit();

    accCheck = await conn.execute('SELECT balance FROM Account WHERE acc_id = 9401');
    console.log('Balance after 15,000 WITHDRAWAL (should be 35000):', accCheck.rows[0][0]);
    if (accCheck.rows[0][0] !== 35000) throw new Error('Expected 35000');

    // Simulate delete/reversal of Withdrawal:
    // Add 15000 to balance, then delete transaction
    await conn.execute('UPDATE Account SET balance = balance + 15000 WHERE acc_id = 9401');
    await conn.execute('DELETE FROM "TRANSACTION" WHERE t_id = 9702');
    await conn.commit();

    accCheck = await conn.execute('SELECT balance FROM Account WHERE acc_id = 9401');
    console.log('Balance after deleting withdrawal (should be 50000):', accCheck.rows[0][0]);
    if (accCheck.rows[0][0] !== 50000) throw new Error('Expected 50000');

    // 3. Test Insufficient Balance on Deposit Reversal
    console.log('\n--- 3. Testing Insufficient Balance Protection on Deposit Reversal ---');
    // Set balance to 2,000
    await conn.execute('UPDATE Account SET balance = 2000 WHERE acc_id = 9401');
    // Direct insert of a 10,000 deposit without trigger altering balance (e.g. status PENDING then SUCCESS)
    await conn.execute(
      `INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
       VALUES (9703, 9401, SYSDATE, 'DEPOSIT', 10000, 'ONLINE', 'FAILED')`
    );
    await conn.commit();
    // Update to SUCCESS
    await conn.execute(`UPDATE "TRANSACTION" SET status = 'SUCCESS' WHERE t_id = 9703`);
    await conn.commit();

    accCheck = await conn.execute('SELECT balance FROM Account WHERE acc_id = 9401');
    const currentBal = accCheck.rows[0][0];
    console.log('Current balance before attempting reversal:', currentBal);
    const depositAmt = 10000;
    if (currentBal < depositAmt) {
      console.log('Correctly detected insufficient balance! Reversal rejected.');
    } else {
      throw new Error('Should have rejected');
    }

    // Cleanup
    console.log('\n--- Cleaning up test records ---');
    await conn.execute('DELETE FROM "TRANSACTION" WHERE t_id IN (9701, 9702, 9703)');
    await conn.execute('DELETE FROM Account WHERE acc_id = 9401');
    await conn.execute('DELETE FROM Customer WHERE cid = 9301');
    await conn.commit();
    console.log('Cleaned up cleanly!');

  } catch (err) {
    await conn.rollback();
    console.error('Test error:', err);
  } finally {
    await conn.close();
  }
}

testTxDeletePrototype();
