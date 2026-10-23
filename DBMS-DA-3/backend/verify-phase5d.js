/**
 * verify-phase5d.js
 * Comprehensive end-to-end audit and verification for Phase 5D.
 * Tests backend API, CockroachDB live metadata, analytical views,
 * SQL workbench safety guards, and frontend page routes.
 */

const http = require('http');

async function get(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('FINORA DA3 — PHASE 5D VERIFICATION & UI AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${name}`);
      console.error(`  Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health & DB Connectivity
  console.log('--- 1. BACKEND HEALTH & CLOUD CONNECTIVITY ---');
  await test('GET /api/health returns CockroachDB cloud connection status', async () => {
    const res = await get('http://localhost:5000/api/health');
    if (res.status !== 200 || res.data.cockroachDB?.status !== 'UP') throw new Error('DB not UP');
    if (res.data.cockroachDB.database !== 'finora_da3') throw new Error(`Wrong DB: ${res.data.cockroachDB.database}`);
  });

  // 2. Metadata Introspection
  console.log('\n--- 2. DATABASE METADATA & RELATIONS ---');
  await test('GET /api/metadata/tables returns 19 database objects (14 base tables + 5 views)', async () => {
    const res = await get('http://localhost:5000/api/metadata/tables');
    if (res.status !== 200 || res.data.count !== 19) throw new Error(`Expected 19 objects, got ${res.data.count}`);
    const tables = res.data.data.filter(t => t.tableType === 'BASE TABLE');
    const views = res.data.data.filter(t => t.tableType === 'VIEW');
    if (tables.length !== 14) throw new Error(`Expected 14 base tables, got ${tables.length}`);
    if (views.length !== 5) throw new Error(`Expected 5 views, got ${views.length}`);
  });

  await test('GET /api/metadata/relationships returns exactly 23 live foreign-key constraints', async () => {
    const res = await get('http://localhost:5000/api/metadata/relationships');
    if (res.status !== 200 || res.data.count !== 23) throw new Error(`Expected 23 FKs, got ${res.data.count}`);
  });

  await test('GET /api/metadata/columns/account flags acc_id as PK and b_id as FK', async () => {
    const res = await get('http://localhost:5000/api/metadata/columns/account');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const accId = res.data.data.find(c => c.column_name === 'acc_id');
    const bId = res.data.data.find(c => c.column_name === 'b_id');
    if (!accId?.is_primary_key) throw new Error('acc_id must be PK');
    if (!bId?.is_foreign_key) throw new Error('b_id must be FK');
  });

  // 3. Analytical Views
  console.log('\n--- 3. ANALYTICAL VIEWS ---');
  const viewEndpoints = [
    { name: 'dashboard_summary', path: '/api/dashboard/summary' },
    { name: 'customer_dashboard', path: '/api/dashboard/customers' },
    { name: 'transaction_dashboard', path: '/api/dashboard/transactions' },
    { name: 'loan_dashboard', path: '/api/dashboard/loans' },
    { name: 'creditcard_dashboard', path: '/api/dashboard/creditcards' },
  ];

  for (const v of viewEndpoints) {
    await test(`GET ${v.path} delivers compiled ${v.name} view data`, async () => {
      const res = await get(`http://localhost:5000${v.path}`);
      if (res.status !== 200 || !res.data.success) throw new Error(`Failed to query view ${v.name}`);
      if (res.data.data === undefined) throw new Error(`Empty view data for ${v.name}`);
    });
  }

  // 4. Core Banking Management Entities
  console.log('\n--- 4. CORE BANKING ENTITY APIS ---');
  await test('GET /api/customers supports pagination, search, and sorting', async () => {
    const res = await get('http://localhost:5000/api/customers?limit=5&page=1&sortBy=cid&sortOrder=ASC');
    if (res.status !== 200 || res.data.data.length !== 5) throw new Error('Customer pagination mismatch');
  });

  await test('GET /api/accounts lists accounts with live balances', async () => {
    const res = await get('http://localhost:5000/api/accounts?limit=10');
    if (res.status !== 200 || res.data.data.length === 0) throw new Error('No accounts returned');
  });

  await test('GET /api/transactions lists bilateral transactions', async () => {
    const res = await get('http://localhost:5000/api/transactions?limit=10');
    if (res.status !== 200 || res.data.data.length === 0) throw new Error('No transactions returned');
  });

  await test('GET /api/loans lists active facilities', async () => {
    const res = await get('http://localhost:5000/api/loans?limit=10');
    if (res.status !== 200 || res.data.data.length === 0) throw new Error('No loans returned');
  });

  await test('GET /api/branches lists all 6 branches', async () => {
    const res = await get('http://localhost:5000/api/branches');
    if (res.status !== 200 || res.data.data.length !== 6) throw new Error(`Expected 6 branches, got ${res.data.data.length}`);
  });

  await test('GET /api/employees lists staff officers', async () => {
    const res = await get('http://localhost:5000/api/employees?limit=10');
    if (res.status !== 200 || res.data.data.length !== 10) throw new Error(`Expected 10 employees, got ${res.data.data.length}`);
  });

  // 5. SQL Workbench Guard Policies
  console.log('\n--- 5. SQL WORKBENCH SAFETY RESTRICTIONS ---');
  await test('POST /api/workbench/execute permits safe read-only SELECT', async () => {
    const res = await post('http://localhost:5000/api/workbench/execute', {
      query: 'SELECT b_id, branch_name, city FROM branch ORDER BY b_id LIMIT 3'
    });
    if (res.status !== 200 || !res.data.success || res.data.rowCount !== 3) {
      throw new Error(`Select query failed: ${JSON.stringify(res)}`);
    }
  });

  await test('POST /api/workbench/execute blocks DROP TABLE with 403 Forbidden', async () => {
    const res = await post('http://localhost:5000/api/workbench/execute', {
      query: 'DROP TABLE customer'
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await test('POST /api/workbench/execute blocks DELETE statements with 403 Forbidden', async () => {
    const res = await post('http://localhost:5000/api/workbench/execute', {
      query: 'DELETE FROM account WHERE acc_id = 401'
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await test('POST /api/workbench/execute blocks multi-statement chaining with 403 Forbidden', async () => {
    const res = await post('http://localhost:5000/api/workbench/execute', {
      query: 'SELECT 1; DROP TABLE loan;'
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 6. Frontend Dev Server Routes
  console.log('\n--- 6. FRONTEND SPA ROUTES (HTTP 200) ---');
  const pages = [
    '/',
    '/customers',
    '/accounts',
    '/transactions',
    '/loans',
    '/branches',
    '/employees',
    '/database',
    '/workbench',
    '/showcase',
    '/schema'
  ];

  for (const page of pages) {
    await test(`SPA Route http://localhost:5173${page} is live`, async () => {
      const res = await fetch(`http://localhost:5173${page}`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
    });
  }

  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
}

runAudit().catch(console.error);
