const { getConnection } = require('../backend/db');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function api(path, options = {}) {
    const res = await fetch(BASE_URL + path, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, ok: res.ok, data };
}

let conn;
async function sql(statement, binds = []) {
    return await conn.execute(statement, binds);
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  [PASS] Scenario ${testName}`);
    } else {
        console.error(`  [FAIL] Scenario ${testName} - ${details}`);
    }
}

async function cleanupDisposableRecords() {
    try {
        await sql(`DELETE FROM Responsible_For WHERE emp_id >= 9000 OR b_id >= 9000 OR l_id >= 9000 OR t_id >= 9000`);
        await sql(`DELETE FROM "TRANSACTION" WHERE t_id >= 9000 OR acc_id >= 9000`);
        await sql(`DELETE FROM Loan WHERE l_id >= 9000 OR cid >= 9000`);
        await sql(`DELETE FROM CreditCard WHERE cid >= 9000 OR pno LIKE '9999%'`);
        await sql(`DELETE FROM Owns WHERE cid >= 9000 OR acc_id >= 9000 OR n_id >= 9000`);
        await sql(`DELETE FROM Nominee WHERE n_id >= 9000 OR cid >= 9000 OR acc_id >= 9000`);
        await sql(`DELETE FROM Account WHERE acc_id >= 9000 OR cid >= 9000`);
        await sql(`DELETE FROM Customer_Phone WHERE cid >= 9000 OR phone LIKE '99999%'`);
        await sql(`DELETE FROM Customer WHERE cid >= 9000`);
        await sql(`DELETE FROM Employee WHERE emp_id >= 9000`);
        await sql(`DELETE FROM Branch WHERE b_id >= 9000`);
        await conn.commit();
    } catch (e) {
        console.warn('Cleanup notice:', e.message);
        try { await conn.rollback(); } catch (_) {}
    }
}

(async () => {
    try {
        conn = await getConnection();
        console.log('================================================================');
        console.log('FINORA DBMS DA 2 — CASCADE & TRANSACTION VERIFICATION SUITE');
        console.log('================================================================\n');

        // Record initial baseline counts to verify no corruption
        const baselineTables = ['BRANCH', 'EMPLOYEE', 'CUSTOMER', 'CUSTOMER_PHONE', 'ACCOUNT', 'NOMINEE', 'OWNS', 'CREDITCARD', 'LOAN', 'TRANSACTION', 'RESPONSIBLE_FOR'];
        const initialCounts = {};
        for (const t of baselineTables) {
            const countRes = await sql(`SELECT COUNT(*) FROM "${t}" WHERE ${t === 'CREDITCARD' ? 'CID < 9000' : (t === 'CUSTOMER_PHONE' ? 'CID < 9000' : (t === 'OWNS' ? 'CID < 9000' : (t === 'RESPONSIBLE_FOR' ? 'EMP_ID < 9000' : '1=1')))}`);
            initialCounts[t] = countRes.rows[0][0];
        }
        console.log('Initial baseline table records:', initialCounts);

        await cleanupDisposableRecords();

        // -------------------------------------------------------------
        // PART 1: VERIFY ALL EIGHT DELETION PREVIEW ENDPOINTS (No ORA-00904)
        // -------------------------------------------------------------
        console.log('\n--- PART 1: Verify All Eight Deletion Preview Endpoints ---');

        // 1. Customer Preview (Baseline #301)
        const pCust = await api('/customers/301/delete-preview');
        assert(pCust.status === 200 && pCust.data.target.id === 301 && !pCust.data.error,
               '1: Customer preview works without STATUS error', JSON.stringify(pCust.data));

        // 2. Loan Preview (Baseline #601 and #602)
        const pLoan601 = await api('/loans/601/delete-preview');
        const pLoan602 = await api('/loans/602/delete-preview');
        assert(pLoan601.status === 200 && pLoan602.status === 200 && pLoan602.data.target.id === 602 && !pLoan602.data.error,
               '2: Loan preview works without STATUS error (Loan #601 & #602)', JSON.stringify(pLoan602.data));

        // 3. Branch Preview (Baseline #101)
        const pBranch = await api('/branches/101/delete-preview');
        assert(pBranch.status === 200 && pBranch.data.target.id === 101 && !pBranch.data.error,
               '3: Branch preview works without STATUS error', JSON.stringify(pBranch.data));

        // 4. Employee Preview (Baseline #201)
        const pEmp = await api('/employees/201/delete-preview');
        assert(pEmp.status === 200 && pEmp.data.target.id === 201 && !pEmp.data.error,
               '4: Employee preview works without STATUS error', JSON.stringify(pEmp.data));

        // 5. CreditCard Preview (Baseline '4111111111111111')
        const pCard = await api('/creditcards/4111111111111111/delete-preview');
        assert(pCard.status === 200 && pCard.data.target.entity === 'CreditCard' && !pCard.data.error,
               '5: Credit-card preview works cleanly', JSON.stringify(pCard.data));

        // 6. Account Preview (Baseline #401)
        const pAcc = await api('/accounts/401/delete-preview');
        assert(pAcc.status === 200 && pAcc.data.target.id === 401 && !pAcc.data.error,
               '6: Account preview works cleanly', JSON.stringify(pAcc.data));

        // 7. Nominee Preview (Baseline #501)
        const pNom = await api('/nominees/501/delete-preview');
        assert(pNom.status === 200 && pNom.data.target.id === 501 && !pNom.data.error,
               '7: Nominee preview works cleanly', JSON.stringify(pNom.data));

        // 8. Customer Phone Preview (Baseline Customer 301, Phone 9876500001)
        const pPhone = await api('/customers/301/phones/9876500001/delete-preview');
        assert(pPhone.status === 200 && pPhone.data.target.phone === '9876500001' && !pPhone.data.error,
               '8: Customer phone preview works cleanly', JSON.stringify(pPhone.data));

        // -------------------------------------------------------------
        // PART 2: TRANSACTION DELETE & FINANCIAL REVERSAL WORKFLOW
        // -------------------------------------------------------------
        console.log('\n--- PART 2: Transaction Delete & Financial Reversal Workflow ---');

        // Setup disposable Account 9401 with initial balance 50,000 for Customer 9001
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name) VALUES (9001, 'TXPAN9001A', 'TxUser', 'One')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9401, 50000, 'ACTIVE', 'SAVINGS', 9001)`);
        await conn.commit();

        // 9a. Canceling a transaction deletion changes neither the balance nor the transaction record
        console.log('Testing 9a: Cancel transaction deletion preserves balance and record...');
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9701, 9401, SYSDATE, 'DEPOSIT', 5000, 'ONLINE', 'SUCCESS')`);
        await conn.commit();
        // Trigger added 5000 -> balance is now 55000
        const prevBalRes9a = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        const prevBal9a = prevBalRes9a.rows[0][0];
        assert(prevBal9a === 55000, '9a-1: Account balance accurately reflects 55,000 after deposit insert');

        const pTx9701 = await api('/transactions/9701/delete-preview');
        assert(pTx9701.status === 200 && pTx9701.data.can_delete === true && pTx9701.data.new_balance === 50000,
               '9a-2: Preview accurately projects balance decreasing to 50,000 upon deposit deletion');

        // Cancel simulated: client makes no DELETE request
        const checkBalAfterCancel = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        const checkTxAfterCancel = await sql('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 9701');
        assert(checkBalAfterCancel.rows[0][0] === 55000 && checkTxAfterCancel.rows[0][0] === 1,
               '9a-3: Canceling deletion changes neither account balance nor transaction record');

        // 9b. A successful deposit reversal decreases the balance by the correct amount exactly once
        console.log('\nTesting 9b: Deposit reversal decreases balance by correct amount exactly once...');
        const dTx9701 = await api('/transactions/9701', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pTx9701.data.preview_signature })
        });
        const balAfterDepRev = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        const txCountAfterDepRev = await sql('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 9701');
        assert(dTx9701.status === 200 && balAfterDepRev.rows[0][0] === 50000 && txCountAfterDepRev.rows[0][0] === 0,
               '9b: Successful deposit deletion reversed balance (55000 -> 50000) exactly once and deleted row');

        // 9c. A successful withdrawal reversal increases the balance by the correct amount exactly once
        console.log('\nTesting 9c: Withdrawal reversal increases balance by correct amount exactly once...');
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9702, 9401, SYSDATE, 'WITHDRAWAL', 12000, 'ATM', 'SUCCESS')`);
        await conn.commit();
        // Trigger deducted 12000 -> balance is now 38000
        const balAfterWithInsert = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        assert(balAfterWithInsert.rows[0][0] === 38000, '9c-1: Balance is 38,000 after 12,000 withdrawal');

        const pTx9702 = await api('/transactions/9702/delete-preview');
        assert(pTx9702.status === 200 && pTx9702.data.new_balance === 50000 && pTx9702.data.balance_effect === 12000,
               '9c-2: Preview projects balance increasing to 50,000 upon withdrawal deletion');

        const dTx9702 = await api('/transactions/9702', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pTx9702.data.preview_signature })
        });
        const balAfterWithRev = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        const txCountAfterWithRev = await sql('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 9702');
        assert(dTx9702.status === 200 && balAfterWithRev.rows[0][0] === 50000 && txCountAfterWithRev.rows[0][0] === 0,
               '9c-3: Successful withdrawal deletion credited balance (38000 -> 50000) exactly once and deleted row');

        // 9d. Failed reversal rolls back all database changes (insufficient balance protection)
        console.log('\nTesting 9d: Failed reversal rolls back all database changes...');
        // Lower balance to 1,000 directly
        await sql('UPDATE Account SET balance = 1000 WHERE acc_id = 9401');
        // Insert a 5,000 deposit via manual SQL without trigger update
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9703, 9401, SYSDATE, 'DEPOSIT', 5000, 'ONLINE', 'FAILED')`);
        await sql(`UPDATE "TRANSACTION" SET status = 'SUCCESS' WHERE t_id = 9703`);
        await conn.commit();

        const pTx9703 = await api('/transactions/9703/delete-preview');
        assert(pTx9703.status === 200 && pTx9703.data.can_delete === false && pTx9703.data.rejection_reason.includes('Insufficient balance'),
               '9d-1: Preview detects insufficient balance (1000 < 5000) and marks can_delete=false');

        const dTx9703 = await api('/transactions/9703', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pTx9703.data.preview_signature })
        });
        const balAfterFail = await sql('SELECT balance FROM Account WHERE acc_id = 9401');
        const txAfterFail = await sql('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 9703');
        assert(dTx9703.status === 400 && balAfterFail.rows[0][0] === 1000 && txAfterFail.rows[0][0] === 1,
               '9d-2: Deletion rejected with HTTP 400; transaction and account balance preserved without modification');

        // 9e. Repeated deletion cannot reverse the same transaction twice
        console.log('\nTesting 9e: Repeated deletion cannot reverse the same transaction twice...');
        // Delete a valid transaction first
        await sql('UPDATE Account SET balance = 20000 WHERE acc_id = 9401');
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9704, 9401, SYSDATE, 'WITHDRAWAL', 5000, 'ATM', 'SUCCESS')`);
        await conn.commit();
        // Balance is 15000
        const pTx9704 = await api('/transactions/9704/delete-preview');
        const dTx9704_first = await api('/transactions/9704', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pTx9704.data.preview_signature })
        });
        assert(dTx9704_first.status === 200, '9e-1: First deletion succeeds');

        const dTx9704_second = await api('/transactions/9704', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pTx9704.data.preview_signature })
        });
        assert(dTx9704_second.status === 404, '9e-2: Second deletion returns 404 Not Found (prevents double reversal)');

        // 9f. Unsupported transaction types or statuses are safely rejected
        console.log('\nTesting 9f: Unsupported transaction types or already REVERSED are rejected...');
        // Insert a TRANSFER transaction
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9705, 9401, SYSDATE, 'TRANSFER', 5000, 'ONLINE', 'SUCCESS')`);
        // Insert an already REVERSED transaction
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9706, 9401, SYSDATE, 'DEPOSIT', 5000, 'ONLINE', 'REVERSED')`);
        await conn.commit();

        const pTx9705 = await api('/transactions/9705/delete-preview');
        const dTx9705 = await api('/transactions/9705', { method: 'DELETE' });
        assert(pTx9705.data.can_delete === false && dTx9705.status === 400 && dTx9705.data.error.includes('TRANSFER'),
               '9f-1: Unsupported transaction type TRANSFER is rejected with HTTP 400');

        const pTx9706 = await api('/transactions/9706/delete-preview');
        const dTx9706 = await api('/transactions/9706', { method: 'DELETE' });
        assert(pTx9706.data.can_delete === false && dTx9706.status === 400 && dTx9706.data.error.includes('already marked as REVERSED'),
               '9f-2: Already REVERSED transaction deletion is safely rejected with HTTP 400');

        // -------------------------------------------------------------
        // PART 3: EXISTING FINANCIAL-HISTORY SAFEGUARDS IN CASCADES
        // -------------------------------------------------------------
        console.log('\n--- PART 3: Existing Financial-History Safeguards in Cascades ---');

        // 10. Customer with transactions rejected without override
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name) VALUES (9010, 'TXPAN9010Z', 'Safeguard', 'Cust')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9410, 5000, 'ACTIVE', 'SAVINGS', 9010)`);
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9710, 9410, SYSDATE, 'DEPOSIT', 1000, 'ONLINE', 'SUCCESS')`);
        await conn.commit();

        const pCust10 = await api('/customers/9010/delete-preview');
        assert(pCust10.status === 200 && pCust10.data.has_protected_history === true && pCust10.data.can_delete === false,
               '10a: Customer preview identifies protected financial history (transactions exist)');

        const dCust10_noOverride = await api('/customers/9010', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pCust10.data.preview_signature, academic_override: false })
        });
        assert(dCust10_noOverride.status === 400 && dCust10_noOverride.data.protected_financial_history === true,
               '10b: Customer deletion rejected with HTTP 400 without academic override');

        const dCust10_withOverride = await api('/customers/9010', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: pCust10.data.preview_signature, academic_override: true })
        });
        const checkCust10 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9010');
        assert(dCust10_withOverride.status === 200 && checkCust10.rows[0][0] === 0,
               '10c: Customer deletion executes with explicit academic override');

        // 11. Stale preview signature rejection (HTTP 409)
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name) VALUES (9011, 'TXPAN9011Z', 'Stale', 'Test')`);
        await conn.commit();
        const p11 = await api('/customers/9011/delete-preview');
        // Simulate data change
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9011, '9999900011')`);
        await conn.commit();

        const d11Stale = await api('/customers/9011', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p11.data.preview_signature })
        });
        assert(d11Stale.status === 409 && d11Stale.data.stale_preview === true,
               '11: Stale preview signature correctly rejected with HTTP 409 Conflict');

        // Clean up
        await cleanupDisposableRecords();

        // -------------------------------------------------------------
        // PART 4: POST-TEST BASELINE INTEGRITY VERIFICATION
        // -------------------------------------------------------------
        console.log('\n--- PART 4: Baseline Production Integrity Verification ---');
        let allBaselineIntact = true;
        for (const t of baselineTables) {
            const countRes = await sql(`SELECT COUNT(*) FROM "${t}" WHERE ${t === 'CREDITCARD' ? 'CID < 9000' : (t === 'CUSTOMER_PHONE' ? 'CID < 9000' : (t === 'OWNS' ? 'CID < 9000' : (t === 'RESPONSIBLE_FOR' ? 'EMP_ID < 9000' : '1=1')))}`);
            const currentCount = countRes.rows[0][0];
            const originalCount = initialCounts[t];
            if (currentCount !== originalCount) {
                console.error(`  [FAIL] Baseline table ${t} modified! Expected ${originalCount}, got ${currentCount}`);
                allBaselineIntact = false;
            } else {
                console.log(`  [OK] Table ${t}: ${currentCount} baseline records intact`);
            }
        }
        assert(allBaselineIntact, '12: All baseline production records remain completely unchanged');

        console.log('\n================================================================');
        console.log(`FINAL RESULT: ${passedTests} / ${totalTests} TESTS PASSED`);
        console.log('================================================================');

        process.exit(passedTests === totalTests ? 0 : 1);
    } catch (err) {
        console.error('Fatal test suite failure:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.close();
    }
})();
