const { getConnection } = require('../backend/db');

async function testAllPreviews() {
  const conn = await getConnection();
  const cache = new Map();

  async function tableHasColumn(tableName, columnName) {
    const key = `${tableName.toUpperCase()}.${columnName.toUpperCase()}`;
    if (cache.has(key)) return cache.get(key);
    const res = await conn.execute(
      `SELECT COUNT(*) FROM user_tab_cols WHERE table_name = :t AND column_name = :c`,
      { t: tableName.toUpperCase(), c: columnName.toUpperCase() }
    );
    const has = (res.rows && res.rows[0] && res.rows[0][0] > 0);
    cache.set(key, has);
    return has;
  }

  // 1. Customer Preview
  console.log('Testing Customer #301 Preview...');
  const hasCustStatus = await tableHasColumn('CUSTOMER', 'STATUS');
  const hasLoanStatus = await tableHasColumn('LOAN', 'STATUS');
  const custSql = hasCustStatus
    ? 'SELECT cid, first_name, last_name, pan, status FROM Customer WHERE cid = :p_cid'
    : 'SELECT cid, first_name, last_name, pan FROM Customer WHERE cid = :p_cid';
  const custRes = await conn.execute(custSql, { p_cid: 301 });
  console.log('Customer row:', custRes.rows[0]);

  // 2. Loan Preview (test with 601)
  console.log('Testing Loan #601 Preview...');
  const loanSql = hasLoanStatus
    ? 'SELECT l_id, amount, interest, term, status, cid, l_type FROM Loan WHERE l_id = :p_lid'
    : 'SELECT l_id, amount, interest, term, cid, l_type FROM Loan WHERE l_id = :p_lid';
  const loanRes = await conn.execute(loanSql, { p_lid: 601 });
  console.log('Loan row:', loanRes.rows[0]);

  // Also simulate if hasLoanStatus is FALSE:
  const loanBaseSql = 'SELECT l_id, amount, interest, term, cid, l_type FROM Loan WHERE l_id = :p_lid';
  const loanBaseRes = await conn.execute(loanBaseSql, { p_lid: 601 });
  console.log('Loan base schema query row:', loanBaseRes.rows[0]);

  // 3. Branch Preview
  console.log('Testing Branch #101 Preview...');
  const hasBranchStatus = await tableHasColumn('BRANCH', 'STATUS');
  const branchSql = hasBranchStatus
    ? 'SELECT b_id, branch_name, city, ifsc, status FROM Branch WHERE b_id = :p_bid'
    : 'SELECT b_id, branch_name, city, ifsc FROM Branch WHERE b_id = :p_bid';
  const branchRes = await conn.execute(branchSql, { p_bid: 101 });
  console.log('Branch row:', branchRes.rows[0]);

  // 4. Employee Preview
  console.log('Testing Employee #201 Preview...');
  const hasEmpStatus = await tableHasColumn('EMPLOYEE', 'STATUS');
  const empSql = hasEmpStatus
    ? 'SELECT emp_id, first_name, last_name, salary, b_id, status FROM Employee WHERE emp_id = :p_empid'
    : 'SELECT emp_id, first_name, last_name, salary, b_id FROM Employee WHERE emp_id = :p_empid';
  const empRes = await conn.execute(empSql, { p_empid: 201 });
  console.log('Employee row:', empRes.rows[0]);

  // 5. Transaction #701
  console.log('Testing Transaction #701 Preview...');
  const txRes = await conn.execute(
    'SELECT t_id, acc_id, trans_date, "TYPE", amount, "MODE", status FROM "TRANSACTION" WHERE t_id = :p_tid',
    { p_tid: 701 }
  );
  console.log('Transaction row:', txRes.rows[0]);

  await conn.close();
  console.log('All queries succeeded cleanly!');
}

testAllPreviews().catch(console.error);
