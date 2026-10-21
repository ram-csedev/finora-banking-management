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

async function runTests() {
    console.log('================================================================');
    console.log('  TEST SUITE: STATUS-AGNOSTIC & SCHEMA RESILIENCY VERIFICATION   ');
    console.log('================================================================\n');

    let conn;
    try {
        conn = await getConnection();

        // 1. Test Customer Edit (without and with status)
        console.log('[1] Testing Customer Edit Resiliency...');
        const custGet = await api('/customers/301');
        assert(custGet.ok, 'GET /api/customers/301 succeeds', JSON.stringify(custGet.data));
        assert(custGet.data.data.first_name !== undefined, 'Customer first_name returned');

        // PUT without status (as would happen on cloud where status is removed from form)
        const custPut1 = await api('/customers/301', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Amit kumar',
                last_name: 'Verma',
                pan: 'ABCDE1234F',
                dob: '1998-05-12',
                city: 'Vellore',
                state: 'Tamil Nadu',
                pincode: '632004',
                emp_id: 201
            })
        });
        assert(custPut1.ok, 'PUT /api/customers/301 without status payload succeeds', JSON.stringify(custPut1.data));
        assert(custPut1.data.success === true, 'Customer updated successfully');

        // PUT with status (as would happen on schema with status)
        const custPut2 = await api('/customers/301', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Amit kumar',
                last_name: 'Verma',
                pan: 'ABCDE1234F',
                dob: '1998-05-12',
                city: 'Vellore',
                state: 'Tamil Nadu',
                pincode: '632004',
                emp_id: 201,
                status: 'ACTIVE'
            })
        });
        assert(custPut2.ok, 'PUT /api/customers/301 with status payload succeeds', JSON.stringify(custPut2.data));

        // 2. Test Loan Edit (without and with status)
        console.log('\n[2] Testing Loan Edit Resiliency...');
        const loanGet = await api('/loans/601');
        assert(loanGet.ok, 'GET /api/loans/601 succeeds', JSON.stringify(loanGet.data));

        // PUT without status
        const loanPut1 = await api('/loans/601', {
            method: 'PUT',
            body: JSON.stringify({
                cid: 301,
                l_type: 'HOME',
                amount: 500000,
                interest: 8.5,
                term: 60
            })
        });
        assert(loanPut1.ok, 'PUT /api/loans/601 without status payload succeeds', JSON.stringify(loanPut1.data));

        // PUT with status
        const loanPut2 = await api('/loans/601', {
            method: 'PUT',
            body: JSON.stringify({
                cid: 301,
                l_type: 'HOME',
                amount: 500000,
                interest: 8.5,
                term: 60,
                status: 'ACTIVE'
            })
        });
        assert(loanPut2.ok, 'PUT /api/loans/601 with status payload succeeds', JSON.stringify(loanPut2.data));

        // 3. Test Branch Edit (without and with status)
        console.log('\n[3] Testing Branch Edit Resiliency...');
        const branchGet = await api('/branches/101');
        assert(branchGet.ok, 'GET /api/branches/101 succeeds', JSON.stringify(branchGet.data));

        // PUT without status
        const branchPut1 = await api('/branches/101', {
            method: 'PUT',
            body: JSON.stringify({
                branch_name: 'Main Branch Vellore',
                ifsc: 'SBIN0000101',
                contact: '9876543210',
                city: 'Vellore',
                state: 'Tamil Nadu',
                pincode: '632004'
            })
        });
        assert(branchPut1.ok, 'PUT /api/branches/101 without status payload succeeds', JSON.stringify(branchPut1.data));

        // PUT with status
        const branchPut2 = await api('/branches/101', {
            method: 'PUT',
            body: JSON.stringify({
                branch_name: 'Main Branch Vellore',
                ifsc: 'SBIN0000101',
                contact: '9876543210',
                city: 'Vellore',
                state: 'Tamil Nadu',
                pincode: '632004',
                status: 'ACTIVE'
            })
        });
        assert(branchPut2.ok, 'PUT /api/branches/101 with status payload succeeds', JSON.stringify(branchPut2.data));

        // 4. Test Employee Edit (without and with status)
        console.log('\n[4] Testing Employee Edit Resiliency...');
        const empGet = await api('/employees/201');
        assert(empGet.ok, 'GET /api/employees/201 succeeds', JSON.stringify(empGet.data));

        // PUT without status
        const empPut1 = await api('/employees/201', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Rahul',
                last_name: 'Sharma',
                salary: 50000,
                hire_date: '2022-06-15',
                b_id: 101
            })
        });
        assert(empPut1.ok, 'PUT /api/employees/201 without status payload succeeds', JSON.stringify(empPut1.data));

        // PUT with status
        const empPut2 = await api('/employees/201', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Rahul',
                last_name: 'Sharma',
                salary: 50000,
                hire_date: '2022-06-15',
                b_id: 101,
                status: 'ACTIVE'
            })
        });
        assert(empPut2.ok, 'PUT /api/employees/201 with status payload succeeds', JSON.stringify(empPut2.data));

        // 5. Test Error Formatting (No Oracle URL Leaks)
        console.log('\n[5] Testing Error Message Formatting...');
        // Duplicate PAN
        const dupPan = await api('/customers/302', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Priyanshi',
                pan: 'ABCDE1234F' // Already belongs to 301
            })
        });
        assert(!dupPan.ok && dupPan.status === 400, 'Duplicate PAN correctly rejected with 400');
        assert(!dupPan.data.error.includes('http'), 'Error does not contain Oracle documentation URL');

        // Invalid Foreign Key
        const badFk = await api('/employees/201', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: 'Rahul',
                b_id: 999999 // Invalid branch
            })
        });
        assert(!badFk.ok && badFk.status === 400, 'Invalid foreign key rejected with 400');
        assert(!badFk.data.error.includes('http'), 'Error does not contain Oracle documentation URL');

        // 6. Test Account & CreditCard Still Work with Status
        console.log('\n[6] Testing Account & CreditCard Status Workflow...');
        const accPut = await api('/accounts/401', {
            method: 'PUT',
            body: JSON.stringify({
                acc_type: 'SAVINGS',
                status: 'ACTIVE'
            })
        });
        assert(accPut.ok, 'PUT /api/accounts/401 succeeds with status');

        const cardPut = await api('/creditcards/4111111111111111', {
            method: 'PUT',
            body: JSON.stringify({
                type: 'VISA',
                card_limit: 150000,
                status: 'ACTIVE'
            })
        });
        assert(cardPut.ok, 'PUT /api/creditcards/4111111111111111 succeeds with status');

        console.log(`\n================================================================`);
        console.log(`STATUS-AGNOSTIC TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
        console.log(`================================================================\n`);

    } finally {
        if (conn) {
            try { await conn.close(); } catch (_) {}
        }
    }
}

runTests().catch(err => {
    console.error('Test runner failure:', err);
    process.exit(1);
});
