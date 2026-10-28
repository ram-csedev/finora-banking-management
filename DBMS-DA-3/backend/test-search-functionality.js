/**
 * Comprehensive Automated Test Suite: Entity Search Functionality
 * Validates search behavior across:
 * - Customers
 * - Accounts
 * - Transactions
 * - Loans
 * - Credit Cards
 * - Branches
 * - Employees
 * - Responsible For (Duties)
 * - Nominees
 * - Beneficiaries
 */
const entityService = require('./services/entityService');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} - ${detail}`);
    failedTests++;
  }
}

async function runSearchTestSuite() {
  console.log('===============================================================');
  console.log('BEGIN COMPREHENSIVE SEARCH FUNCTIONALITY TEST SUITE');
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // 1. CUSTOMERS SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Customers Search ---');
  {
    // Search by numeric ID (e.g., 301)
    const resId = await entityService.listEntities('customer', { search: '301' });
    assert(resId.data.some(c => String(c.cid) === '301'), 'Customer search by numeric ID (301)');

    // Search by prefixed ID (e.g., CUST-301)
    const resPrefixed = await entityService.listEntities('customer', { search: 'CUST-301' });
    assert(resPrefixed.data.some(c => String(c.cid) === '301'), 'Customer search by prefixed ID (CUST-301)');

    // Search by first name (e.g., "Amit")
    const resFirstName = await entityService.listEntities('customer', { search: 'Amit' });
    assert(resFirstName.data.some(c => c.first_name.toLowerCase().includes('amit')), 'Customer search by first name (Amit)');

    // Search by full name (e.g., "Amit Verma")
    const resFullName = await entityService.listEntities('customer', { search: 'Amit Verma' });
    assert(resFullName.data.some(c => c.first_name === 'Amit' && c.last_name === 'Verma'), 'Customer search by concatenated full name (Amit Verma)');

    // Search by PAN (case-insensitive)
    if (resFullName.data.length > 0 && resFullName.data[0].pan) {
      const pan = resFullName.data[0].pan.toLowerCase();
      const resPan = await entityService.listEntities('customer', { search: pan });
      assert(resPan.data.some(c => c.pan.toLowerCase() === pan), `Customer search by PAN (${pan})`);
    }

    // Search by phone number (customer_phone joined search)
    const resPhone = await entityService.listEntities('customer', { search: '987' });
    assert(resPhone.data.length > 0, 'Customer search by phone number fragment (via customer_phone)');

    // Search combined with city filter
    const resCity = await entityService.listEntities('customer', { search: 'Amit', filters: { city: 'Mumbai' } });
    assert(resCity.data.every(c => c.city.toLowerCase() === 'mumbai'), 'Customer search combined with city filter');

    // Empty search returns full list
    const resEmpty = await entityService.listEntities('customer', { search: '' });
    assert(resEmpty.data.length > 0 && resEmpty.pagination.totalRecords > 0, 'Customer empty search returns full list');

    // Non-existent search returns zero results cleanly
    const resNone = await entityService.listEntities('customer', { search: 'NON_EXISTENT_STRING_99999' });
    assert(resNone.data.length === 0 && resNone.pagination.totalRecords === 0, 'Customer non-matching search returns clean empty state');
  }

  // --------------------------------------------------------------------------
  // 2. ACCOUNTS SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Accounts Search ---');
  {
    // Search by numeric account ID (e.g., 401)
    const resId = await entityService.listEntities('account', { search: '401' });
    assert(resId.data.some(a => String(a.acc_id) === '401'), 'Account search by numeric ID (401)');

    // Search by prefixed account ID (e.g., ACC-401)
    const resPrefixed = await entityService.listEntities('account', { search: 'ACC-401' });
    assert(resPrefixed.data.some(a => String(a.acc_id) === '401'), 'Account search by prefixed ID (ACC-401)');

    // Search by account type (e.g., "SAVINGS")
    const resType = await entityService.listEntities('account', { search: 'SAVINGS' });
    assert(resType.data.every(a => a.acc_type === 'SAVINGS'), 'Account search by account type (SAVINGS)');

    // Search by customer name (e.g. "Amit")
    const resCust = await entityService.listEntities('account', { search: 'Amit' });
    assert(resCust.data.length > 0, 'Account search by customer name (Amit via account_holder + customer)');

    // Search by branch name (e.g. "Main")
    const resBranch = await entityService.listEntities('account', { search: 'Main' });
    assert(resBranch.data.length > 0, 'Account search by branch name (Main via branch)');

    // Combined search and status filter
    const resStatus = await entityService.listEntities('account', { search: 'SAVINGS', filters: { status: 'ACTIVE' } });
    assert(resStatus.data.every(a => a.status === 'ACTIVE' && a.acc_type === 'SAVINGS'), 'Account search combined with status filter (ACTIVE)');

    // Non-existent search returns empty
    const resNone = await entityService.listEntities('account', { search: 'NON_EXISTENT_ACC_99999' });
    assert(resNone.data.length === 0, 'Account non-matching search returns 0 records');
  }

  // --------------------------------------------------------------------------
  // 3. TRANSACTIONS SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Transactions Search ---');
  {
    // Search by numeric TXN ID (e.g. 701)
    const resId = await entityService.listEntities('transaction', { search: '701' });
    assert(resId.data.some(t => String(t.t_id) === '701'), 'Transaction search by numeric TXN ID (701)');

    // Search by prefixed TXN ID (TXN-701)
    const resPrefixed = await entityService.listEntities('transaction', { search: 'TXN-701' });
    assert(resPrefixed.data.some(t => String(t.t_id) === '701'), 'Transaction search by prefixed ID (TXN-701)');

    // Search by transaction type (DEPOSIT)
    const resType = await entityService.listEntities('transaction', { search: 'DEPOSIT' });
    assert(resType.data.length > 0, 'Transaction search by type (DEPOSIT)');

    // Search by mode (ONLINE / ATM / CASH / UPI)
    const resMode = await entityService.listEntities('transaction', { search: 'ONLINE' });
    assert(resMode.data.length > 0, 'Transaction search by mode (ONLINE)');

    // Search by account number (401 or ACC-401)
    const resAcc = await entityService.listEntities('transaction', { search: '401' });
    assert(resAcc.data.length > 0, 'Transaction search by account number (401)');

    // Search combined with status filter
    const resFilter = await entityService.listEntities('transaction', { search: 'DEPOSIT', filters: { status: 'SUCCESS' } });
    assert(resFilter.data.every(t => t.status === 'SUCCESS'), 'Transaction search combined with status filter');

    // Non-existent search
    const resNone = await entityService.listEntities('transaction', { search: 'NON_EXISTENT_TXN_999' });
    assert(resNone.data.length === 0, 'Transaction non-matching search returns 0 records');
  }

  // --------------------------------------------------------------------------
  // 4. LOANS & CREDIT CARDS SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Loans & Credit Cards Search ---');
  {
    // Search loan by numeric ID (e.g. 601)
    const resLoanId = await entityService.listEntities('loan', { search: '601' });
    assert(resLoanId.data.some(l => String(l.l_id) === '601'), 'Loan search by numeric ID (601)');

    // Search loan by prefixed ID (LN-601)
    const resLoanPrefixed = await entityService.listEntities('loan', { search: 'LN-601' });
    assert(resLoanPrefixed.data.some(l => String(l.l_id) === '601'), 'Loan search by prefixed ID (LN-601)');

    // Search loan by loan type (HOME)
    const resLoanType = await entityService.listEntities('loan', { search: 'HOME' });
    assert(resLoanType.data.every(l => l.l_type === 'HOME'), 'Loan search by type (HOME)');

    // Search loan by customer name (Amit)
    const resLoanCust = await entityService.listEntities('loan', { search: 'Amit' });
    assert(resLoanCust.data.length > 0, 'Loan search by borrowing customer name (Amit via customer)');

    // Search credit card by card number or customer
    const allCards = await entityService.listEntities('creditcard', { limit: 10 });
    if (allCards.data.length > 0) {
      const card = allCards.data[0];
      const resCard = await entityService.listEntities('creditcard', { search: String(card.pno) });
      assert(resCard.data.some(c => String(c.pno) === String(card.pno)), `Credit card search by card number (${card.pno})`);

      const resCardType = await entityService.listEntities('creditcard', { search: card.type });
      assert(resCardType.data.length > 0, `Credit card search by network type (${card.type})`);
    } else {
      console.log('  [INFO] No credit card records found to test card number search');
    }

    // Non-matching loan search
    const resLoanNone = await entityService.listEntities('loan', { search: 'NON_EXISTENT_LOAN_999' });
    assert(resLoanNone.data.length === 0, 'Loan non-matching search returns 0 records');
  }

  // --------------------------------------------------------------------------
  // 5. BRANCHES SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Branches Search ---');
  {
    // Search branch by numeric ID (e.g. 101)
    const resId = await entityService.listEntities('branch', { search: '101' });
    assert(resId.data.some(b => String(b.b_id) === '101'), 'Branch search by numeric ID (101)');

    // Search branch by prefixed ID (BR-101)
    const resPrefixed = await entityService.listEntities('branch', { search: 'BR-101' });
    assert(resPrefixed.data.some(b => String(b.b_id) === '101'), 'Branch search by prefixed ID (BR-101)');

    // Search branch by branch name (Main)
    const resName = await entityService.listEntities('branch', { search: 'Main' });
    assert(resName.data.some(b => b.branch_name.includes('Main')), 'Branch search by name (Main)');

    // Search branch by IFSC code (e.g. SBIN0000101)
    const resIfsc = await entityService.listEntities('branch', { search: 'SBIN0000101' });
    assert(resIfsc.data.some(b => b.ifsc === 'SBIN0000101'), 'Branch search by IFSC code (SBIN0000101)');

    // Non-matching branch search
    const resNone = await entityService.listEntities('branch', { search: 'NON_EXISTENT_BRANCH_XYZ' });
    assert(resNone.data.length === 0, 'Branch non-matching search returns 0 records');
  }

  // --------------------------------------------------------------------------
  // 6. EMPLOYEES & RESPONSIBLE_FOR (DUTIES) SEARCH AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Employees & Duties Search ---');
  {
    // Search employee by numeric ID (e.g. 201)
    const resEmpId = await entityService.listEntities('employee', { search: '201' });
    assert(resEmpId.data.some(e => String(e.emp_id) === '201'), 'Employee search by numeric ID (201)');

    // Search employee by prefixed ID (EMP-201)
    const resEmpPrefixed = await entityService.listEntities('employee', { search: 'EMP-201' });
    assert(resEmpPrefixed.data.some(e => String(e.emp_id) === '201'), 'Employee search by prefixed ID (EMP-201)');

    // Search employee by full name (Rahul Sharma)
    const resEmpFullName = await entityService.listEntities('employee', { search: 'Rahul Sharma' });
    assert(resEmpFullName.data.some(e => e.first_name === 'Rahul' && e.last_name === 'Sharma'), 'Employee search by full name (Rahul Sharma)');

    // Search duties (responsible_for)
    const allDuties = await entityService.listEntities('responsible_for', { limit: 10 });
    if (allDuties.data.length > 0) {
      const duty = allDuties.data[0];
      const resDuty = await entityService.listEntities('responsible_for', { search: duty.role_type });
      assert(resDuty.data.some(d => d.role_type === duty.role_type), `Duty search by role type (${duty.role_type})`);

      // Search duty by assigned employee ID or prefixed ID
      const resDutyEmp = await entityService.listEntities('responsible_for', { search: String(duty.emp_id) });
      assert(resDutyEmp.data.length > 0, `Duty search by employee pointer (${duty.emp_id})`);
    }

    // Non-matching employee search
    const resEmpNone = await entityService.listEntities('employee', { search: 'NON_EXISTENT_EMP_999' });
    assert(resEmpNone.data.length === 0, 'Employee non-matching search returns 0 records');
  }

  console.log('\n===============================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSearchTestSuite()
  .catch(err => {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  })
  .finally(() => {
    // End process cleanly
    process.exit(0);
  });
