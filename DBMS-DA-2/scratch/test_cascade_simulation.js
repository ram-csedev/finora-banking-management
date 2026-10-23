const { getConnection } = require('../backend/db');
const crypto = require('crypto');

function computePreviewSignature(entity, id, counts) {
    const sortedCounts = Object.keys(counts).sort().reduce((acc, k) => {
        acc[k] = counts[k];
        return acc;
    }, {});
    const payload = JSON.stringify({ entity, id: String(id), counts: sortedCounts });
    return crypto.createHash('sha256').update(payload).digest('hex');
}

(async () => {
    let conn;
    try {
        conn = await getConnection();
        console.log('Connected to Oracle XE for disposable test record verification.');

        const TEST_BID = 9101;
        const TEST_EMPID = 9201;
        const TEST_CID = 9301;
        const TEST_SHARED_CID = 9302;
        const TEST_ACCID = 9401;
        const TEST_SHARED_ACCID = 9402;
        const TEST_LID = 9501;
        const TEST_TID = 9701;
        const TEST_PNO = '9999888877776666';
        const TEST_NID = 9601;
        const TEST_SHARED_NID = 9602;
        const TEST_PHONE = '9876599999';

        async function cleanup() {
            try {
                await conn.execute('DELETE FROM Responsible_For WHERE emp_id = :1 OR b_id = :2 OR l_id = :3 OR t_id = :4', [TEST_EMPID, TEST_BID, TEST_LID, TEST_TID]);
                await conn.execute('DELETE FROM "TRANSACTION" WHERE acc_id IN (:1, :2) OR t_id = :3', [TEST_ACCID, TEST_SHARED_ACCID, TEST_TID]);
                await conn.execute('DELETE FROM Loan WHERE l_id = :1', [TEST_LID]);
                await conn.execute('DELETE FROM CreditCard WHERE pno = :1', [TEST_PNO]);
                await conn.execute('DELETE FROM Owns WHERE cid IN (:1, :2) OR acc_id IN (:3, :4) OR n_id IN (:5, :6)', [TEST_CID, TEST_SHARED_CID, TEST_ACCID, TEST_SHARED_ACCID, TEST_NID, TEST_SHARED_NID]);
                await conn.execute('DELETE FROM Nominee WHERE n_id IN (:1, :2) OR cid IN (:3, :4) OR acc_id IN (:5, :6)', [TEST_NID, TEST_SHARED_NID, TEST_CID, TEST_SHARED_CID, TEST_ACCID, TEST_SHARED_ACCID]);
                await conn.execute('DELETE FROM Account WHERE acc_id IN (:1, :2)', [TEST_ACCID, TEST_SHARED_ACCID]);
                await conn.execute('DELETE FROM Customer_Phone WHERE cid IN (:1, :2)', [TEST_CID, TEST_SHARED_CID]);
                await conn.execute('DELETE FROM Customer WHERE cid IN (:1, :2)', [TEST_CID, TEST_SHARED_CID]);
                await conn.execute('DELETE FROM Employee WHERE emp_id = :1', [TEST_EMPID]);
                await conn.execute('DELETE FROM Branch WHERE b_id = :1', [TEST_BID]);
                await conn.commit();
            } catch (e) {
                console.warn('Cleanup warning:', e.message);
                try { await conn.rollback(); } catch (_) {}
            }
        }

        await cleanup();
        console.log('Cleanup completed.');

        // Insert branch & employee
        await conn.execute(`INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact, status)
            VALUES (:1, 'Test Branch', 'Test City', 'Test State', '110001', 'TEST0009101', '9876500000', 'ACTIVE')`, [TEST_BID]);
        await conn.execute(`INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id, status)
            VALUES (:1, 'Test', 'Employee', 50000, SYSDATE, :2, 'ACTIVE')`, [TEST_EMPID, TEST_BID]);

        // Insert primary customer and shared customer
        await conn.execute(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
            VALUES (:1, 'TSTPN9301A', 'TestPrimary', 'User', 'City', 'State', '110001', TO_DATE('1990-01-01', 'YYYY-MM-DD'), :2, 'ACTIVE')`, [TEST_CID, TEST_EMPID]);
        await conn.execute(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
            VALUES (:1, 'TSTPN9302B', 'TestShared', 'User', 'City', 'State', '110001', TO_DATE('1992-02-02', 'YYYY-MM-DD'), :2, 'ACTIVE')`, [TEST_SHARED_CID, TEST_EMPID]);

        // Phone for primary
        await conn.execute(`INSERT INTO Customer_Phone (cid, phone) VALUES (:1, :2)`, [TEST_CID, TEST_PHONE]);

        // Accounts: primary account with 0 balance, shared account
        await conn.execute(`INSERT INTO Account (acc_id, balance, status, acc_type, cid)
            VALUES (:1, 0, 'ACTIVE', 'Savings', :2)`, [TEST_ACCID, TEST_CID]);
        await conn.execute(`INSERT INTO Account (acc_id, balance, status, acc_type, cid)
            VALUES (:1, 5000, 'ACTIVE', 'Savings', :2)`, [TEST_SHARED_ACCID, TEST_SHARED_CID]);

        // Transaction on primary account
        await conn.execute(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
            VALUES (:1, :2, SYSDATE, 'DEPOSIT', 1000, 'ONLINE', 'SUCCESS')`, [TEST_TID, TEST_ACCID]);

        // Credit card and loan for primary customer
        await conn.execute(`INSERT INTO CreditCard (pno, type, card_limit, expiry, status, cvv, cid)
            VALUES (:1, 'VISA', 50000, TO_DATE('2028-12-31', 'YYYY-MM-DD'), 'ACTIVE', '123', :2)`, [TEST_PNO, TEST_CID]);
        await conn.execute(`INSERT INTO Loan (l_id, cid, l_type, amount, interest, term, status)
            VALUES (:1, :2, 'Personal', 100000, 8.5, 12, 'ACTIVE')`, [TEST_LID, TEST_CID]);
        await conn.execute(`INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (:1, :2, :3, :4)`, [TEST_EMPID, TEST_TID, TEST_LID, TEST_BID]);

        // Nominees: 1 unshared for primary, 1 shared with both customers
        await conn.execute(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id)
            VALUES (:1, 'Sole', 'Nominee', 'Spouse', TO_DATE('1995-05-05', 'YYYY-MM-DD'), :2, :3)`, [TEST_NID, TEST_CID, TEST_ACCID]);
        await conn.execute(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (:1, :2, :3)`, [TEST_CID, TEST_ACCID, TEST_NID]);

        await conn.execute(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id)
            VALUES (:1, 'Shared', 'Nominee', 'Brother', TO_DATE('1996-06-06', 'YYYY-MM-DD'), :2, :3)`, [TEST_SHARED_NID, TEST_CID, TEST_ACCID]);
        await conn.execute(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (:1, :2, :3)`, [TEST_CID, TEST_ACCID, TEST_SHARED_NID]);
        await conn.execute(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (:1, :2, :3)`, [TEST_SHARED_CID, TEST_SHARED_ACCID, TEST_SHARED_NID]);

        await conn.commit();
        console.log('Sample test records successfully seeded.');

        // Test cascade deletion of primary customer TEST_CID with academic_override = true
        console.log('Executing cascade delete of Customer 9301 with academic_override = true...');

        // 1. Transactions & Transaction responsibilities
        await conn.execute(`DELETE FROM Responsible_For 
                            WHERE t_id IN (SELECT t_id FROM "TRANSACTION" WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))`, { p_cid: TEST_CID });
        await conn.execute(`DELETE FROM "TRANSACTION" 
                            WHERE acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)`, { p_cid: TEST_CID });

        // 2. Loans & Loan responsibilities
        await conn.execute('DELETE FROM Responsible_For WHERE l_id IN (SELECT l_id FROM Loan WHERE cid = :p_cid)', { p_cid: TEST_CID });
        await conn.execute('DELETE FROM Loan WHERE cid = :p_cid', { p_cid: TEST_CID });

        // 3. Credit cards
        await conn.execute('DELETE FROM CreditCard WHERE cid = :p_cid', { p_cid: TEST_CID });

        // 4. Owns links
        await conn.execute('DELETE FROM Owns WHERE cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid)', { p_cid: TEST_CID });

        // 5. Unlink shared nominees
        await conn.execute(`UPDATE Nominee SET cid = NULL, acc_id = NULL 
                            WHERE (cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))
                              AND n_id IN (SELECT n_id FROM Owns WHERE cid <> :p_cid)`, { p_cid: TEST_CID });

        // 6. Delete unshared nominees
        await conn.execute(`DELETE FROM Nominee 
                            WHERE (cid = :p_cid OR acc_id IN (SELECT acc_id FROM Account WHERE cid = :p_cid))
                              AND n_id NOT IN (SELECT n_id FROM Owns WHERE cid <> :p_cid)`, { p_cid: TEST_CID });

        // 7. Accounts
        await conn.execute('DELETE FROM Account WHERE cid = :p_cid', { p_cid: TEST_CID });

        // 8. Phones
        await conn.execute('DELETE FROM Customer_Phone WHERE cid = :p_cid', { p_cid: TEST_CID });

        // 9. Customer
        await conn.execute('DELETE FROM Customer WHERE cid = :p_cid', { p_cid: TEST_CID });

        await conn.commit();
        console.log('Cascade delete executed successfully!');

        // Check if shared nominee still exists
        const sharedNomCheck = await conn.execute('SELECT n_id, first_name FROM Nominee WHERE n_id = :1', [TEST_SHARED_NID]);
        console.log('Shared Nominee still in DB:', sharedNomCheck.rows.length === 1 ? 'YES (Preserved!)' : 'NO (Failed)');

        // Check if shared customer still exists
        const sharedCustCheck = await conn.execute('SELECT cid FROM Customer WHERE cid = :1', [TEST_SHARED_CID]);
        console.log('Shared Customer still in DB:', sharedCustCheck.rows.length === 1 ? 'YES (Preserved!)' : 'NO (Failed)');

        // Check if shared account still exists
        const sharedAccCheck = await conn.execute('SELECT acc_id FROM Account WHERE acc_id = :1', [TEST_SHARED_ACCID]);
        console.log('Shared Account still in DB:', sharedAccCheck.rows.length === 1 ? 'YES (Preserved!)' : 'NO (Failed)');

        // Cleanup remainder
        await cleanup();
        console.log('Final cleanup completed successfully.');
    } catch (err) {
        console.error('Simulation error:', err);
        if (conn) { try { await conn.rollback(); } catch (_) {} }
    } finally {
        if (conn) await conn.close();
    }
})();
