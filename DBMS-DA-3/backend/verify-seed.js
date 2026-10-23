/**
 * Finora DA3 - Seed Data Verification Suite
 * Validates integrity, referential consistency, transfer linkage, loan arithmetic,
 * and view correctness on CockroachDB Cloud (finora_da3).
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

async function verifySeed() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/finora_da3';
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT, 'utf8'), rejectUnauthorized: true }
  });

  const client = await pool.connect();

  try {
    console.log('================================================================');
    console.log('FINORA DA3: SAMPLE DATA & INTEGRITY VERIFICATION SUITE');
    console.log('Database: CockroachDB Cloud (finora_da3)');
    console.log('================================================================\n');

    let allTestsPassed = true;

    // ------------------------------------------------------------------------
    // 1. Row counts for all 14 tables
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: ROW COUNTS FOR ALL 14 CORE TABLES ---');
    const tableList = [
      'branch', 'employee', 'customer', 'customer_phone', 'account',
      'account_holder', 'nominee', 'creditcard', 'loan', 'loan_payment',
      'beneficiary', 'transaction', 'audit_log', 'responsible_for'
    ];

    const rowCounts = [];
    for (const tbl of tableList) {
      const res = await client.query(`SELECT count(*)::int AS count FROM "${tbl}"`);
      rowCounts.push({ table: tbl, count: res.rows[0].count });
    }
    console.table(rowCounts);

    // Verify minimum thresholds
    const countChecks = [
      { name: 'Branches (>= 5)', actual: rowCounts.find(r => r.table === 'branch').count, min: 5 },
      { name: 'Employees (>= 8)', actual: rowCounts.find(r => r.table === 'employee').count, min: 8 },
      { name: 'Customers (>= 12)', actual: rowCounts.find(r => r.table === 'customer').count, min: 12 },
      { name: 'Accounts (>= 10)', actual: rowCounts.find(r => r.table === 'account').count, min: 10 },
      { name: 'Loans (>= 8)', actual: rowCounts.find(r => r.table === 'loan').count, min: 8 },
      { name: 'Loan Payments (>= 10)', actual: rowCounts.find(r => r.table === 'loan_payment').count, min: 10 },
      { name: 'Beneficiaries (>= 5)', actual: rowCounts.find(r => r.table === 'beneficiary').count, min: 5 },
      { name: 'Transactions (>= 15)', actual: rowCounts.find(r => r.table === 'transaction').count, min: 15 },
      { name: 'Audit Logs (>= 5)', actual: rowCounts.find(r => r.table === 'audit_log').count, min: 5 }
    ];

    for (const chk of countChecks) {
      if (chk.actual >= chk.min) {
        console.log(`✓ PASS: ${chk.name} -> Actual: ${chk.actual}`);
      } else {
        console.error(`✗ FAIL: ${chk.name} -> Actual: ${chk.actual}, expected >= ${chk.min}`);
        allTestsPassed = false;
      }
    }

    // ------------------------------------------------------------------------
    // 2. Foreign-Key Consistency & Orphan Record Detection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: ORPHAN RECORD DETECTION ACROSS FOREIGN KEYS ---');
    const orphanQueries = [
      { child: 'employee', col: 'b_id', parent: 'branch', parentCol: 'b_id' },
      { child: 'customer', col: 'emp_id', parent: 'employee', parentCol: 'emp_id', allowNullable: true },
      { child: 'customer_phone', col: 'cid', parent: 'customer', parentCol: 'cid' },
      { child: 'account', col: 'b_id', parent: 'branch', parentCol: 'b_id' },
      { child: 'account_holder', col: 'acc_id', parent: 'account', parentCol: 'acc_id' },
      { child: 'account_holder', col: 'cid', parent: 'customer', parentCol: 'cid' },
      { child: 'nominee', col: 'acc_id', parent: 'account', parentCol: 'acc_id' },
      { child: 'nominee', col: 'cid', parent: 'customer', parentCol: 'cid', allowNullable: true },
      { child: 'creditcard', col: 'cid', parent: 'customer', parentCol: 'cid' },
      { child: 'loan', col: 'cid', parent: 'customer', parentCol: 'cid' },
      { child: 'loan_payment', col: 'l_id', parent: 'loan', parentCol: 'l_id' },
      { child: 'beneficiary', col: 'cid', parent: 'customer', parentCol: 'cid' },
      { child: 'beneficiary', col: 'internal_acc_id', parent: 'account', parentCol: 'acc_id', allowNullable: true },
      { child: 'transaction', col: 'acc_id', parent: 'account', parentCol: 'acc_id' },
      { child: 'audit_log', col: 'emp_id', parent: 'employee', parentCol: 'emp_id', allowNullable: true },
      { child: 'responsible_for', col: 'emp_id', parent: 'employee', parentCol: 'emp_id' },
      { child: 'responsible_for', col: 'b_id', parent: 'branch', parentCol: 'b_id' }
    ];

    let orphanIssues = 0;
    for (const o of orphanQueries) {
      const nullFilter = o.allowNullable ? `AND c."${o.col}" IS NOT NULL` : '';
      const sql = `
        SELECT count(*)::int AS orphan_count
        FROM "${o.child}" c
        LEFT JOIN "${o.parent}" p ON c."${o.col}" = p."${o.parentCol}"
        WHERE p."${o.parentCol}" IS NULL ${nullFilter};
      `;
      const res = await client.query(sql);
      const count = parseInt(res.rows[0].orphan_count, 10);
      if (count === 0) {
        console.log(`✓ Clean FK: ${o.child}.${o.col} -> ${o.parent}.${o.parentCol} (0 orphans)`);
      } else {
        console.error(`✗ ORPHAN FOUND: ${count} rows in ${o.child}.${o.col} missing parent ${o.parent}!`);
        orphanIssues++;
        allTestsPassed = false;
      }
    }

    // ------------------------------------------------------------------------
    // 3. Joint Account Ownership Verification
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: JOINT ACCOUNT OWNERSHIP & SHARE CONSTRAINTS ---');
    const jointRes = await client.query(`
      SELECT
        ah.acc_id,
        a.acc_type,
        count(ah.cid)::int AS holder_count,
        sum(ah.share_percentage)::numeric AS total_share,
        string_agg(c.first_name || ' ' || c.last_name || ' (' || ah.ownership_role || ': ' || ah.share_percentage || '%)', ', ') AS holders
      FROM account_holder ah
      JOIN account a ON ah.acc_id = a.acc_id
      JOIN customer c ON ah.cid = c.cid
      GROUP BY ah.acc_id, a.acc_type
      HAVING count(ah.cid) > 1
      ORDER BY ah.acc_id;
    `);

    console.table(jointRes.rows);
    if (jointRes.rows.length >= 2) {
      console.log(`✓ PASS: Found ${jointRes.rows.length} joint accounts (minimum 2 required)`);
      for (const ja of jointRes.rows) {
        if (parseFloat(ja.total_share) === 100.00) {
          console.log(`✓ PASS: Joint Account ${ja.acc_id} share total equals exactly 100.00%`);
        } else {
          console.error(`✗ FAIL: Joint Account ${ja.acc_id} share total is ${ja.total_share}% (expected 100%)`);
          allTestsPassed = false;
        }
      }
    } else {
      console.error(`✗ FAIL: Expected >= 2 joint accounts, found ${jointRes.rows.length}`);
      allTestsPassed = false;
    }

    // ------------------------------------------------------------------------
    // 4. Loan-Payment Totals & Component Arithmetic
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: LOAN PAYMENT COMPONENT ARITHMETIC (Principal + Interest = Amount) ---');
    const paymentAudit = await client.query(`
      SELECT
        payment_id,
        l_id,
        amount,
        principal_amount,
        interest_amount,
        (principal_amount + interest_amount) AS sum_components,
        (amount - (principal_amount + interest_amount)) AS delta
      FROM loan_payment
      WHERE amount != (principal_amount + interest_amount);
    `);

    if (paymentAudit.rows.length === 0) {
      console.log('✓ PASS: All loan payment records strictly satisfy `amount = principal_amount + interest_amount` (0 violations)');
    } else {
      console.error(`✗ FAIL: Found ${paymentAudit.rows.length} loan payment arithmetic discrepancies!`);
      console.table(paymentAudit.rows);
      allTestsPassed = false;
    }

    // Summary of repayments per loan
    const loanSummary = await client.query(`
      SELECT
        l.l_id,
        l.l_type,
        l.amount AS sanctioned_amount,
        count(lp.payment_id)::int AS payments_count,
        coalesce(sum(lp.amount), 0)::numeric AS total_repaid,
        coalesce(sum(lp.principal_amount), 0)::numeric AS principal_repaid,
        coalesce(sum(lp.interest_amount), 0)::numeric AS interest_repaid
      FROM loan l
      LEFT JOIN loan_payment lp ON l.l_id = lp.l_id
      GROUP BY l.l_id, l.l_type, l.amount
      ORDER BY l.l_id;
    `);
    console.table(loanSummary.rows);

    // ------------------------------------------------------------------------
    // 5. Linked Transfer Debit and Credit Entries
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: LINKED TRANSFER BILATERAL SYMMETRY ---');
    const transferAudit = await client.query(`
      SELECT
        t1.t_id AS leg1_tid,
        t1.acc_id AS from_acc,
        t1.amount AS leg1_amount,
        t1.related_acc_id AS leg1_target_acc,
        t1.related_trans_id AS leg1_target_tid,
        t2.t_id AS leg2_tid,
        t2.acc_id AS to_acc,
        t2.amount AS leg2_amount,
        t2.related_acc_id AS leg2_target_acc,
        t2.related_trans_id AS leg2_target_tid,
        CASE
          WHEN t2.t_id IS NULL THEN 'MISSING_COMPLEMENTARY_LEG'
          WHEN t1.amount != t2.amount THEN 'AMOUNT_MISMATCH'
          WHEN t1.acc_id != t2.related_acc_id OR t2.acc_id != t1.related_acc_id THEN 'ACCOUNT_MISMATCH'
          ELSE 'VALID_BILATERAL_LINK'
        END AS transfer_status
      FROM "transaction" t1
      LEFT JOIN "transaction" t2 ON t1.related_trans_id = t2.t_id
      WHERE t1.type = 'TRANSFER' AND t1.t_id < t1.related_trans_id
      ORDER BY t1.t_id;
    `);

    console.table(transferAudit.rows);
    let invalidTransfers = 0;
    for (const t of transferAudit.rows) {
      if (t.transfer_status === 'VALID_BILATERAL_LINK') {
        console.log(`✓ PASS: Transfer pair (${t.leg1_tid} <-> ${t.leg2_tid}) for ₹${t.leg1_amount} is symmetrically linked between Acc ${t.from_acc} and Acc ${t.to_acc}`);
      } else {
        console.error(`✗ FAIL: Transfer pair anomaly: ${t.transfer_status}`);
        invalidTransfers++;
        allTestsPassed = false;
      }
    }

    // ------------------------------------------------------------------------
    // 6. Dashboard Views Execution & Validation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: ANALYTICAL VIEWS EXECUTION & RESULTS ---');
    const vSummary = await client.query('SELECT * FROM dashboard_summary');
    console.log('✓ View `dashboard_summary`:');
    console.table(vSummary.rows);

    const vCustCount = await client.query('SELECT count(*)::int AS count FROM customer_dashboard');
    console.log(`✓ View ` + '`customer_dashboard`: ' + vCustCount.rows[0].count + ' rows generated');

    const vTransCount = await client.query('SELECT count(*)::int AS count FROM transaction_dashboard');
    console.log(`✓ View ` + '`transaction_dashboard`: ' + vTransCount.rows[0].count + ' rows generated');

    const vLoanCount = await client.query('SELECT count(*)::int AS count FROM loan_dashboard');
    console.log(`✓ View ` + '`loan_dashboard`: ' + vLoanCount.rows[0].count + ' rows generated');

    const vCardCount = await client.query('SELECT count(*)::int AS count FROM creditcard_dashboard');
    console.log(`✓ View ` + '`creditcard_dashboard`: ' + vCardCount.rows[0].count + ' rows generated');

    // ------------------------------------------------------------------------
    // 7. Multi-table Join Query Test
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: MULTI-TABLE ENTERPRISE JOIN QUERY ---');
    const complexJoin = await client.query(`
      SELECT
        c.cid,
        c.first_name || ' ' || c.last_name AS customer_name,
        b.branch_name,
        b.city AS branch_city,
        e.first_name || ' ' || e.last_name AS account_manager,
        a.acc_id,
        a.acc_type,
        a.balance,
        ah.ownership_role,
        count(DISTINCT l.l_id)::int AS active_loans,
        count(DISTINCT t.t_id)::int AS account_transactions
      FROM customer c
      JOIN employee e ON c.emp_id = e.emp_id
      JOIN branch b ON e.b_id = b.b_id
      JOIN account_holder ah ON c.cid = ah.cid
      JOIN account a ON ah.acc_id = a.acc_id
      LEFT JOIN loan l ON c.cid = l.cid
      LEFT JOIN "transaction" t ON a.acc_id = t.acc_id
      GROUP BY c.cid, c.first_name, c.last_name, b.branch_name, b.city, e.first_name, e.last_name, a.acc_id, a.acc_type, a.balance, ah.ownership_role
      ORDER BY c.cid, a.acc_id
      LIMIT 8;
    `);

    console.table(complexJoin.rows);
    console.log(`✓ PASS: Complex 6-table join query executed cleanly in CockroachDB!`);

    // ------------------------------------------------------------------------
    // Final Summary
    // ------------------------------------------------------------------------
    console.log('\n================================================================');
    if (allTestsPassed) {
      console.log('🎉 ALL INTEGRITY, RECOVERY, AND VERIFICATION TESTS PASSED!');
    } else {
      console.error('❌ SOME INTEGRITY CHECKS FAILED. REVIEW THE LOG ABOVE.');
      process.exitCode = 1;
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Verification suite encountered an error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

verifySeed();
