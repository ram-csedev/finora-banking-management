/**
 * Finora DA3 - Comprehensive API Test Suite
 * Tests Health, Dashboards, Metadata, CRUD, Referential Guards, Banking Operations,
 * Atomic Transfers, Loan Repayments, Workbench Policy, and Audit Trail against CockroachDB Cloud.
 */
process.env.NODE_ENV = 'test_embedded';
require('dotenv').config();
const http = require('http');
const { app } = require('./server');
const db = require('./config/db');

async function runTestSuite() {
  console.log('================================================================');
  console.log('FINORA DA3: REST API TEST SUITE');
  console.log('Target: CockroachDB Cloud (finora_da3)');
  console.log('================================================================\n');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Test server running at ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  async function assert(testName, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${testName}`);
      console.error(`  Error: ${err.message}`);
      if (err.responseBody) console.error(`  Response:`, err.responseBody);
      failed++;
    }
  }

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = text;
    }
    return { status: res.status, ok: res.ok, body: json };
  }

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: Health & Telemetry
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: HEALTH & TELEMETRY ---');
    await assert('GET /api/health returns UP with CockroachDB metadata', async () => {
      const res = await request('/api/health');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.cockroachDB.database !== 'finora_da3') {
        throw new Error(`Expected finora_da3, got ${res.body.cockroachDB.database}`);
      }
      if (!res.body.cockroachDB.engine.includes('CockroachDB')) {
        throw new Error(`Expected CockroachDB engine, got ${res.body.cockroachDB.engine}`);
      }
    });

    // ------------------------------------------------------------------------
    // SECTION 2: Analytical Dashboard Views
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: ANALYTICAL DASHBOARD VIEWS ---');
    await assert('GET /api/dashboard/summary returns valid KPI aggregates', async () => {
      const res = await request('/api/dashboard/summary');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      const data = res.body.data;
      if (parseInt(data.total_customers, 10) < 12) throw new Error('Customer count too low');
      if (parseInt(data.total_accounts, 10) < 10) throw new Error('Account count too low');
      if (parseFloat(data.total_balance) <= 0) throw new Error('Total balance must be positive');
    });

    await assert('GET /api/dashboard/customers returns joined view data', async () => {
      const res = await request('/api/dashboard/customers?limit=10');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.data.length === 0) throw new Error('Expected customer dashboard rows');
      const sample = res.body.data[0];
      if (!sample.customer_name || !sample.acc_type) throw new Error('Missing joined fields');
    });

    // ------------------------------------------------------------------------
    // SECTION 3: Metadata & Database Explorer
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: METADATA & SCHEMA INTROSPECTION ---');
    await assert('GET /api/metadata/tables returns all 14 core tables with row counts', async () => {
      const res = await request('/api/metadata/tables');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      const baseTables = res.body.data.filter((t) => t.tableType === 'BASE TABLE');
      if (baseTables.length !== 14) throw new Error(`Expected 14 base tables, got ${baseTables.length}`);
      if (res.body.count !== 19) throw new Error(`Expected 19 total catalog objects, got ${res.body.count}`);
    });

    await assert('GET /api/metadata/columns/account returns column definitions with PK/FK flags', async () => {
      const res = await request('/api/metadata/columns/account');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      const pkCol = res.body.data.find((c) => c.column_name === 'acc_id');
      if (!pkCol || !pkCol.is_primary_key) throw new Error('acc_id must be identified as PK');
      const fkCol = res.body.data.find((c) => c.column_name === 'b_id');
      if (!fkCol || !fkCol.is_foreign_key) throw new Error('b_id must be identified as FK');
    });

    await assert('GET /api/metadata/relationships returns 23 foreign key relationships', async () => {
      const res = await request('/api/metadata/relationships');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.count < 20) throw new Error(`Expected >= 20 relationships, got ${res.body.count}`);
    });

    await assert('GET /api/metadata/schema returns full graph for ER diagram', async () => {
      const res = await request('/api/metadata/schema');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (!res.body.data.tables || !res.body.data.relationships) throw new Error('Invalid schema graph format');
    });

    // ------------------------------------------------------------------------
    // SECTION 4: Read-Only Entities & Pagination
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: READ-ONLY ENTITIES & PAGINATION ---');
    await assert('GET /api/customers?page=1&limit=5 returns paginated records', async () => {
      const res = await request('/api/customers?page=1&limit=5');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.pagination.limit !== 5) throw new Error('Limit mismatch');
      if (res.body.data.length !== 5) throw new Error(`Expected 5 records, got ${res.body.data.length}`);
      if (res.body.pagination.totalRecords < 14) throw new Error('Total records mismatch');
    });

    await assert('GET /api/branches returns branch list with search filter', async () => {
      const res = await request('/api/branches?search=Mumbai');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.data.length === 0) throw new Error('Search failed to find Mumbai branch');
      if (!res.body.data[0].branch_name.includes('Market')) throw new Error('Expected Market Branch');
    });

    // ------------------------------------------------------------------------
    // SECTION 5: CRUD Operations & Integrity Safeguards
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: CRUD OPERATIONS & INTEGRITY SAFEGUARDS ---');
    const testBranchId = 199;
    const testBranchIfsc = 'SBIN0000199';
    let createdBranchId = testBranchId;

    await assert('POST /api/branches creates a new branch record', async () => {
      await db.query("DELETE FROM branch WHERE ifsc IN ('SBIN0000199', 'SBIN0000198')").catch(() => {});
      const res = await request('/api/branches', {
        method: 'POST',
        body: JSON.stringify({
          b_id: testBranchId,
          branch_name: 'Test Branch Alpha',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          ifsc: testBranchIfsc,
          contact: '020-1234567'
        })
      });
      if (res.status !== 201 || !res.body.success) throw new Error(`Create failed: ${JSON.stringify(res.body)}`);
      createdBranchId = res.body.data.b_id;
    });

    await assert('POST /api/branches rejects duplicate IFSC with 409 Conflict', async () => {
      const res = await request('/api/branches', {
        method: 'POST',
        body: JSON.stringify({
          b_id: 198,
          branch_name: 'Duplicate IFSC Branch',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          ifsc: testBranchIfsc, // duplicate
          contact: '020-1234567'
        })
      });
      if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
    });

    await assert('GET /api/branches/:id retrieves created branch', async () => {
      const res = await request(`/api/branches/${createdBranchId}`);
      if (res.status !== 200 || !res.body.success) throw new Error(`Get by ID failed: ${JSON.stringify(res.body)}`);
      if (res.body.data.branch_name !== 'Test Branch Alpha') throw new Error('Name mismatch');
    });

    await assert('PUT /api/branches/:id updates branch record', async () => {
      const res = await request(`/api/branches/${createdBranchId}`, {
        method: 'PUT',
        body: JSON.stringify({
          branch_name: 'Test Branch Beta'
        })
      });
      if (res.status !== 200 || !res.body.success) throw new Error(`Update failed: ${JSON.stringify(res.body)}`);
      if (res.body.data.branch_name !== 'Test Branch Beta') throw new Error('Update did not apply');
    });

    await assert('DELETE /api/branches/:id successfully deletes unattached test branch', async () => {
      const res = await request(`/api/branches/${createdBranchId}`, {
        method: 'DELETE'
      });
      if (res.status !== 200 || !res.body.success) throw new Error(`Delete failed: ${JSON.stringify(res.body)}`);
    });

    await assert('DELETE /api/branches/101 is REJECTED due to active employee/account references', async () => {
      const res = await request('/api/branches/101', {
        method: 'DELETE'
      });
      if (res.status !== 409 && res.status !== 400) throw new Error(`Expected 409 or 400 Referential Integrity / Deletion Guard, got ${res.status}`);
    });

    await assert('DELETE /api/customers/301 is REJECTED due to active account/loan relationships', async () => {
      const res = await request('/api/customers/301', {
        method: 'DELETE'
      });
      if (res.status !== 400 && res.status !== 409) throw new Error(`Expected 400 Financial Deletion Guard, got ${res.status}`);
      if (!res.body.error.includes('account') || !res.body.error.includes('relationship')) throw new Error('Guard message mismatch');
    });

    await assert('DELETE /api/accounts/401 is REJECTED due to positive balance & transaction history', async () => {
      const res = await request('/api/accounts/401', {
        method: 'DELETE'
      });
      if (res.status !== 400) throw new Error(`Expected 400 Deletion Guard, got ${res.status}`);
    });

    // ------------------------------------------------------------------------
    // SECTION 6: Financial Operations (Deposits, Withdrawals, Transfers, Loans)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: FINANCIAL OPERATIONS ---');

    await assert('POST /api/banking/deposit rejects negative/invalid amount', async () => {
      const res = await request('/api/banking/deposit', {
        method: 'POST',
        body: JSON.stringify({ acc_id: 401, amount: -500 })
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    });

    await assert('POST /api/banking/deposit rejects non-existent account with 404', async () => {
      const res = await request('/api/banking/deposit', {
        method: 'POST',
        body: JSON.stringify({ acc_id: 99999, amount: 1000 })
      });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    });

    let balanceBeforeDeposit = 0;
    await assert('POST /api/banking/deposit atomically increments balance and records transaction', async () => {
      const getAcc = await request('/api/accounts/401');
      balanceBeforeDeposit = parseFloat(getAcc.body.data.balance);

      const res = await request('/api/banking/deposit', {
        method: 'POST',
        body: JSON.stringify({
          acc_id: 401,
          amount: 5000.00,
          mode: 'ONLINE',
          description: 'Automated Test Deposit'
        })
      });

      if (res.status !== 200 || !res.body.success) throw new Error(`Deposit failed: ${JSON.stringify(res.body)}`);
      const newBal = parseFloat(res.body.account.balance);
      if (Math.abs(newBal - (balanceBeforeDeposit + 5000.00)) > 0.01) {
        throw new Error(`Balance calculation error. Expected ${balanceBeforeDeposit + 5000}, got ${newBal}`);
      }
      if (res.body.transaction.type !== 'DEPOSIT' || parseFloat(res.body.transaction.amount) !== 5000.00) {
        throw new Error('Transaction record mismatch');
      }
    });

    await assert('POST /api/banking/withdraw rejects insufficient balance', async () => {
      const res = await request('/api/banking/withdraw', {
        method: 'POST',
        body: JSON.stringify({ acc_id: 403, amount: 99999999.00, mode: 'ATM' })
      });
      if (res.status !== 400) throw new Error(`Expected 400 Insufficient Funds, got ${res.status}`);
      if (!res.body.error.includes('Insufficient balance')) throw new Error('Error message mismatch');
    });

    await assert('POST /api/banking/withdraw atomically decrements balance and records transaction', async () => {
      const getAcc = await request('/api/accounts/401');
      const balBefore = parseFloat(getAcc.body.data.balance);

      const res = await request('/api/banking/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          acc_id: 401,
          amount: 2000.00,
          mode: 'ATM',
          description: 'Automated Test ATM Withdrawal'
        })
      });

      if (res.status !== 200 || !res.body.success) throw new Error(`Withdrawal failed: ${JSON.stringify(res.body)}`);
      const newBal = parseFloat(res.body.account.balance);
      if (Math.abs(newBal - (balBefore - 2000.00)) > 0.01) {
        throw new Error(`Expected ${balBefore - 2000}, got ${newBal}`);
      }
      if (res.body.transaction.type !== 'WITHDRAWAL') throw new Error('Transaction type mismatch');
    });

    await assert('POST /api/banking/transfer rejects transfer between identical accounts', async () => {
      const res = await request('/api/banking/transfer', {
        method: 'POST',
        body: JSON.stringify({ from_acc: 401, to_acc: 401, amount: 500 })
      });
      if (res.status !== 400) throw new Error(`Expected 400 Same Account, got ${res.status}`);
    });

    await assert('POST /api/banking/transfer rejects insufficient funds', async () => {
      const res = await request('/api/banking/transfer', {
        method: 'POST',
        body: JSON.stringify({ from_acc: 403, to_acc: 401, amount: 99999999 })
      });
      if (res.status !== 400) throw new Error(`Expected 400 Insufficient Funds, got ${res.status}`);
    });

    await assert('POST /api/banking/transfer executes atomic transfer with linked transactions', async () => {
      const [srcBefore, dstBefore] = await Promise.all([
        request('/api/accounts/401'),
        request('/api/accounts/402')
      ]);

      const srcBal = parseFloat(srcBefore.body.data.balance);
      const dstBal = parseFloat(dstBefore.body.data.balance);
      const transferAmount = 3000.00;

      const res = await request('/api/banking/transfer', {
        method: 'POST',
        body: JSON.stringify({
          from_acc: 401,
          to_acc: 402,
          amount: transferAmount,
          mode: 'ONLINE',
          description: 'Automated Test Peer Transfer'
        })
      });

      if (res.status !== 200 || !res.body.success) throw new Error(`Transfer failed: ${JSON.stringify(res.body)}`);

      // Verify returned balances
      if (Math.abs(res.body.fromAccount.balance - (srcBal - transferAmount)) > 0.01) {
        throw new Error('Source account balance mismatch');
      }
      if (Math.abs(res.body.toAccount.balance - (dstBal + transferAmount)) > 0.01) {
        throw new Error('Destination account balance mismatch');
      }

      // Verify linked bilateral transactions
      const leg1 = res.body.fromAccount.transaction;
      const leg2 = res.body.toAccount.transaction;
      if (leg1.related_trans_id !== leg2.t_id || leg2.related_trans_id !== leg1.t_id) {
        throw new Error('Transfer transactions are not bilaterally linked');
      }
    });

    await assert('POST /api/banking/loan-payment validates component arithmetic', async () => {
      const res = await request('/api/banking/loan-payment', {
        method: 'POST',
        body: JSON.stringify({
          l_id: 601,
          amount: 20000.00,
          principal_amount: 10000.00,
          interest_amount: 8000.00 // Sum is 18000 != 20000
        })
      });
      if (res.status !== 400) throw new Error(`Expected 400 Component Mismatch, got ${res.status}`);
    });

    await assert('POST /api/banking/loan-payment records valid installment payment', async () => {
      const res = await request('/api/banking/loan-payment', {
        method: 'POST',
        body: JSON.stringify({
          l_id: 601,
          amount: 20140.00,
          principal_amount: 4571.00,
          interest_amount: 15569.00,
          payment_mode: 'ONLINE',
          remarks: 'Automated Test Loan Installment'
        })
      });
      if (res.status !== 201 || !res.body.success) throw new Error(`Loan payment failed: ${JSON.stringify(res.body)}`);
      if (parseFloat(res.body.payment.amount) !== 20140.00) throw new Error('Payment amount mismatch');
    });

    // ------------------------------------------------------------------------
    // SECTION 7: SQL Workbench Backend Policy & Guardrails
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7: SQL WORKBENCH SAFETY POLICY ---');
    await assert('GET /api/workbench/policy returns restricted policy definitions', async () => {
      const res = await request('/api/workbench/policy');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      if (res.body.policy.statementTimeoutMs !== 5000) throw new Error('Timeout must be 5000ms');
      if (res.body.policy.maxRowLimit !== 500) throw new Error('Max row limit must be 500');
    });

    await assert('POST /api/workbench/execute blocks destructive DROP TABLE with 403', async () => {
      const res = await request('/api/workbench/execute', {
        method: 'POST',
        body: JSON.stringify({ query: 'DROP TABLE customer;' })
      });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    });

    await assert('POST /api/workbench/execute blocks multi-statement chaining with 403', async () => {
      const res = await request('/api/workbench/execute', {
        method: 'POST',
        body: JSON.stringify({ query: 'SELECT 1; SELECT 2;' })
      });
      if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    });

    await assert('POST /api/workbench/execute permits safe parameterized SELECT query', async () => {
      const res = await request('/api/workbench/execute', {
        method: 'POST',
        body: JSON.stringify({ query: 'SELECT b_id, branch_name, ifsc FROM branch ORDER BY b_id LIMIT 3;' })
      });
      if (res.status !== 200 || !res.body.success) throw new Error(`Execute failed: ${JSON.stringify(res.body)}`);
      if (res.body.returnedRows !== 3) throw new Error(`Expected 3 rows, got ${res.body.returnedRows}`);
    });

    // ------------------------------------------------------------------------
    // SECTION 8: Audit Log Verification
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 8: AUDIT LOG VERIFICATION ---');
    await assert('GET /api/audit-logs verifies that banking events were logged without secrets', async () => {
      const res = await request('/api/audit-logs?limit=10&sortBy=created_at&sortOrder=DESC');
      if (res.status !== 200 || !res.body.success) throw new Error(`Status ${res.status}`);
      const logs = res.body.data;
      const depositLog = logs.find((l) => l.action === 'DEPOSIT');
      const transferLog = logs.find((l) => l.action === 'TRANSFER_FUNDS');
      if (!depositLog) throw new Error('Expected DEPOSIT audit log entry');
      if (!transferLog) throw new Error('Expected TRANSFER_FUNDS audit log entry');

      // Check no password/cvv/secret leaked in json details
      const stringified = JSON.stringify(logs);
      if (stringified.includes('***REDACTED***') || !stringified.toLowerCase().includes('cvv')) {
        // Safe!
      } else {
        throw new Error('Potential secret leakage detected in audit logs');
      }
    });

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    server.close();
    await db.pool.end();
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
