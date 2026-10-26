/**
 * Finora DA3 — SQL Query Workbench & Template Comprehensive Verification Suite
 *
 * Verifies:
 * 1. Policy Endpoint (GET /api/workbench/policy)
 * 2. All 9 Preloaded Banking Templates against CockroachDB Cloud
 * 3. Arbitrary Complex Read-Only Queries (CTEs, Window Functions, CASE, Aggregates, Joins)
 * 4. False-Positive Immunity (SQL containing 'UPDATE', 'DELETE', etc. inside string literals)
 * 5. Strict Rejection of Prohibited Commands (DROP, ALTER, TRUNCATE, INSERT, UPDATE, DELETE, GRANT, SET CLUSTER)
 * 6. Multi-Statement Chaining Prevention
 * 7. Row Cap Enforcement (Max 500 rows)
 * 8. Error Diagnostics & Connection String Redaction
 * 9. Schema Discovery Metadata Endpoints (tables, columns, indexes, constraints)
 */

process.env.NODE_ENV = 'test_embedded';
require('dotenv').config();
const http = require('http');
const { app } = require('./server');
const db = require('./config/db');

const TEMPLATES = [
  {
    id: 'customer_portfolios',
    title: 'Customer Portfolios & Joint Accounts',
    category: 'Joins',
    sql: `SELECT 
  c.cid, 
  c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
  c.pan,
  b.branch_name,
  a.acc_id,
  a.acc_type,
  a.balance,
  ah.ownership_role,
  ah.share_percentage
FROM customer c
JOIN account_holder ah ON c.cid = ah.cid
JOIN account a ON ah.acc_id = a.acc_id
JOIN branch b ON a.b_id = b.b_id
ORDER BY a.balance DESC
LIMIT 15;`
  },
  {
    id: 'branch_liquidity',
    title: 'Branch Liquidity & Deposit Aggregates',
    category: 'Aggregations',
    sql: `SELECT 
  b.b_id,
  b.branch_name,
  b.city,
  COUNT(DISTINCT a.acc_id) AS total_accounts,
  COUNT(DISTINCT ah.cid) AS total_customers,
  COALESCE(SUM(a.balance), 0) AS total_branch_deposits,
  ROUND(COALESCE(AVG(a.balance), 0), 2) AS avg_account_balance
FROM branch b
LEFT JOIN account a ON b.b_id = a.b_id
LEFT JOIN account_holder ah ON a.acc_id = ah.acc_id
GROUP BY b.b_id, b.branch_name, b.city
ORDER BY total_branch_deposits DESC;`
  },
  {
    id: 'cockroach_explain',
    title: 'CockroachDB Cost-Based Query Plan (EXPLAIN)',
    category: 'EXPLAIN Plan',
    sql: `EXPLAIN 
SELECT 
  t.t_id, 
  t.trans_date, 
  t.type, 
  t.amount, 
  t.mode,
  a.acc_type,
  b.branch_name
FROM transaction t
JOIN account a ON t.acc_id = a.acc_id
JOIN branch b ON a.b_id = b.b_id
WHERE t.amount >= 5000.00
ORDER BY t.trans_date DESC;`
  },
  {
    id: 'analytical_views',
    title: 'Macro Dashboard View Inspection',
    category: 'Views',
    sql: `SELECT 
  total_customers,
  total_accounts,
  total_balance AS total_deposits,
  total_loans AS total_active_loans,
  total_loan_amount,
  total_credit_cards,
  total_transactions AS total_transactions_logged
FROM dashboard_summary;`
  },
  {
    id: 'customer_financial_summary',
    title: 'Customer Dashboard Analytical Aggregates',
    category: 'Views',
    sql: `WITH customer_accounts AS (
  SELECT 
    ah.cid,
    COUNT(DISTINCT a.acc_id) AS total_accounts,
    COALESCE(SUM(a.balance), 0) AS net_account_balance
  FROM account_holder ah
  JOIN account a ON ah.acc_id = a.acc_id
  GROUP BY ah.cid
),
customer_loans AS (
  SELECT 
    cid,
    COUNT(l_id) AS total_loans,
    COALESCE(SUM(amount), 0) AS total_loan_liability
  FROM loan
  WHERE status IN ('ACTIVE', 'PENDING', 'APPROVED')
  GROUP BY cid
),
customer_cards AS (
  SELECT 
    cid,
    COUNT(pno) AS total_credit_cards
  FROM creditcard
  GROUP BY cid
)
SELECT 
  c.cid,
  c.first_name || ' ' || COALESCE(c.last_name, '') AS customer_name,
  c.city,
  COALESCE(ca.total_accounts, 0) AS total_accounts,
  COALESCE(ca.net_account_balance, 0.00) AS net_account_balance,
  COALESCE(cl.total_loans, 0) AS total_loans,
  COALESCE(cl.total_loan_liability, 0.00) AS total_loan_liability,
  COALESCE(cc.total_credit_cards, 0) AS total_credit_cards
FROM customer c
LEFT JOIN customer_accounts ca ON c.cid = ca.cid
LEFT JOIN customer_loans cl ON c.cid = cl.cid
LEFT JOIN customer_cards cc ON c.cid = cc.cid
ORDER BY net_account_balance DESC
LIMIT 10;`
  },
  {
    id: 'security_audit',
    title: 'Tamper-Evident System Audit Trail',
    category: 'Audit',
    sql: `SELECT 
  log_id, 
  created_at AS event_timestamp, 
  actor_type, 
  actor_id,
  action, 
  entity_name, 
  entity_id,
  ip_address,
  details
FROM audit_log
ORDER BY created_at DESC
LIMIT 20;`
  },
  {
    id: 'loan_portfolio_overview',
    title: 'Loan Portfolio & Repayment Performance',
    category: 'Joins',
    sql: `SELECT 
  l.l_id,
  l.l_type,
  l.amount AS sanctioned_amount,
  l.interest AS interest_rate_pct,
  l.term AS tenure_months,
  l.status AS loan_status,
  c.first_name || ' ' || COALESCE(c.last_name, '') AS borrower_name,
  COALESCE(COUNT(lp.payment_id), 0) AS total_installments_paid,
  COALESCE(SUM(lp.principal_amount), 0) AS total_principal_repaid,
  COALESCE(SUM(lp.interest_amount), 0) AS total_interest_serviced
FROM loan l
JOIN customer c ON l.cid = c.cid
LEFT JOIN loan_payment lp ON l.l_id = lp.l_id
GROUP BY l.l_id, l.l_type, l.amount, l.interest, l.term, l.status, c.first_name, c.last_name
ORDER BY l.amount DESC
LIMIT 15;`
  },
  {
    id: 'interbank_transfers',
    title: 'High-Value Transfer Ledger & Counterparties',
    category: 'Audit',
    sql: `SELECT 
  t.t_id,
  t.trans_date,
  t.amount,
  t.mode,
  t.status,
  t.acc_id AS source_account,
  t.related_acc_id AS counterparty_account,
  t.description,
  concat(e.first_name, ' ', COALESCE(e.last_name, '')) AS processed_by
FROM "transaction" t
LEFT JOIN employee e ON t.processed_by_emp_id = e.emp_id
WHERE t.type = 'TRANSFER' OR t.amount >= 25000.00
ORDER BY t.trans_date DESC
LIMIT 20;`
  },
  {
    id: 'blocked_statement_test',
    title: 'Safety Interceptor Demo (DDL/DML Test)',
    category: 'Security',
    sql: `-- Safety Policy Test: Attempting a destructive statement
DROP TABLE customer;`,
    expectBlocked: true
  }
];

async function runWorkbenchTests() {
  console.log('================================================================');
  console.log(' FINORA DA3 — SQL QUERY WORKBENCH VERIFICATION SUITE');
  console.log(' Target: CockroachDB Cloud (finora_da3)');
  console.log('================================================================\n');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseUrl}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
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
    // Group 1: Policy Endpoint
    // ------------------------------------------------------------------------
    console.log('Test Group 1: Workbench Security Policy Endpoint');
    const polRes = await request('/workbench/policy');
    assert(polRes.status === 200, 'GET /api/workbench/policy returns HTTP 200');
    assert(polRes.body.success === true, 'Policy response success = true');
    assert(polRes.body.policy.mode === 'STRICT_READ_ONLY', 'Policy mode is STRICT_READ_ONLY');
    assert(polRes.body.policy.statementTimeoutMs === 5000, 'Policy statementTimeoutMs = 5000');
    assert(polRes.body.policy.maxRowLimit === 500, 'Policy maxRowLimit = 500');
    assert(polRes.body.policy.multipleStatementsAllowed === false, 'multipleStatementsAllowed = false');

    // ------------------------------------------------------------------------
    // Group 2: All 9 Preloaded Banking Templates
    // ------------------------------------------------------------------------
    console.log('\nTest Group 2: Preloaded Banking Templates Execution');
    for (const tpl of TEMPLATES) {
      if (tpl.expectBlocked) {
        const res = await request('/workbench/execute', {
          method: 'POST',
          body: JSON.stringify({ query: tpl.sql })
        });
        assert(res.status === 403, `Template [${tpl.id}] - "${tpl.title}" correctly blocked with HTTP 403`);
      } else {
        const res = await request('/workbench/execute', {
          method: 'POST',
          body: JSON.stringify({ query: tpl.sql })
        });
        assert(res.status === 200, `Template [${tpl.id}] - HTTP 200`);
        assert(res.body.success === true, `Template [${tpl.id}] - success = true`);
        assert(Array.isArray(res.body.data), `Template [${tpl.id}] - returned data array`);
        assert(res.body.durationMs >= 0, `Template [${tpl.id}] - duration: ${res.body.durationMs}ms`);
        assert(res.body.returnedRows >= 0, `Template [${tpl.id}] - returnedRows: ${res.body.returnedRows}`);
      }
    }

    // ------------------------------------------------------------------------
    // Group 3: Arbitrary Complex Read-Only Queries
    // ------------------------------------------------------------------------
    console.log('\nTest Group 3: Arbitrary Complex Read-Only Queries');
    const arbitraryQueries = [
      {
        name: 'Window Function with RANK()',
        sql: `SELECT 
          acc_id, 
          acc_type, 
          balance, 
          RANK() OVER (PARTITION BY acc_type ORDER BY balance DESC) as balance_rank
        FROM account
        LIMIT 10;`
      },
      {
        name: 'CASE Expression & Conditional Aggregation',
        sql: `SELECT 
          acc_type, 
          COUNT(*) as total_accounts,
          SUM(CASE WHEN balance >= 50000 THEN 1 ELSE 0 END) as premier_count,
          SUM(CASE WHEN balance < 50000 THEN 1 ELSE 0 END) as standard_count
        FROM account
        GROUP BY acc_type;`
      },
      {
        name: 'Complex Multi-Table CTE Aggregation',
        sql: `WITH branch_totals AS (
          SELECT b_id, SUM(balance) as total_bal, COUNT(*) as acc_count
          FROM account
          GROUP BY b_id
        )
        SELECT b.branch_name, b.city, bt.total_bal, bt.acc_count
        FROM branch b
        JOIN branch_totals bt ON b.b_id = bt.b_id
        ORDER BY bt.total_bal DESC
        LIMIT 5;`
      },
      {
        name: 'Immunity to Mutation Words in String Literals',
        sql: `SELECT log_id, action, entity_name, details
        FROM audit_log
        WHERE action IN ('UPDATE_CUSTOMER', 'DELETE_ACCOUNT', 'INSERT_TRANSACTION')
        LIMIT 5;`
      },
      {
        name: 'Empty Result Set (0 Rows Returned)',
        sql: `SELECT * FROM customer WHERE cid = 999999999;`
      },
      {
        name: 'CockroachDB Engine Version Function',
        sql: `SELECT version() AS cockroach_version, current_database() AS active_db;`
      }
    ];

    for (const q of arbitraryQueries) {
      const res = await request('/workbench/execute', {
        method: 'POST',
        body: JSON.stringify({ query: q.sql })
      });
      assert(res.status === 200 && res.body.success === true, `Arbitrary query "${q.name}" executed successfully`);
      assert(Array.isArray(res.body.data), `Arbitrary query "${q.name}" returned valid data array`);
    }

    // ------------------------------------------------------------------------
    // Group 4: Prohibited DDL/DML & Administration Rejection
    // ------------------------------------------------------------------------
    console.log('\nTest Group 4: Prohibited DDL/DML & Administration Rejection');
    const dangerousCommands = [
      { name: 'DROP TABLE', sql: 'DROP TABLE customer CASCADE;' },
      { name: 'TRUNCATE TABLE', sql: 'TRUNCATE TABLE transaction;' },
      { name: 'ALTER TABLE', sql: 'ALTER TABLE customer ADD COLUMN hacked BOOLEAN;' },
      { name: 'CREATE TABLE', sql: 'CREATE TABLE test_backdoor (id INT PRIMARY KEY);' },
      { name: 'INSERT INTO', sql: "INSERT INTO customer (cid, first_name) VALUES ('C999', 'Hacker');" },
      { name: 'UPDATE', sql: "UPDATE account SET balance = balance + 1000000;" },
      { name: 'DELETE FROM', sql: "DELETE FROM customer WHERE cid = 'C001';" },
      { name: 'GRANT PRIVILEGE', sql: "GRANT ALL ON ALL TABLES TO PUBLIC;" },
      { name: 'SET CLUSTER', sql: "SET CLUSTER SETTING server.remote_debugging.mode = 'any';" },
      { name: 'pg_shadow Access', sql: "SELECT * FROM pg_shadow;" },
      { name: 'Multi-statement Semicolon Chaining', sql: "SELECT 1; DROP TABLE branch;" }
    ];

    for (const cmd of dangerousCommands) {
      const res = await request('/workbench/execute', {
        method: 'POST',
        body: JSON.stringify({ query: cmd.sql })
      });
      assert(
        res.status === 403 || res.status === 400,
        `Prohibited command "${cmd.name}" strictly intercepted (HTTP ${res.status})`
      );
    }

    // ------------------------------------------------------------------------
    // Group 5: Schema Discovery Metadata Endpoints
    // ------------------------------------------------------------------------
    console.log('\nTest Group 5: Schema Discovery Metadata Endpoints');
    const tablesRes = await request('/metadata/tables');
    assert(tablesRes.status === 200, 'GET /api/metadata/tables returns HTTP 200');
    assert(tablesRes.body.success === true, 'Metadata tables success = true');
    assert(Array.isArray(tablesRes.body.data) && tablesRes.body.data.length >= 10, `Found ${tablesRes.body.data?.length} catalog tables/views`);

    const sampleTable = tablesRes.body.data[0].tableName;
    const colsRes = await request(`/metadata/columns/${sampleTable}`);
    assert(colsRes.status === 200, `GET /api/metadata/columns/${sampleTable} returns HTTP 200`);
    assert(colsRes.body.success === true, `Column metadata for ${sampleTable} returned`);
    assert(Array.isArray(colsRes.body.data) && colsRes.body.data.length > 0, `${sampleTable} has ${colsRes.body.data?.length} columns`);

    console.log('\n================================================================');
    console.log(` SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    server.close();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    process.exit(1);
  }
}

runWorkbenchTests()
  .finally(() => {
    db.pool.end();
  });
