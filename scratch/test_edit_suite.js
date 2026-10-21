const { getConnection } = require('../backend/db');

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
        console.log(`  [PASS] ${testName}`);
    } else {
        console.error(`  [FAIL] ${testName} - ${details}`);
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

async function getBaselineCounts() {
    const tables = ['BRANCH', 'EMPLOYEE', 'CUSTOMER', 'CUSTOMER_PHONE', 'ACCOUNT', 'NOMINEE', 'OWNS', 'CREDITCARD', 'LOAN', 'TRANSACTION', 'RESPONSIBLE_FOR'];
    const counts = {};
    for (const t of tables) {
        const queryName = t === 'TRANSACTION' ? '"TRANSACTION"' : t;
        const res = await sql(`SELECT COUNT(*) FROM ${queryName}`);
        counts[t] = res.rows[0][0];
    }
    return counts;
}

async function runTestSuite() {
    console.log('================================================================');
    console.log('   FINORA RECORD EDITING & REFERENTIAL INTEGRITY TEST SUITE     ');
    console.log('================================================================\n');

    conn = await getConnection();

    // 0. Initial baseline check & cleanup
    await cleanupDisposableRecords();
    const initialBaselines = await getBaselineCounts();
    console.log('Initial Database Baseline Counts:');
    console.log(JSON.stringify(initialBaselines, null, 2));
    console.log('\n--- Beginning Tests ---\n');

    try {
        // Setup Test Parent Entities
        // Branch 9101, 9102
        await sql(`INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact, status) VALUES (9101, 'Test Branch 1', 'Pune', 'Maharashtra', '411001', 'TESTIFSC9101', '9898000001', 'ACTIVE')`);
        await sql(`INSERT INTO Branch (b_id, branch_name, city, state, pincode, ifsc, contact, status) VALUES (9102, 'Test Branch 2', 'Nagpur', 'Maharashtra', '440001', 'TESTIFSC9102', '9898000002', 'ACTIVE')`);
        // Employee 9201
        await sql(`INSERT INTO Employee (emp_id, first_name, last_name, salary, hire_date, b_id, status) VALUES (9201, 'Aditya', 'Sharma', 45000, TO_DATE('2023-01-15', 'YYYY-MM-DD'), 9101, 'ACTIVE')`);
        // Customer 9301, 9302
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status) VALUES (9301, 'TESTPAN9301', 'Vikram', 'Malhotra', 'Pune', 'Maharashtra', '411001', TO_DATE('1992-06-20', 'YYYY-MM-DD'), 9201, 'ACTIVE')`);
        await sql(`INSERT INTO Customer (cid, pan, first_name, last_name, city, state, pincode, dob, emp_id, status) VALUES (9302, 'TESTPAN9302', 'Ananya', 'Iyer', 'Nagpur', 'Maharashtra', '440001', TO_DATE('1995-09-10', 'YYYY-MM-DD'), 9201, 'ACTIVE')`);
        // Customer Phone
        await sql(`INSERT INTO Customer_Phone (cid, phone) VALUES (9301, '9999911111')`);
        // Account 9401 (Balance 50000)
        await sql(`INSERT INTO Account (acc_id, balance, status, acc_type, cid) VALUES (9401, 50000, 'ACTIVE', 'SAVINGS', 9301)`);
        // Nominee 9501
        await sql(`INSERT INTO Nominee (n_id, first_name, last_name, relationship, dob, cid, acc_id) VALUES (9501, 'Sneha', 'Malhotra', 'Spouse', TO_DATE('1994-03-12', 'YYYY-MM-DD'), 9301, 9401)`);
        await sql(`INSERT INTO Owns (cid, acc_id, n_id) VALUES (9301, 9401, 9501)`);
        // Loan 9601
        await sql(`INSERT INTO Loan (l_id, cid, l_type, amount, interest, term, status) VALUES (9601, 9301, 'HOME', 500000, 8.50, 60, 'ACTIVE')`);
        // Credit Card 9999888877776666
        await sql(`INSERT INTO CreditCard (pno, "TYPE", card_limit, expiry, status, cvv, cid) VALUES ('9999888877776666', 'VISA', 100000, TO_DATE('2028-12-31', 'YYYY-MM-DD'), 'ACTIVE', '123', 9301)`);
        // Transaction 9701
        await sql(`INSERT INTO "TRANSACTION" (t_id, acc_id, trans_date, "TYPE", amount, "MODE", status) VALUES (9701, 9401, TO_DATE('2026-10-01', 'YYYY-MM-DD'), 'DEPOSIT', 5000, 'ONLINE', 'SUCCESS')`);
        // Responsible_For
        await sql(`INSERT INTO Responsible_For (emp_id, t_id, l_id, b_id) VALUES (9201, 9701, 9601, 9101)`);
        await conn.commit();

        // -------------------------------------------------------------
        // TEST 1: Customer Edit
        // -------------------------------------------------------------
        console.log('[1] Testing Customer Attribute Editing...');
        const editCustRes = await api('/customers/9301', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Vikramaditya',
                last_name: 'Malhotra-Senior',
                pan: 'TESTPAN9301',
                dob: '1992-06-20',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400050',
                emp_id: 9201,
                status: 'ACTIVE'
            })
        });
        assert(editCustRes.ok && editCustRes.data.success, 'Test 1.1: PUT /api/customers/9301 succeeds');

        const getCustRes = await api('/customers/9301');
        assert(
            getCustRes.ok &&
            getCustRes.data.data.first_name === 'Vikramaditya' &&
            getCustRes.data.data.city === 'Mumbai' &&
            getCustRes.data.data.pincode === '400050',
            'Test 1.2: Customer fields correctly updated in database'
        );

        // -------------------------------------------------------------
        // TEST 2: Account Edit (Type and Status)
        // -------------------------------------------------------------
        console.log('\n[2] Testing Account Editing...');
        const editAccRes = await api('/accounts/9401', {
            method: 'PUT',
            body: JSON.stringify({
                acc_type: 'CURRENT',
                status: 'INACTIVE',
                cid: 9301
            })
        });
        assert(editAccRes.ok && editAccRes.data.success, 'Test 2.1: PUT /api/accounts/9401 succeeds for type & status');

        const getAccRes = await api('/accounts/9401');
        assert(
            getAccRes.ok &&
            getAccRes.data.data.acc_type === 'CURRENT' &&
            getAccRes.data.data.status === 'INACTIVE',
            'Test 2.2: Account type and status verified in database'
        );

        // -------------------------------------------------------------
        // TEST 3: Attempting Account Balance Edit is Rejected
        // -------------------------------------------------------------
        console.log('\n[3] Testing Direct Account Balance Edit Rejection...');
        const balBefore = Number((await sql(`SELECT balance FROM Account WHERE acc_id = 9401`)).rows[0][0]);
        const illegalBalRes = await api('/accounts/9401', {
            method: 'PUT',
            body: JSON.stringify({
                acc_type: 'CURRENT',
                status: 'INACTIVE',
                cid: 9301,
                balance: 999999
            })
        });
        assert(
            illegalBalRes.status === 400 && !illegalBalRes.data.success && illegalBalRes.data.error.includes('balance'),
            'Test 3.1: Direct balance modification rejected with 400 and clear error message'
        );
        const checkBalSql = await sql(`SELECT balance FROM Account WHERE acc_id = 9401`);
        assert(Number(checkBalSql.rows[0][0]) === balBefore, `Test 3.2: Balance in database remained exactly ₹${balBefore} (unmodified)`);

        // -------------------------------------------------------------
        // TEST 4: Loan Edit (Permitted Fields & Amendment)
        // -------------------------------------------------------------
        console.log('\n[4] Testing Loan Editing...');
        const editLoanRes = await api('/loans/9601', {
            method: 'PUT',
            body: JSON.stringify({
                cid: 9301,
                l_type: 'PERSONAL',
                amount: 600000,
                interest: 9.75,
                term: 48,
                status: 'ACTIVE'
            })
        });
        assert(editLoanRes.ok && editLoanRes.data.success, 'Test 4.1: PUT /api/loans/9601 succeeds');

        const getLoanRes = await api('/loans/9601');
        assert(
            getLoanRes.ok &&
            getLoanRes.data.data.l_type === 'PERSONAL' &&
            getLoanRes.data.data.amount === 600000 &&
            getLoanRes.data.data.interest === 9.75 &&
            getLoanRes.data.data.term === 48,
            'Test 4.2: Loan fields verified in database'
        );

        // -------------------------------------------------------------
        // TEST 5: Credit Card Edit (Limit & Type)
        // -------------------------------------------------------------
        console.log('\n[5] Testing Credit Card Editing...');
        const editCardRes = await api('/creditcards/9999888877776666', {
            method: 'PUT',
            body: JSON.stringify({
                cid: 9301,
                type: 'MASTERCARD',
                card_limit: 175000,
                expiry: '2029-06-30',
                status: 'ACTIVE'
            })
        });
        assert(editCardRes.ok && editCardRes.data.success, 'Test 5.1: PUT /api/creditcards/9999888877776666 succeeds');

        const getCardRes = await api('/creditcards/9999888877776666');
        assert(
            getCardRes.ok &&
            getCardRes.data.data.type === 'MASTERCARD' &&
            getCardRes.data.data.card_limit === 175000 &&
            getCardRes.data.data.expiry === '2029-06-30',
            'Test 5.2: Credit card limit and network verified in database'
        );

        // -------------------------------------------------------------
        // TEST 6: Branch Edit & Duplicate IFSC Rejection
        // -------------------------------------------------------------
        console.log('\n[6] Testing Branch Edit & IFSC Uniqueness...');
        const dupIfscRes = await api('/branches/9101', {
            method: 'PUT',
            body: JSON.stringify({
                branch_name: 'Test Branch 1 Renamed',
                ifsc: 'TESTIFSC9102', // Already belongs to Branch 9102
                contact: '9898000001',
                status: 'ACTIVE'
            })
        });
        assert(
            dupIfscRes.status === 400 && !dupIfscRes.data.success && dupIfscRes.data.error.includes('IFSC code'),
            'Test 6.1: Duplicate IFSC rejected with 400 and clear error message'
        );

        const validBranchRes = await api('/branches/9101', {
            method: 'PUT',
            body: JSON.stringify({
                branch_name: 'Pune Main Branch',
                ifsc: 'TESTIFSC9101-NEW',
                contact: '020-25551122',
                city: 'Pune',
                state: 'Maharashtra',
                pincode: '411005',
                status: 'ACTIVE'
            })
        });
        assert(validBranchRes.ok && validBranchRes.data.success, 'Test 6.2: Valid branch update succeeds');

        // -------------------------------------------------------------
        // TEST 7: Employee Edit & Branch Reassignment
        // -------------------------------------------------------------
        console.log('\n[7] Testing Employee Edit & Branch Reassignment...');
        const editEmpRes = await api('/employees/9201', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Aditya',
                last_name: 'Sharma-Verma',
                salary: 58000,
                hire_date: '2023-01-15',
                b_id: 9102, // Reassigned from 9101 to 9102
                status: 'ACTIVE'
            })
        });
        assert(editEmpRes.ok && editEmpRes.data.success, 'Test 7.1: Reassigning employee to branch 9102 succeeds');

        const getEmpRes = await api('/employees/9201');
        assert(
            getEmpRes.ok &&
            getEmpRes.data.data.b_id === 9102 &&
            getEmpRes.data.data.salary === 58000,
            'Test 7.2: Employee updated with new branch #9102 and salary ₹58,000'
        );

        // -------------------------------------------------------------
        // TEST 8: Invalid Foreign Key References Rejected
        // -------------------------------------------------------------
        console.log('\n[8] Testing Invalid Foreign Key Rejection...');
        const badEmpFkRes = await api('/customers/9301', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Vikramaditya',
                emp_id: 99999 // Non-existent employee
            })
        });
        assert(
            badEmpFkRes.status === 400 && !badEmpFkRes.data.success && badEmpFkRes.data.error.includes('Employee'),
            'Test 8.1: Customer edit with invalid emp_id rejected'
        );

        const badBranchFkRes = await api('/employees/9201', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Aditya',
                b_id: 99999 // Non-existent branch
            })
        });
        assert(
            badBranchFkRes.status === 400 && !badBranchFkRes.data.success && badBranchFkRes.data.error.includes('Branch'),
            'Test 8.2: Employee edit with invalid b_id rejected'
        );

        const badCustFkRes = await api('/accounts/9401', {
            method: 'PUT',
            body: JSON.stringify({
                acc_type: 'SAVINGS',
                cid: 99999 // Non-existent customer
            })
        });
        assert(
            badCustFkRes.status === 400 && !badCustFkRes.data.success && badCustFkRes.data.error.includes('Customer'),
            'Test 8.3: Account edit with invalid cid rejected'
        );

        // -------------------------------------------------------------
        // TEST 9: Required Field and Range Validation
        // -------------------------------------------------------------
        console.log('\n[9] Testing Field and Range Validation...');
        const emptyCustRes = await api('/customers/9301', {
            method: 'PUT',
            body: JSON.stringify({ first_name: '   ' })
        });
        assert(emptyCustRes.status === 400 && !emptyCustRes.data.success, 'Test 9.1: Blank first name rejected on Customer');

        const negSalaryRes = await api('/employees/9201', {
            method: 'PUT',
            body: JSON.stringify({ first_name: 'Aditya', salary: -1000 })
        });
        assert(negSalaryRes.status === 400 && !negSalaryRes.data.success, 'Test 9.2: Negative salary rejected on Employee');

        const negLoanInterestRes = await api('/loans/9601', {
            method: 'PUT',
            body: JSON.stringify({ cid: 9301, interest: -5 })
        });
        assert(negLoanInterestRes.status === 400 && !negLoanInterestRes.data.success, 'Test 9.3: Negative loan interest rejected');

        const zeroCardLimitRes = await api('/creditcards/9999888877776666', {
            method: 'PUT',
            body: JSON.stringify({ card_limit: 0 })
        });
        assert(zeroCardLimitRes.status === 400 && !zeroCardLimitRes.data.success, 'Test 9.4: Zero or negative card limit rejected');

        // -------------------------------------------------------------
        // TEST 10: Missing Records Return 404
        // -------------------------------------------------------------
        console.log('\n[10] Testing Missing Record Responses (404)...');
        const notFoundCustGet = await api('/customers/99999');
        assert(notFoundCustGet.status === 404, 'Test 10.1: GET non-existent customer returns 404');

        const notFoundCustPut = await api('/customers/99999', {
            method: 'PUT',
            body: JSON.stringify({ first_name: 'Ghost' })
        });
        assert(notFoundCustPut.status === 404, 'Test 10.2: PUT non-existent customer returns 404');

        const notFoundAccPut = await api('/accounts/99999', {
            method: 'PUT',
            body: JSON.stringify({ acc_type: 'SAVINGS' })
        });
        assert(notFoundAccPut.status === 404, 'Test 10.3: PUT non-existent account returns 404');

        // -------------------------------------------------------------
        // TEST 11: Constraint Violations & Balance Rules
        // -------------------------------------------------------------
        console.log('\n[11] Testing Business Constraint Enforcement...');
        const invalidStatusAcc = await api('/accounts/9401', {
            method: 'PUT',
            body: JSON.stringify({ status: 'BAD_STATUS' })
        });
        assert(invalidStatusAcc.status === 400 && !invalidStatusAcc.data.success, 'Test 11.1: Invalid account status rejected');

        // Cannot close account with positive balance
        const closePositiveBal = await api('/accounts/9401', {
            method: 'PUT',
            body: JSON.stringify({ status: 'CLOSED' })
        });
        assert(
            closePositiveBal.status === 400 && !closePositiveBal.data.success && closePositiveBal.data.error.includes('zero balance'),
            'Test 11.2: Closing account with balance > 0 is blocked'
        );

        // -------------------------------------------------------------
        // TEST 12: Nominee Edit & Multi-Table Ownership Sync
        // -------------------------------------------------------------
        console.log('\n[12] Testing Multi-Table Atomicity (Nominee & Owns)...');
        const editNomRes = await api('/nominees/9501', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Snehalatha',
                last_name: 'Malhotra',
                relationship: 'Wife',
                dob: '1994-03-12',
                cid: 9301,
                acc_id: 9401
            })
        });
        assert(editNomRes.ok && editNomRes.data.success, 'Test 12.1: Nominee edit succeeds');

        const ownsCheckSql = await sql(`SELECT cid, acc_id, n_id FROM Owns WHERE n_id = 9501`);
        assert(
            ownsCheckSql.rows.length === 1 &&
            Number(ownsCheckSql.rows[0][0]) === 9301 &&
            Number(ownsCheckSql.rows[0][1]) === 9401,
            'Test 12.2: Owns relationship synchronized in database'
        );

        // -------------------------------------------------------------
        // TEST 13: Customer Phone Edit & Duplicate Protection
        // -------------------------------------------------------------
        console.log('\n[13] Testing Customer Phone Editing...');
        const editPhoneRes = await api('/customers/9301/phones/9999911111', {
            method: 'PUT',
            body: JSON.stringify({ phone: '9999922222' })
        });
        assert(editPhoneRes.ok && editPhoneRes.data.success, 'Test 13.1: Phone edit succeeds');

        const phoneCheckSql = await sql(`SELECT phone FROM Customer_Phone WHERE cid = 9301`);
        assert(phoneCheckSql.rows[0][0] === '9999922222', 'Test 13.2: Phone in database updated to 9999922222');

        // -------------------------------------------------------------
        // TEST 14: Transaction Ledger Protection & Safe Metadata Edit
        // -------------------------------------------------------------
        console.log('\n[14] Testing Transaction Ledger Safeguards...');
        const txAmountEdit = await api('/transactions/9701', {
            method: 'PUT',
            body: JSON.stringify({ amount: 99999 })
        });
        assert(
            txAmountEdit.status === 400 && !txAmountEdit.data.success && txAmountEdit.data.error.includes('amount'),
            'Test 14.1: Direct editing of transaction amount rejected'
        );

        const txTypeEdit = await api('/transactions/9701', {
            method: 'PUT',
            body: JSON.stringify({ type: 'WITHDRAWAL' })
        });
        assert(
            txTypeEdit.status === 400 && !txTypeEdit.data.success && txTypeEdit.data.error.includes('type'),
            'Test 14.2: Direct editing of transaction type rejected'
        );

        const txSafeModeEdit = await api('/transactions/9701', {
            method: 'PUT',
            body: JSON.stringify({ mode: 'UPI' })
        });
        assert(txSafeModeEdit.ok && txSafeModeEdit.data.success, 'Test 14.3: Safe metadata edit (mode: UPI) succeeds');

        const txCheckSql = await sql(`SELECT "MODE", amount, acc_id FROM "TRANSACTION" WHERE t_id = 9701`);
        assert(
            txCheckSql.rows[0][0] === 'UPI' && Number(txCheckSql.rows[0][1]) === 5000,
            'Test 14.4: Mode is UPI and amount remained 5000'
        );

        // -------------------------------------------------------------
        // TEST 15: Existing Operations Continue Working (Delete & Settle)
        // -------------------------------------------------------------
        console.log('\n[15] Testing Existing Operations Integrity...');
        // Settle loan
        const settleRes = await api('/loans/9601/settle', { method: 'POST' });
        assert(settleRes.ok && settleRes.data.success, 'Test 15.1: Loan settlement succeeds');

        const loanSettledSql = await sql(`SELECT status FROM Loan WHERE l_id = 9601`);
        assert(loanSettledSql.rows[0][0] === 'SETTLED', 'Test 15.2: Loan status is SETTLED in database');

        // Delete test loan
        const delLoanRes = await api('/loans/9601', { method: 'DELETE' });
        assert(delLoanRes.ok && delLoanRes.data.success, 'Test 15.3: Loan delete succeeds');

        // -------------------------------------------------------------
        // TEST 16: Dashboard Consistency & Clean Cleanup
        // -------------------------------------------------------------
        console.log('\n[16] Testing Dashboard Consistency & Baseline Preservation...');
        const dashRes = await api('/dashboard');
        assert(dashRes.ok && dashRes.data.success && dashRes.data.data.total_customers >= 6, 'Test 16.1: Dashboard query operational');

        // Cleanup disposable records
        await cleanupDisposableRecords();

        const postBaselines = await getBaselineCounts();
        let baselinesIntact = true;
        for (const t of Object.keys(initialBaselines)) {
            if (postBaselines[t] !== initialBaselines[t]) {
                baselinesIntact = false;
                console.error(`  [MISMATCH] ${t}: expected ${initialBaselines[t]}, found ${postBaselines[t]}`);
            }
        }
        assert(baselinesIntact, 'Test 16.2: All 11 database baseline table counts remained 100% intact');

    } catch (err) {
        console.error('Fatal error in test suite:', err);
    } finally {
        await cleanupDisposableRecords();
        if (conn) {
            try { await conn.close(); } catch (_) {}
        }
    }

    console.log('\n================================================================');
    console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
}

runTestSuite();
