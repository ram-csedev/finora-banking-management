/**
 * Finora DA3 - Branch Filter & Record Display Regression Verification Suite
 * Verifies:
 * 1. "All Branches" includes all staff members across all branches.
 * 2. Specific branch filters return only staff belonging to that branch.
 * 3. Newly created staff (Karthikeyan Sarv & sivarm krishnan) are visible in "All Branches"
 *    and under their respective branches (101 & 102), and excluded from other branches.
 * 4. Search and branch filters combine accurately with parameterized SQL.
 * 5. String sentinels like 'all' and empty string '' are correctly handled without breaking WHERE clauses.
 * 6. Pagination limits (10, 25, 50), page 1 vs page 2 access, and total count synchronization.
 * 7. Verification across other audited list endpoints (customers, accounts, transactions, loans, credit cards, duties).
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, ok: res.ok, body: json };
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('FINORA DA3 - BRANCH FILTER & RECORD DISPLAY REGRESSION TEST');
  console.log(`Target: ${BASE_URL}`);
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
      console.error(`  Details: ${err.message}`);
      failed++;
    }
  }

  // 1. All Branches list returns all employees including newly created staff
  await test('1. All Branches list returns all 12 staff members including new hires', async () => {
    const res = await fetchJson('/employees?limit=50');
    if (!res.ok || !res.body.success) throw new Error(`HTTP ${res.status}`);
    const emps = res.body.data;
    const total = res.body.pagination.totalRecords;

    if (total < 12) throw new Error(`Expected at least 12 employees, got total=${total}`);
    if (emps.length < 12) throw new Error(`Expected at least 12 employees returned with limit=50, got ${emps.length}`);

    const karthik = emps.find((e) => e.first_name.includes('Karthikeyan') || e.last_name?.includes('Sarv'));
    const sivarm = emps.find((e) => e.first_name.includes('sivarm') || e.last_name?.includes('krishnan'));

    if (!karthik) throw new Error('Karthikeyan Sarv was not found in All Branches list');
    if (!sivarm) throw new Error('sivarm krishnan was not found in All Branches list');

    console.log(`    -> Found Karthikeyan Sarv (EMP-${karthik.emp_id}) assigned to Branch ${karthik.b_id}`);
    console.log(`    -> Found sivarm krishnan (EMP-${sivarm.emp_id}) assigned to Branch ${sivarm.b_id}`);
  });

  // 2. Specific branch 101 returns Karthikeyan and excludes sivarm
  await test('2. Branch 101 filter includes Karthikeyan Sarv and excludes sivarm krishnan', async () => {
    const res = await fetchJson('/employees?b_id=101&limit=50');
    if (!res.ok || !res.body.success) throw new Error(`HTTP ${res.status}`);
    const emps = res.body.data;

    if (!emps.every((e) => String(e.b_id) === '101')) {
      throw new Error('Non-branch 101 employee returned in branch 101 filter');
    }

    const karthik = emps.find((e) => e.first_name.includes('Karthikeyan'));
    const sivarm = emps.find((e) => e.first_name.includes('sivarm'));

    if (!karthik) throw new Error('Karthikeyan Sarv missing from Branch 101 filter');
    if (sivarm) throw new Error('sivarm krishnan incorrectly included in Branch 101 filter');
  });

  // 3. Specific branch 102 returns sivarm and excludes Karthikeyan
  await test('3. Branch 102 filter includes sivarm krishnan and excludes Karthikeyan Sarv', async () => {
    const res = await fetchJson('/employees?b_id=102&limit=50');
    if (!res.ok || !res.body.success) throw new Error(`HTTP ${res.status}`);
    const emps = res.body.data;

    if (!emps.every((e) => String(e.b_id) === '102')) {
      throw new Error('Non-branch 102 employee returned in branch 102 filter');
    }

    const karthik = emps.find((e) => e.first_name.includes('Karthikeyan'));
    const sivarm = emps.find((e) => e.first_name.includes('sivarm'));

    if (!sivarm) throw new Error('sivarm krishnan missing from Branch 102 filter');
    if (karthik) throw new Error('Karthikeyan Sarv incorrectly included in Branch 102 filter');
  });

  // 4. Other branches (103, 104, 105, 106) do NOT include either new staff member
  await test('4. Branches 103, 104, 105, 106 do NOT show either new staff member', async () => {
    for (const bId of [103, 104, 105, 106]) {
      const res = await fetchJson(`/employees?b_id=${bId}&limit=50`);
      if (!res.ok || !res.body.success) throw new Error(`HTTP ${res.status} for branch ${bId}`);
      const emps = res.body.data;

      const hasKarthik = emps.some((e) => e.first_name.includes('Karthikeyan'));
      const hasSivarm = emps.some((e) => e.first_name.includes('sivarm'));

      if (hasKarthik || hasSivarm) {
        throw new Error(`Branch ${bId} leaked newly created staff`);
      }
    }
  });

  // 5. Handling 'all' sentinel and empty string branch filters
  await test('5. b_id=all and b_id="" sentinels return all staff without error', async () => {
    const resAll = await fetchJson('/employees?b_id=all&limit=50');
    const resEmpty = await fetchJson('/employees?b_id=&limit=50');
    const resBase = await fetchJson('/employees?limit=50');

    if (!resAll.ok || !resEmpty.ok) throw new Error('Failed to handle all or empty filter');
    if (resAll.body.pagination.totalRecords !== resBase.body.pagination.totalRecords) {
      throw new Error('b_id=all count does not match unfiltered count');
    }
    if (resEmpty.body.pagination.totalRecords !== resBase.body.pagination.totalRecords) {
      throw new Error('b_id="" count does not match unfiltered count');
    }
  });

  // 6. Search and branch filter work together
  await test('6. Name search and branch filter work together accurately', async () => {
    // Search Karthikeyan with matching branch 101
    const res1 = await fetchJson('/employees?search=Karthikeyan&b_id=101');
    if (res1.body.data.length !== 1) throw new Error('Expected 1 match for Karthikeyan in Branch 101');

    // Search Karthikeyan with conflicting branch 102
    const res2 = await fetchJson('/employees?search=Karthikeyan&b_id=102');
    if (res2.body.data.length !== 0) throw new Error('Expected 0 matches for Karthikeyan in Branch 102');

    // Search sivarm with matching branch 102
    const res3 = await fetchJson('/employees?search=sivarm&b_id=102');
    if (res3.body.data.length !== 1) throw new Error('Expected 1 match for sivarm in Branch 102');
  });

  // 7. Pagination test (10 records on page 1, remaining on page 2)
  await test('7. Page 1 (limit=10) and Page 2 (limit=10) access all records without loss', async () => {
    const page1Res = await fetchJson('/employees?page=1&limit=10');
    const page2Res = await fetchJson('/employees?page=2&limit=10');

    if (page1Res.body.data.length !== 10) {
      throw new Error(`Expected 10 rows on page 1, got ${page1Res.body.data.length}`);
    }
    if (page2Res.body.data.length < 2) {
      throw new Error(`Expected at least 2 rows on page 2, got ${page2Res.body.data.length}`);
    }

    // Snowflake IDs sort to page 2 under default ASC sorting
    const page2Ids = page2Res.body.data.map((e) => String(e.emp_id));
    console.log(`    -> Page 2 contains staff IDs: ${page2Ids.join(', ')}`);

    // Verify limit=25 returns all staff on Page 1 (for 10-visible-rows scrollable table)
    const page25Res = await fetchJson('/employees?page=1&limit=25');
    if (page25Res.body.data.length < 12) {
      throw new Error(`Expected >=12 records with limit=25, got ${page25Res.body.data.length}`);
    }
  });

  // 8. Result lengths (0, 1, 10, 11, >10)
  await test('8. Query results correctly handle 0, 1, 10, and >10 records', async () => {
    // 0 records
    const res0 = await fetchJson('/employees?search=nonexistent_staff_xyz');
    if (res0.body.data.length !== 0 || Number(res0.body.pagination.totalRecords) !== 0) {
      throw new Error(`0 records query failed: got length=${res0.body.data.length}, total=${res0.body.pagination.totalRecords}`);
    }

    // 1 record
    const res1 = await fetchJson('/employees?search=Karthikeyan');
    if (res1.body.data.length !== 1 || Number(res1.body.pagination.totalRecords) !== 1) {
      throw new Error(`1 record query failed: got length=${res1.body.data.length}, total=${res1.body.pagination.totalRecords}`);
    }

    // 10 records
    const res10 = await fetchJson('/employees?limit=10');
    if (res10.body.data.length !== 10) {
      throw new Error('10 records limit failed');
    }

    // >10 records
    const resAll = await fetchJson('/employees?limit=25');
    if (resAll.body.data.length < 12) {
      throw new Error('>10 records query failed');
    }
  });

  // 9. Other entity lists audit (Customers, Accounts, Transactions, Loans, Cards, Duties)
  await test('9. Other entity list endpoints correctly support All-filters and counts', async () => {
    const checks = [
      { path: '/customers?limit=50', minExpected: 14, name: 'Customers' },
      { path: '/customers?city=all&limit=50', minExpected: 14, name: 'Customers city=all' },
      { path: '/accounts?limit=50', minExpected: 12, name: 'Accounts' },
      { path: '/accounts?b_id=all&limit=50', minExpected: 12, name: 'Accounts b_id=all' },
      { path: '/transactions?limit=50', minExpected: 44, name: 'Transactions' },
      { path: '/transactions?type=all&limit=50', minExpected: 44, name: 'Transactions type=all' },
      { path: '/loans?limit=50', minExpected: 8, name: 'Loans' },
      { path: '/loans?l_type=all&limit=50', minExpected: 8, name: 'Loans l_type=all' },
      { path: '/creditcards?limit=50', minExpected: 7, name: 'Credit Cards' },
      { path: '/branches?limit=50', minExpected: 6, name: 'Branches' },
      { path: '/responsible-for?limit=50', minExpected: 8, name: 'Responsible_For duties' },
    ];

    for (const c of checks) {
      const res = await fetchJson(c.path);
      if (!res.ok || !res.body.success) throw new Error(`${c.name} endpoint failed HTTP ${res.status}`);
      const count = res.body.data.length;
      if (count < c.minExpected) {
        throw new Error(`${c.name} returned ${count} records, expected at least ${c.minExpected}`);
      }
    }
  });

  console.log('\n================================================================');
  console.log(`REGRESSION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runRegressionSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
