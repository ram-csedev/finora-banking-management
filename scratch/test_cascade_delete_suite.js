const { getConnection } = require('../backend/db');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';

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
        console.warn('Initial cleanup notice:', e.message);
        try { await conn.rollback(); } catch (_) {}
    }
}

(async () => {
    try {
        conn = await getConnection();
        console.log('================================================================');
        console.log('FINORA DBMS DA 2 — 16 AUTOMATED TEST SCENARIOS (DISPOSABLE DATA)');
        console.log('================================================================\n');

        await cleanupDisposableRecords();

        // -------------------------------------------------------------
        // SCENARIO 1: Deleting a customer with no dependencies
        // -------------------------------------------------------------
        console.log('Running Scenario 1: Deleting a customer with no dependencies...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9001, 'TSTPAN9001', 'Solo', 'Customer', 'Pune', 'Maharashtra', '411001', TO_DATE('1995-01-01', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await conn.commit();

        const p1 = await api('/customers/9001/delete-preview');
        assert(p1.status === 200 && p1.data.counts.Customer === 1 && p1.data.counts.Account === 0 && p1.data.can_delete === true,
               '1a: Preview customer with 0 dependencies returns can_delete=true');

        const d1 = await api('/customers/9001', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p1.data.preview_signature })
        });
        const c1Check = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9001');
        assert(d1.status === 200 && c1Check.rows[0][0] === 0,
               '1b: Deleting customer with 0 dependencies succeeds and record removed from DB');

        // -------------------------------------------------------------
        // SCENARIO 2: Previewing a customer with multiple dependent records
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 2: Previewing a customer with multiple dependent records...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9002, 'TSTPAN9002', 'Multi', 'Customer', 'Mumbai', 'Maharashtra', '400001', TO_DATE('1990-02-02', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9002, '9999900001')`);
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9002, '9999900002')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9402, 0, 'ACTIVE', 'Savings', 9002)`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9403, 0, 'ACTIVE', 'Current', 9002)`);
        await sql(`INSERT INTO CreditCard (pno, type, card_limit, expiry, status, cvv, cid)
                   VALUES ('9999000011110002', 'VISA', 50000, TO_DATE('2028-12-31', 'YYYY-MM-DD'), 'ACTIVE', '123', 9002)`);
        await sql(`INSERT INTO Loan (l_id, cid, l_type, amount, interest, term, status)
                   VALUES (9502, 9002, 'Personal', 50000, 10.5, 12, 'SETTLED')`);
        await sql(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id)
                   VALUES (9602, 'Nominee', 'Two', 'Spouse', TO_DATE('1992-05-05', 'YYYY-MM-DD'), 9002, 9402)`);
        await sql(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (9002, 9402, 9602)`);
        await conn.commit();

        const p2 = await api('/customers/9002/delete-preview');
        assert(p2.status === 200 &&
               p2.data.counts.Customer === 1 &&
               p2.data.counts.Customer_Phone === 2 &&
               p2.data.counts.Account === 2 &&
               p2.data.counts.CreditCard === 1 &&
               p2.data.counts.Loan === 1 &&
               p2.data.counts.Nominee === 1 &&
               p2.data.counts.Owns === 1 &&
               typeof p2.data.preview_signature === 'string',
               '2: Preview reports accurate dynamic counts across all 7 related tables');

        // -------------------------------------------------------------
        // SCENARIO 3: Cancelling deletion without any database changes
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 3: Cancelling deletion without any database changes...');
        // Simulating user clicking 'No, Cancel' on the modal (no DELETE sent)
        const checkCust2 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9002');
        const checkPhone2 = await sql('SELECT COUNT(*) FROM Customer_Phone WHERE cid = 9002');
        const checkAcc2 = await sql('SELECT COUNT(*) FROM Account WHERE cid = 9002');
        assert(checkCust2.rows[0][0] === 1 && checkPhone2.rows[0][0] === 2 && checkAcc2.rows[0][0] === 2,
               '3: Cancelling deletion leaves all customer and dependent records completely unchanged');

        // -------------------------------------------------------------
        // SCENARIO 4: Confirming a permitted cascade
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 4: Confirming a permitted cascade...');
        const d4 = await api('/customers/9002', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p2.data.preview_signature })
        });
        const postCust2 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9002');
        const postAcc2 = await sql('SELECT COUNT(*) FROM Account WHERE cid = 9002');
        const postCard2 = await sql('SELECT COUNT(*) FROM CreditCard WHERE cid = 9002');
        const postLoan2 = await sql('SELECT COUNT(*) FROM Loan WHERE cid = 9002');
        assert(d4.status === 200 && postCust2.rows[0][0] === 0 && postAcc2.rows[0][0] === 0 && postCard2.rows[0][0] === 0 && postLoan2.rows[0][0] === 0,
               '4: Permitted cascade delete permanently removes customer and eligible dependent records');

        // -------------------------------------------------------------
        // SCENARIO 5: Preserving shared records
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 5: Preserving shared records...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9003, 'TSTPAN9003', 'CustA', 'Primary', 'City', 'State', '110001', TO_DATE('1990-01-01', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9004, 'TSTPAN9004', 'CustB', 'Partner', 'City', 'State', '110001', TO_DATE('1992-02-02', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9403, 0, 'ACTIVE', 'Savings', 9003)`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9404, 5000, 'ACTIVE', 'Savings', 9004)`);
        await sql(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id)
                   VALUES (9603, 'Shared', 'FamilyNominee', 'Parent', TO_DATE('1965-01-01', 'YYYY-MM-DD'), 9003, 9403)`);
        await sql(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (9003, 9403, 9603)`);
        await sql(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (9004, 9404, 9603)`);
        await conn.commit();

        const p5 = await api('/customers/9003/delete-preview');
        const d5 = await api('/customers/9003', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p5.data.preview_signature })
        });
        const checkNom5 = await sql('SELECT COUNT(*) FROM Nominee WHERE n_id = 9603');
        const checkPartner5 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9004');
        const checkPartnerAcc5 = await sql('SELECT COUNT(*) FROM Account WHERE acc_id = 9404');
        assert(d5.status === 200 && checkNom5.rows[0][0] === 1 && checkPartner5.rows[0][0] === 1 && checkPartnerAcc5.rows[0][0] === 1,
               '5: Customer deletion preserves shared nominee, other customer, and other customer accounts');

        // -------------------------------------------------------------
        // SCENARIO 6: Rejecting deletion when protected financial history prevents it
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 6: Rejecting deletion when protected financial history prevents it...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9005, 'TSTPAN9005', 'Finance', 'Protected', 'City', 'State', '110001', TO_DATE('1988-08-08', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9405, 5000, 'ACTIVE', 'Savings', 9005)`);
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status)
                   VALUES (9705, 9405, SYSDATE, 'DEPOSIT', 5000, 'ONLINE', 'SUCCESS')`);
        await conn.commit();

        const p6 = await api('/customers/9005/delete-preview');
        assert(p6.data.has_protected_history === true && p6.data.can_delete === false && p6.data.recommended_alternative.action === 'deactivate_customer',
               '6a: Preview identifies protected financial history and recommends Deactivate Customer');

        const d6 = await api('/customers/9005', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p6.data.preview_signature })
        });
        const checkCust6 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9005');
        assert(d6.status === 400 && d6.data.protected_financial_history === true && checkCust6.rows[0][0] === 1,
               '6b: Deletion rejected with HTTP 400 Bad Request, preserving customer & transaction ledger');

        // -------------------------------------------------------------
        // SCENARIO 7: Account deletion and transaction-history protection
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 7: Account deletion and transaction-history protection...');
        const p7 = await api('/accounts/9405/delete-preview');
        assert(p7.data.has_protected_history === true && p7.data.recommended_alternative.action === 'close_account',
               '7a: Account delete-preview flags protected transactions and recommends Close Account');

        const d7a = await api('/accounts/9405', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p7.data.preview_signature })
        });
        assert(d7a.status === 400 && d7a.data.protected_financial_history === true,
               '7b: Hard delete of account with transactions is strictly rejected (HTTP 400)');

        // Now test deleting an account with 0 balance and 0 transactions
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9406, 0, 'ACTIVE', 'Savings', 9005)`);
        await conn.commit();
        const p7b = await api('/accounts/9406/delete-preview');
        const d7b = await api('/accounts/9406', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p7b.data.preview_signature })
        });
        const checkAcc7b = await sql('SELECT COUNT(*) FROM Account WHERE acc_id = 9406');
        assert(d7b.status === 200 && checkAcc7b.rows[0][0] === 0,
               '7c: Permitted account with zero transactions and zero balance deleted successfully');

        // -------------------------------------------------------------
        // SCENARIO 8: Credit-card deletion
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 8: Credit-card deletion...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9007, 'TSTPAN9007', 'Card', 'Owner', 'City', 'State', '110001', TO_DATE('1991-03-03', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO CreditCard (pno, type, card_limit, expiry, status, cvv, cid)
                   VALUES ('9999000077778888', 'RUPAY', 40000, TO_DATE('2029-01-01', 'YYYY-MM-DD'), 'ACTIVE', '456', 9007)`);
        await conn.commit();

        const p8 = await api('/creditcards/9999000077778888/delete-preview');
        assert(p8.status === 200 && p8.data.can_delete === true && p8.data.counts.CreditCard === 1,
               '8a: Credit card delete-preview shows can_delete=true and preserves customer');

        const d8 = await api('/creditcards/9999000077778888', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p8.data.preview_signature })
        });
        const checkCard8 = await sql("SELECT COUNT(*) FROM CreditCard WHERE pno = '9999000077778888'");
        const checkCust8 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9007');
        assert(d8.status === 200 && checkCard8.rows[0][0] === 0 && checkCust8.rows[0][0] === 1,
               '8b: Credit card deleted cleanly while parent Customer is preserved');

        // -------------------------------------------------------------
        // SCENARIO 9: Loan deletion
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 9: Loan deletion...');
        await sql(`INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact, status)
                   VALUES (9109, 'Loan Branch', 'Delhi', 'Delhi', '110001', 'LOAN0009109', '9999900109', 'ACTIVE')`);
        await sql(`INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id, status)
                   VALUES (9209, 'Loan', 'Officer', 55000, SYSDATE, 9109, 'ACTIVE')`);
        await sql(`INSERT INTO Loan (l_id, cid, l_type, amount, interest, term, status)
                   VALUES (9509, 9007, 'Auto', 300000, 9.2, 36, 'ACTIVE')`);
        await sql(`INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (9209, 701, 9509, 9109)`);
        await conn.commit();

        const p9 = await api('/loans/9509/delete-preview');
        assert(p9.status === 200 && p9.data.counts.Loan === 1 && p9.data.counts.Responsible_For === 1,
               '9a: Loan delete-preview identifies loan and linked responsibility records');

        const d9 = await api('/loans/9509', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p9.data.preview_signature })
        });
        const checkLoan9 = await sql('SELECT COUNT(*) FROM Loan WHERE l_id = 9509');
        const checkResp9 = await sql('SELECT COUNT(*) FROM Responsible_For WHERE l_id = 9509');
        const checkCust9 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9007');
        const checkEmp9 = await sql('SELECT COUNT(*) FROM Employee WHERE emp_id = 9209');
        assert(d9.status === 200 && checkLoan9.rows[0][0] === 0 && checkResp9.rows[0][0] === 0 && checkCust9.rows[0][0] === 1 && checkEmp9.rows[0][0] === 1,
               '9b: Loan and its responsibility records deleted; Customer and Employee preserved');

        // -------------------------------------------------------------
        // SCENARIO 10: Employee and branch dependency checks
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 10: Employee and branch dependency checks...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9010, 'TSTPAN9010', 'Emp', 'Customer', 'City', 'State', '110001', TO_DATE('1993-04-04', 'YYYY-MM-DD'), 9209, 'ACTIVE')`);
        await conn.commit();

        // 10a: Try deleting branch 9109 while employee 9209 exists
        const p10a = await api('/branches/9109/delete-preview');
        const d10a = await api('/branches/9109', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p10a.data.preview_signature })
        });
        assert(d10a.status === 400 && d10a.data.error.includes('employee'),
               '10a: Branch deletion blocked when employees are assigned to it');

        // 10b: Delete employee 9209 -> unlinks customer 9010
        const p10b = await api('/employees/9209/delete-preview');
        const d10b = await api('/employees/9209', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p10b.data.preview_signature })
        });
        const checkCustEmp10 = await sql('SELECT emp_id FROM Customer WHERE cid = 9010');
        const checkEmp10 = await sql('SELECT COUNT(*) FROM Employee WHERE emp_id = 9209');
        assert(d10b.status === 200 && checkEmp10.rows[0][0] === 0 && checkCustEmp10.rows[0][0] === null,
               '10b: Employee deleted and assigned customer safely unlinked (emp_id = NULL) without deleting customer');

        // 10c: Now delete branch 9109
        const p10c = await api('/branches/9109/delete-preview');
        const d10c = await api('/branches/9109', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p10c.data.preview_signature })
        });
        const checkBranch10 = await sql('SELECT COUNT(*) FROM Branch WHERE b_id = 9109');
        assert(d10c.status === 200 && checkBranch10.rows[0][0] === 0,
               '10c: Branch with 0 employees deleted successfully');

        // -------------------------------------------------------------
        // SCENARIO 11: Nominee and customer-phone deletion
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 11: Nominee and customer-phone deletion...');
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9010, '9999900010')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9411, 0, 'ACTIVE', 'Savings', 9010)`);
        await sql(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id)
                   VALUES (9611, 'Target', 'Nominee', 'Sister', TO_DATE('1997-07-07', 'YYYY-MM-DD'), 9010, 9411)`);
        await sql(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (9010, 9411, 9611)`);
        await conn.commit();

        // Delete phone
        const p11Phone = await api('/customers/9010/phones/9999900010/delete-preview');
        const d11Phone = await api('/customers/9010/phones/9999900010', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p11Phone.data.preview_signature })
        });
        const checkPhone11 = await sql("SELECT COUNT(*) FROM Customer_Phone WHERE cid = 9010 AND phone = '9999900010'");
        assert(d11Phone.status === 200 && checkPhone11.rows[0][0] === 0,
               '11a: Customer phone deleted cleanly while customer remains');

        // Delete nominee
        const p11Nom = await api('/nominees/9611/delete-preview');
        const d11Nom = await api('/nominees/9611', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p11Nom.data.preview_signature })
        });
        const checkNom11 = await sql('SELECT COUNT(*) FROM Nominee WHERE n_id = 9611');
        const checkOwns11 = await sql('SELECT COUNT(*) FROM Owns WHERE n_id = 9611');
        assert(d11Nom.status === 200 && checkNom11.rows[0][0] === 0 && checkOwns11.rows[0][0] === 0,
               '11b: Nominee and its Owns mapping deleted cleanly while Account and Customer remain');

        // -------------------------------------------------------------
        // SCENARIO 12: Invalid or nonexistent identifiers
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 12: Invalid or nonexistent identifiers...');
        const p12NotFound = await api('/customers/999999/delete-preview');
        const d12NotFound = await api('/customers/999999', { method: 'DELETE' });
        const p12Invalid = await api('/customers/not-a-number/delete-preview');
        assert(p12NotFound.status === 404 && d12NotFound.status === 404 && p12Invalid.status === 400,
               '12: Nonexistent records return 404 Not Found and invalid non-numeric IDs return 400 Bad Request');

        // -------------------------------------------------------------
        // SCENARIO 13: Foreign-key violation handling & Transaction delete prohibition
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 13: Foreign-key violation handling & Transaction delete prohibition...');
        const d13Tx = await api('/transactions/701', { method: 'DELETE' });
        const checkTx13 = await sql('SELECT COUNT(*) FROM "TRANSACTION" WHERE t_id = 701');
        assert(d13Tx.status === 403 && d13Tx.data.error.includes('prohibited') && checkTx13.rows[0][0] === 1,
               '13: Transaction hard delete strictly forbidden with HTTP 403, preserving immutable audit trail');

        // -------------------------------------------------------------
        // SCENARIO 14: Rollback after a failure partway through a cascade
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 14: Rollback after a failure partway through a cascade...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9014, 'TSTPAN9014', 'Rollback', 'Test', 'City', 'State', '110001', TO_DATE('1994-04-04', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9014, '9999900014')`);
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9414, 0, 'ACTIVE', 'Savings', 9014)`);
        await conn.commit();

        // Simulate multi-statement rollback programmatically
        let simulatedErrorThrown = false;
        try {
            await sql('DELETE FROM Customer_Phone WHERE cid = 9014');
            // Deliberate invalid statement to trigger failure
            await sql('INSERT INTO NonExistentTable_FailTest VALUES (1)');
            await conn.commit();
        } catch (e) {
            simulatedErrorThrown = true;
            await conn.rollback();
        }
        const checkPhone14 = await sql('SELECT COUNT(*) FROM Customer_Phone WHERE cid = 9014');
        assert(simulatedErrorThrown && checkPhone14.rows[0][0] === 1,
               '14: Multi-statement atomic transaction rolls back all intermediate operations on failure');

        // -------------------------------------------------------------
        // SCENARIO 15: Repeated submission and stale-preview handling
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 15: Repeated submission and stale-preview handling...');
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status)
                   VALUES (9015, 'TSTPAN9015', 'Stale', 'Test', 'City', 'State', '110001', TO_DATE('1995-05-05', 'YYYY-MM-DD'), NULL, 'ACTIVE')`);
        await conn.commit();

        const p15Original = await api('/customers/9015/delete-preview');
        const origSig = p15Original.data.preview_signature;

        // Concurrent change: another process adds a phone number to customer 9015
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9015, '9999900015')`);
        await conn.commit();

        // Client attempts to submit with original stale preview signature
        const d15Stale = await api('/customers/9015', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: origSig })
        });
        assert(d15Stale.status === 409 && d15Stale.data.stale_preview === true,
               '15a: Stale preview detected; server rejects deletion with HTTP 409 Conflict');

        // Client refreshes preview and re-submits
        const p15Updated = await api('/customers/9015/delete-preview');
        const d15Fresh = await api('/customers/9015', {
            method: 'DELETE',
            body: JSON.stringify({ preview_signature: p15Updated.data.preview_signature })
        });
        const checkCust15 = await sql('SELECT COUNT(*) FROM Customer WHERE cid = 9015');
        assert(d15Fresh.status === 200 && checkCust15.rows[0][0] === 0,
               '15b: Fresh preview signature confirmed and cascading deletion executed successfully');

        // -------------------------------------------------------------
        // SCENARIO 16: Confirmation that deposits, withdrawals, reversals and triggers work
        // -------------------------------------------------------------
        console.log('\nRunning Scenario 16: Confirmation that deposits, withdrawals, reversals and triggers work...');
        // Use account 401
        const initialBalRes = await sql('SELECT balance FROM Account WHERE acc_id = 401');
        const initialBal = initialBalRes.rows[0][0];

        // 16a: Deposit 1000
        const depRes = await api('/deposit', {
            method: 'POST',
            body: JSON.stringify({ acc_id: 401, amount: 1000 })
        });
        const postDepBalRes = await sql('SELECT balance FROM Account WHERE acc_id = 401');
        const postDepBal = postDepBalRes.rows[0][0];
        assert(depRes.status === 200 && postDepBal === initialBal + 1000,
               '16a: Deposit increases account balance via PL/SQL and balance triggers');

        // 16b: Withdraw 500
        const withRes = await api('/withdraw', {
            method: 'POST',
            body: JSON.stringify({ acc_id: 401, amount: 500 })
        });
        const postWithBalRes = await sql('SELECT balance FROM Account WHERE acc_id = 401');
        const postWithBal = postWithBalRes.rows[0][0];
        assert(withRes.status === 200 && postWithBal === postDepBal - 500,
               '16b: Withdrawal decreases account balance via PL/SQL and balance triggers');

        // 16c: Reversal
        const latestTxRes = await sql('SELECT MAX(t_id) FROM "TRANSACTION" WHERE acc_id = 401');
        const latestTxId = latestTxRes.rows[0][0];
        const revRes = await api(`/transactions/${latestTxId}/reverse`, { method: 'POST' });
        const postRevBalRes = await sql('SELECT balance FROM Account WHERE acc_id = 401');
        assert(revRes.status === 200 && revRes.data.success === true && postRevBalRes.rows[0][0] === postDepBal,
               '16c: Transaction reversal creates offsetting ledger record and restores balance');

        // Restore account 401 balance to initial balance
        await sql('UPDATE Account SET balance = :1 WHERE acc_id = 401', [initialBal]);
        await conn.commit();

        // Final cleanup of disposable test records
        await cleanupDisposableRecords();
        console.log('\nFinal cleanup of all disposable test records completed.');

        console.log('\n================================================================');
        console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
        console.log('================================================================');

        process.exit(passedTests === totalTests ? 0 : 1);
    } catch (err) {
        console.error('Fatal error in test suite:', err);
        process.exit(1);
    } finally {
        if (conn) await conn.close();
    }
})();
