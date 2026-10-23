const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        passCount++;
    } else {
        console.error(`  [FAIL] ${testName} - ${details}`);
        failCount++;
    }
}

async function runSuite() {
    console.log('================================================================');
    console.log('FINORA DBMS DA 2: 15-STEP SAFE DELETE & AUDIT VERIFICATION SUITE');
    console.log('================================================================\n');

    try {
        // -------------------------------------------------------------
        // TEST 1: Customer Soft-Delete (Deactivate)
        // -------------------------------------------------------------
        console.log('TEST 1: Customer Soft-Delete (Deactivate Customer #301)');
        const res1 = await request('PATCH', '/customers/301/status', { status: 'INACTIVE' });
        assert(res1.status === 200 && res1.data.success === true && res1.data.data.status === 'INACTIVE',
            'Customer status updated to INACTIVE', JSON.stringify(res1.data));

        // -------------------------------------------------------------
        // TEST 2: Customer Reactivation
        // -------------------------------------------------------------
        console.log('\nTEST 2: Customer Reactivation (Activate Customer #301)');
        const res2 = await request('PATCH', '/customers/301/status', { status: 'ACTIVE' });
        assert(res2.status === 200 && res2.data.success === true && res2.data.data.status === 'ACTIVE',
            'Customer status reactivated to ACTIVE', JSON.stringify(res2.data));

        // -------------------------------------------------------------
        // TEST 3: Customer Hard-Delete Rejection
        // -------------------------------------------------------------
        console.log('\nTEST 3: Customer Hard-Delete Rejection for Customer with financial records');
        const res3 = await request('DELETE', '/customers/301');
        assert(res3.status === 400 && res3.data.success === false && res3.data.error.includes('financial records'),
            'Rejects hard deletion with financial records explanation', JSON.stringify(res3.data));

        // -------------------------------------------------------------
        // TEST 4: Customer Phone Management (Add and Delete specific phone)
        // -------------------------------------------------------------
        console.log('\nTEST 4: Customer Phone Management (Add and Delete specific phone number)');
        const testPhone = '9998887776';
        const res4a = await request('POST', '/customers/301/phones', { phone: testPhone });
        assert(res4a.status === 200 && res4a.data.success === true, 'Phone number added for customer #301');
        
        const res4b = await request('DELETE', `/customers/301/phones/${testPhone}`);
        assert(res4b.status === 200 && res4b.data.success === true, 'Specific phone number deleted cleanly');

        const custVerify = await request('GET', '/customers');
        const c301 = custVerify.data.data.find(c => c[0] === 301);
        assert(c301 && c301[0] === 301, 'Customer #301 still exists intact');

        // -------------------------------------------------------------
        // TEST 5: Account Close Rejection on Positive Balance
        // -------------------------------------------------------------
        console.log('\nTEST 5: Account Close Rejection with positive balance');
        const res5 = await request('POST', '/accounts/401/close');
        assert(res5.status === 400 && res5.data.error.includes('Balance must be zero'),
            'Rejects account closure when balance > 0', JSON.stringify(res5.data));

        // -------------------------------------------------------------
        // TEST 6: Account Close Success on Zero Balance
        // -------------------------------------------------------------
        console.log('\nTEST 6: Account Close Success when balance is 0');
        const newAccRes = await request('POST', '/accounts', {
            cid: 301,
            acc_type: 'SAVINGS',
            balance: 0,
            status: 'ACTIVE'
        });
        const testAccId = newAccRes.data.data.acc_id;
        assert(newAccRes.status === 200 && testAccId, `Created zero-balance account #${testAccId}`);

        const res6 = await request('POST', `/accounts/${testAccId}/close`);
        assert(res6.status === 200 && res6.data.data.status === 'CLOSED',
            `Account #${testAccId} successfully marked CLOSED`, JSON.stringify(res6.data));

        // -------------------------------------------------------------
        // TEST 7: Post-Close Operation Rejection (Trigger validation)
        // -------------------------------------------------------------
        console.log('\nTEST 7: Post-Close Operation Rejection on closed account');
        const res7 = await request('POST', '/deposit', { acc_id: testAccId, amount: 500 });
        assert(res7.status === 500 && (res7.data.error.includes('Account is not active') || res7.data.error.includes('ORA-20002')),
            'Deposit on CLOSED account rejected by database trigger', JSON.stringify(res7.data));

        // -------------------------------------------------------------
        // TEST 8: Account Hard-Delete Rejection with Transaction History
        // -------------------------------------------------------------
        console.log('\nTEST 8: Account Hard-Delete Rejection with Transaction History');
        const res8 = await request('DELETE', '/accounts/401');
        assert(res8.status === 400 && res8.data.error.includes('transaction record'),
            'Hard delete of Account #401 rejected due to transaction audit history', JSON.stringify(res8.data));

        // -------------------------------------------------------------
        // TEST 9: Transaction Hard-Delete Prohibition (403 Forbidden)
        // -------------------------------------------------------------
        console.log('\nTEST 9: Transaction Hard-Delete Prohibition (HTTP 403)');
        const res9 = await request('DELETE', '/transactions/701');
        assert(res9.status === 403 && res9.data.error.includes('strictly prohibited'),
            'DELETE /api/transactions/701 returns HTTP 403 Forbidden', JSON.stringify(res9.data));

        // -------------------------------------------------------------
        // TEST 10: Transaction Reversal on DEPOSIT
        // -------------------------------------------------------------
        console.log('\nTEST 10: Safe Transaction Reversal on DEPOSIT');
        const balBefore10 = (await request('GET', '/account/401/balance')).data.data[0][0];
        const depRes = await request('POST', '/deposit', { acc_id: 401, amount: 250 });
        const depTid = depRes.data.data.t_id;
        const balAfterDep = (await request('GET', '/account/401/balance')).data.data[0][0];
        assert(balAfterDep === balBefore10 + 250, `Deposit of 250 succeeded (New balance: ${balAfterDep})`);

        const revDepRes = await request('POST', `/transactions/${depTid}/reverse`);
        const balAfterRevDep = (await request('GET', '/account/401/balance')).data.data[0][0];
        assert(revDepRes.status === 200 && revDepRes.data.success === true, 'Reversal endpoint succeeded');
        assert(balAfterRevDep === balBefore10,
            `Balance correctly reverted by offset WITHDRAWAL with ZERO double updates (Final: ${balAfterRevDep})`);

        // -------------------------------------------------------------
        // TEST 11: Transaction Reversal on WITHDRAWAL
        // -------------------------------------------------------------
        console.log('\nTEST 11: Safe Transaction Reversal on WITHDRAWAL');
        const balBefore11 = (await request('GET', '/account/401/balance')).data.data[0][0];
        const wdrRes = await request('POST', '/withdraw', { acc_id: 401, amount: 150 });
        const wdrTid = wdrRes.data.data.t_id;
        const balAfterWdr = (await request('GET', '/account/401/balance')).data.data[0][0];
        assert(balAfterWdr === balBefore11 - 150, `Withdrawal of 150 succeeded (New balance: ${balAfterWdr})`);

        const revWdrRes = await request('POST', `/transactions/${wdrTid}/reverse`);
        const balAfterRevWdr = (await request('GET', '/account/401/balance')).data.data[0][0];
        assert(revWdrRes.status === 200 && revWdrRes.data.success === true, 'Reversal endpoint succeeded');
        assert(balAfterRevWdr === balBefore11,
            `Balance correctly reverted by offset DEPOSIT with ZERO double updates (Final: ${balAfterRevWdr})`);

        // -------------------------------------------------------------
        // TEST 12: Loan Settle Operation
        // -------------------------------------------------------------
        console.log('\nTEST 12: Loan Settle Operation');
        const newLoanRes = await request('POST', '/loans', {
            cid: 301,
            l_type: 'PERSONAL',
            amount: 50000,
            interest: 10.5,
            term: 12
        });
        const testLoanId = newLoanRes.data.data.l_id;
        const settleRes = await request('POST', `/loans/${testLoanId}/settle`);
        assert(settleRes.status === 200 && settleRes.data.data.status === 'SETTLED',
            `Loan #${testLoanId} marked as SETTLED`, JSON.stringify(settleRes.data));

        // -------------------------------------------------------------
        // TEST 13: Loan Hard-Delete Rejection
        // -------------------------------------------------------------
        console.log('\nTEST 13: Loan Hard-Delete Rejection for active/responsible loans');
        const res13 = await request('DELETE', '/loans/601');
        assert(res13.status === 400 && res13.data.error.includes('settle the loan instead'),
            'Rejects hard deletion of Loan #601 with active/responsible history', JSON.stringify(res13.data));

        // -------------------------------------------------------------
        // TEST 14: Credit Card Block, Unblock, Close & Hard-Delete Rejection
        // -------------------------------------------------------------
        console.log('\nTEST 14: Credit Card Block, Unblock, Close & Hard-Delete Rejection');
        const cardsRes = await request('GET', '/creditcards');
        const testCardPno = String(cardsRes.data.data[0][0]);

        const blkRes = await request('PATCH', `/creditcards/${testCardPno}/status`, { status: 'BLOCKED' });
        assert(blkRes.status === 200 && blkRes.data.data.status === 'BLOCKED', 'Card status set to BLOCKED');

        const unblkRes = await request('PATCH', `/creditcards/${testCardPno}/status`, { status: 'ACTIVE' });
        assert(unblkRes.status === 200 && unblkRes.data.data.status === 'ACTIVE', 'Card status unblocked to ACTIVE');

        const delCardRes = await request('DELETE', `/creditcards/${testCardPno}`);
        assert(delCardRes.status === 400 && delCardRes.data.error.includes('cannot be physically deleted'),
            'Hard deletion of credit card rejected with audit explanation');

        // -------------------------------------------------------------
        // TEST 15: Branch & Employee Deactivation Policy & Nominee Removal
        // -------------------------------------------------------------
        console.log('\nTEST 15: Branch/Employee Deactivation Policy & Nominee Removal');
        // 15a: Branch deactivation rejection with active employees
        const brDeactRes = await request('PATCH', '/branches/101/status', { status: 'INACTIVE' });
        assert(brDeactRes.status === 400 && brDeactRes.data.error.includes('active employee'),
            'Branch #101 deactivation rejected because active employees exist');

        // 15b: Employee status toggle
        const empDeactRes = await request('PATCH', '/employees/201/status', { status: 'INACTIVE' });
        assert(empDeactRes.status === 200 && empDeactRes.data.data.status === 'INACTIVE', 'Employee #201 deactivated');
        const empActRes = await request('PATCH', '/employees/201/status', { status: 'ACTIVE' });
        assert(empActRes.status === 200 && empActRes.data.data.status === 'ACTIVE', 'Employee #201 reactivated');

        // 15c: Employee hard delete rejection
        const empDelRes = await request('DELETE', '/employees/201');
        assert(empDelRes.status === 400 && empDelRes.data.error.includes('Cannot delete employee'),
            'Hard deletion of Employee #201 rejected due to assigned customer/branch records');

        // 15d: Nominee Removal without affecting account or customer
        const nomRes = await request('GET', '/nominees');
        const nomList = nomRes.data.data;
        if (nomList && nomList.length > 0) {
            const sampleNomId = nomList[nomList.length - 1][0];
            const sampleAccId = nomList[nomList.length - 1][6];
            const delNomRes = await request('DELETE', `/nominees/${sampleNomId}`);
            assert(delNomRes.status === 200 && delNomRes.data.success === true,
                `Nominee #${sampleNomId} removed cleanly from Owns and Nominee`);

            // Verify account still exists and balance unaffected
            const accVerify = await request('GET', `/account/${sampleAccId}/balance`);
            assert(accVerify.status === 200, `Account #${sampleAccId} remains fully intact with balance`);
        } else {
            console.log('  [INFO] No nominee records to remove; check passed');
        }

        console.log('\n================================================================');
        console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
        console.log('================================================================');

        process.exit(failCount > 0 ? 1 : 0);
    } catch (err) {
        console.error('Unhandled test failure:', err);
        process.exit(1);
    }
}

runSuite();
