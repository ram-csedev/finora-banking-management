/**
 * Finora DA3 — Dedicated Branch Permanent Deletion Verification Suite
 *
 * Covers all 12 validation requirements from Section 7:
 *  1. Deleting an empty branch
 *  2. Deleting a branch with employees
 *  3. Deleting a branch with accounts
 *  4. Deleting a branch with operational assignments
 *  5. Deleting a branch with accounts and historical ledger transactions
 *  6. Retention of customers, loans, repayments, and credit cards linked to branch staff
 *  7. Joint accounts & preservation of external customers and external accounts
 *  8. Atomic rollback on constraint / operation failure
 *  9. Concurrent dependency additions between preview and confirmation
 * 10. Preview counts exactly matching deleted records
 * 11. Audit trail logging with action PERMANENT_DELETE_BRANCH
 * 12. Regression verification across banking operations (accounts, customers, loans, staff)
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./config/db');
const deletionService = require('./services/deletionService');
const bankingService = require('./services/bankingService');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🏛️  FINORA DA3: DEDICATED BRANCH PERMANENT DELETION TEST SUITE');
  console.log('☁️  Database: CockroachDB Cloud (finora_da3)');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // 1. Deleting an empty branch
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Deleting an empty branch ---');
  try {
    const ifsc1 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Empty Test Branch', 'Pune', 'Maharashtra', '411001', $1, '9876543210', 'ACTIVE')
       RETURNING b_id`,
      [ifsc1]
    );
    const bId = bRes.rows[0].b_id;

    const preview = await deletionService.getDeletePreview('branch', bId);
    assert(preview.isBlocked === false, 'Empty branch is not blocked');
    assert(preview.allowedActions.find(a => a.action === 'delete_permanent').enabled === true, 'Delete Permanently enabled');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Empty branch deleted successfully');

    const check = await db.query('SELECT 1 FROM branch WHERE b_id = $1', [bId]);
    assert(check.rows.length === 0, 'Empty branch confirmed absent from database');
  } catch (e) {
    assert(false, `Test 1 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 2. Deleting a branch with employees
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Deleting a branch with employees ---');
  try {
    const ifsc2 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Staffed Branch', 'Mumbai', 'Maharashtra', '400001', $1, '9876543211', 'ACTIVE')
       RETURNING b_id`,
      [ifsc2]
    );
    const bId = bRes.rows[0].b_id;

    const e1 = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Officer', 'One', 65000, CURRENT_DATE, $1, 'emp1_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const e2 = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Officer', 'Two', 62000, CURRENT_DATE, $1, 'emp2_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const emp1Id = e1.rows[0].emp_id;
    const emp2Id = e2.rows[0].emp_id;

    const preview = await deletionService.getDeletePreview('branch', bId);
    assert(preview.isBlocked === false, 'Staffed branch deletion is unblocked');
    const staffItem = preview.impact.recordsToDelete.find(r => r.label === 'Assigned Employees');
    assert(staffItem && staffItem.count === 2, 'Preview identifies 2 assigned employees');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Staffed branch deleted cleanly');
    assert(delRes.deleted.cascaded.employeesDeleted === 2, 'Cascade reported 2 employees deleted');

    const checkB = await db.query('SELECT 1 FROM branch WHERE b_id = $1', [bId]);
    const checkE = await db.query('SELECT 1 FROM employee WHERE emp_id IN ($1, $2)', [emp1Id, emp2Id]);
    assert(checkB.rows.length === 0, 'Branch was removed');
    assert(checkE.rows.length === 0, 'Employees were cascaded and removed');
  } catch (e) {
    assert(false, `Test 2 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 3. Deleting a branch with accounts
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Deleting a branch with accounts ---');
  try {
    const ifsc3 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Account Branch', 'Delhi', 'Delhi', '110001', $1, '9876543212', 'ACTIVE')
       RETURNING b_id`,
      [ifsc3]
    );
    const bId = bRes.rows[0].b_id;

    // Existing customer to own the account
    const cRes = await db.query('SELECT cid FROM customer LIMIT 1');
    const cid = cRes.rows[0].cid;

    const aRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 15000.00, 'ACTIVE', 'SAVINGS')
       RETURNING acc_id`,
      [bId]
    );
    const accId = aRes.rows[0].acc_id;

    await db.query(
      `INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary)
       VALUES ($1, $2, 'PRIMARY', true)`,
      [accId, cid]
    );
    await db.query(
      `INSERT INTO nominee (acc_id, first_name, last_name, relationship)
       VALUES ($1, 'Test', 'Nominee', 'SIBLING')`,
      [accId]
    );

    const preview = await deletionService.getDeletePreview('branch', bId);
    assert(preview.isBlocked === false, 'Branch with accounts is not blocked');
    assert(preview.hasProtectedHistory === true, 'Branch with accounts flagged with protected history');
    const accItem = preview.impact.recordsToDelete.find(r => r.label === 'Domiciled Accounts');
    assert(accItem && accItem.count === 1, 'Preview shows 1 domiciled account');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Branch with accounts deleted permanently');
    assert(delRes.deleted.cascaded.accountsDeleted === 1, 'Cascade deleted 1 account');

    const checkB = await db.query('SELECT 1 FROM branch WHERE b_id = $1', [bId]);
    const checkA = await db.query('SELECT 1 FROM account WHERE acc_id = $1', [accId]);
    const checkHolders = await db.query('SELECT 1 FROM account_holder WHERE acc_id = $1', [accId]);
    const checkNom = await db.query('SELECT 1 FROM nominee WHERE acc_id = $1', [accId]);
    const checkC = await db.query('SELECT 1 FROM customer WHERE cid = $1', [cid]);

    assert(checkB.rows.length === 0, 'Branch deleted');
    assert(checkA.rows.length === 0, 'Account deleted');
    assert(checkHolders.rows.length === 0, 'Account holder links deleted');
    assert(checkNom.rows.length === 0, 'Nominees deleted');
    assert(checkC.rows.length === 1, 'Customer record retained');
  } catch (e) {
    assert(false, `Test 3 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 4. Deleting a branch with operational assignments
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Deleting a branch with operational assignments ---');
  try {
    const ifsc4 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Duty Branch', 'Bengaluru', 'Karnataka', '560001', $1, '9876543213', 'ACTIVE')
       RETURNING b_id`,
      [ifsc4]
    );
    const bId = bRes.rows[0].b_id;

    const eRes = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Duty', 'Officer', 70000, CURRENT_DATE, $1, 'duty_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const empId = eRes.rows[0].emp_id;

    const rfRes = await db.query(
      `INSERT INTO responsible_for (emp_id, b_id, role_type, assigned_date, status)
       VALUES ($1, $2, 'BRANCH_MANAGER', CURRENT_DATE, 'ACTIVE')
       RETURNING rf_id`,
      [empId, bId]
    );
    const rfId = rfRes.rows[0].rf_id;

    const preview = await deletionService.getDeletePreview('branch', bId);
    assert(preview.isBlocked === false, 'Branch with operational duties is unblocked');
    const dutyItem = preview.impact.relationshipsToRemove.find(r => r.label === 'Operational Assignments');
    assert(dutyItem && dutyItem.count === 1, 'Preview shows 1 operational assignment to remove');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Branch with operational duties deleted cleanly');

    const checkDuty = await db.query('SELECT 1 FROM responsible_for WHERE rf_id = $1', [rfId]);
    assert(checkDuty.rows.length === 0, 'Duty assignment was cleaned up');
  } catch (e) {
    assert(false, `Test 4 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 5. Deleting a branch with accounts and historical ledger transactions
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Branch with accounts & historical ledger transactions ---');
  try {
    const ifsc5 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Tx Branch', 'Chennai', 'Tamil Nadu', '600001', $1, '9876543214', 'ACTIVE')
       RETURNING b_id`,
      [ifsc5]
    );
    const bId = bRes.rows[0].b_id;

    const aRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 50000.00, 'ACTIVE', 'CURRENT')
       RETURNING acc_id`,
      [bId]
    );
    const accId = aRes.rows[0].acc_id;

    // Seed multiple transactions including self-transfer links
    const t1 = await db.query(
      `INSERT INTO "transaction" (acc_id, type, amount, mode, status, description)
       VALUES ($1, 'DEPOSIT', 50000.00, 'ONLINE', 'SUCCESS', 'Opening Deposit')
       RETURNING t_id`,
      [accId]
    );
    const t2 = await db.query(
      `INSERT INTO "transaction" (acc_id, type, amount, mode, status, description, related_trans_id)
       VALUES ($1, 'TRANSFER', 5000.00, 'ONLINE', 'SUCCESS', 'Self-linked Transfer', $2)
       RETURNING t_id`,
      [accId, t1.rows[0].t_id]
    );

    const preview = await deletionService.getDeletePreview('branch', bId);
    assert(preview.isBlocked === false, 'Branch with transaction history is unblocked');
    assert(preview.hasProtectedHistory === true, 'Protected history flag set');
    const txItem = preview.impact.protectedFinancialRecords.find(r => r.label === 'Historical Ledger Transactions');
    assert(txItem && txItem.count === 2, 'Preview identifies 2 historical ledger transactions');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Branch with transactions deleted cleanly');
    assert(delRes.deleted.cascaded.transactionsDeleted === 2, 'Cascade reported 2 transactions deleted');

    const checkTx = await db.query('SELECT 1 FROM "transaction" WHERE acc_id = $1', [accId]);
    assert(checkTx.rows.length === 0, 'Transactions deleted');
  } catch (e) {
    assert(false, `Test 5 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 6. Retention of customers, loans, repayments, and credit cards linked through staff
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Retention of customers, loans, repayments & credit cards ---');
  try {
    const ifsc6 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Staff Loan Branch', 'Hyderabad', 'Telangana', '500001', $1, '9876543215', 'ACTIVE')
       RETURNING b_id`,
      [ifsc6]
    );
    const bId = bRes.rows[0].b_id;

    // Branch employee
    const eRes = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Loan', 'Manager', 85000, CURRENT_DATE, $1, 'loanmgr_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const empId = eRes.rows[0].emp_id;

    // Customer managed by this employee
    const cRes = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email, emp_id)
       VALUES ('RETE' || floor(random()*90000)::text, 'Preserved', 'Customer', 'pres_${Date.now()}@test.com', $1)
       RETURNING cid`,
      [empId]
    );
    const cid = cRes.rows[0].cid;

    // Loan assigned to this employee
    const lRes = await db.query(
      `INSERT INTO loan (cid, assigned_emp_id, l_type, amount, interest, term, start_date, status)
       VALUES ($1, $2, 'PERSONAL', 200000, 11.5, 36, CURRENT_DATE, 'ACTIVE')
       RETURNING l_id`,
      [cid, empId]
    );
    const loanId = lRes.rows[0].l_id;

    // Repayment
    await db.query(
      `INSERT INTO loan_payment (l_id, payment_date, amount, principal_amount, interest_amount, payment_mode, status)
       VALUES ($1, CURRENT_DATE, 6000, 4500, 1500, 'ONLINE', 'SUCCESS')`,
      [loanId]
    );

    // Credit card
    const cardNo = '4111' + Math.floor(100000000000 + Math.random() * 900000000000);
    await db.query(
      `INSERT INTO creditcard (pno, cid, type, card_limit, expiry, status)
       VALUES ($1, $2, 'VISA', 75000, CURRENT_DATE + INTERVAL '3 years', 'ACTIVE')`,
      [cardNo, cid]
    );

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Branch deleted');

    // Verify employee deleted
    const checkEmp = await db.query('SELECT 1 FROM employee WHERE emp_id = $1', [empId]);
    assert(checkEmp.rows.length === 0, 'Branch employee deleted');

    // Verify customer retained with emp_id = null
    const custCheck = await db.query('SELECT cid, emp_id FROM customer WHERE cid = $1', [cid]);
    assert(custCheck.rows.length === 1, 'Customer retained');
    assert(custCheck.rows[0].emp_id === null, 'Customer emp_id set to NULL');

    // Verify loan retained with assigned_emp_id = null
    const loanCheck = await db.query('SELECT l_id, assigned_emp_id FROM loan WHERE l_id = $1', [loanId]);
    assert(loanCheck.rows.length === 1, 'Loan retained');
    assert(loanCheck.rows[0].assigned_emp_id === null, 'Loan assigned_emp_id set to NULL');

    // Verify repayments retained
    const pmtCheck = await db.query('SELECT 1 FROM loan_payment WHERE l_id = $1', [loanId]);
    assert(pmtCheck.rows.length === 1, 'Repayments retained');

    // Verify credit card retained
    const cardCheck = await db.query('SELECT 1 FROM creditcard WHERE pno = $1', [cardNo]);
    assert(cardCheck.rows.length === 1, 'Credit card retained');

    // Cleanup created customer resources
    await db.query('DELETE FROM loan_payment WHERE l_id = $1', [loanId]);
    await db.query('DELETE FROM loan WHERE l_id = $1', [loanId]);
    await db.query('DELETE FROM creditcard WHERE pno = $1', [cardNo]);
    await db.query('DELETE FROM customer WHERE cid = $1', [cid]);
  } catch (e) {
    assert(false, `Test 6 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 7. Joint accounts & preservation of external customers and external accounts
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Joint accounts & external customer/account preservation ---');
  try {
    const ifsc7 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Joint Branch', 'Kolkata', 'West Bengal', '700001', $1, '9876543216', 'ACTIVE')
       RETURNING b_id`,
      [ifsc7]
    );
    const bId = bRes.rows[0].b_id;

    // Customer 1 and Customer 2
    const c1Res = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email)
       VALUES ('JNT1' || floor(random()*90000)::text, 'Primary', 'Owner', 'own1_${Date.now()}@test.com')
       RETURNING cid`
    );
    const cid1 = c1Res.rows[0].cid;

    const c2Res = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email)
       VALUES ('JNT2' || floor(random()*90000)::text, 'Secondary', 'Owner', 'own2_${Date.now()}@test.com')
       RETURNING cid`
    );
    const cid2 = c2Res.rows[0].cid;

    // Joint account at this branch
    const aRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 100000.00, 'ACTIVE', 'CURRENT')
       RETURNING acc_id`,
      [bId]
    );
    const accId = aRes.rows[0].acc_id;

    await db.query(`INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary) VALUES ($1, $2, 'PRIMARY', true)`, [accId, cid1]);
    await db.query(`INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary) VALUES ($1, $2, 'JOINT', false)`, [accId, cid2]);

    // Secondary owner also has a separate external account at an existing branch
    const existingBranchRes = await db.query('SELECT b_id FROM branch WHERE b_id != $1 LIMIT 1', [bId]);
    const extBId = existingBranchRes.rows[0].b_id;

    const extAccRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 20000.00, 'ACTIVE', 'SAVINGS')
       RETURNING acc_id`,
      [extBId]
    );
    const extAccId = extAccRes.rows[0].acc_id;

    await db.query(`INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary) VALUES ($1, $2, 'PRIMARY', true)`, [extAccId, cid2]);

    // External beneficiary pointing to the doomed account
    const beneRes = await db.query(
      `INSERT INTO beneficiary (cid, nickname, beneficiary_name, destination_account_num, destination_ifsc, internal_acc_id)
       VALUES ($1, 'TargetInternal', 'Target User', '1122334455', 'IFSC001', $2)
       RETURNING beneficiary_id`,
      [cid2, accId]
    );
    const beneId = beneRes.rows[0].beneficiary_id;

    // Delete the branch
    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Joint branch deleted cleanly');

    // 1. Joint account was deleted
    const checkJointAcc = await db.query('SELECT 1 FROM account WHERE acc_id = $1', [accId]);
    assert(checkJointAcc.rows.length === 0, 'Joint account domiciled at deleted branch is deleted');

    // 2. Both customers are preserved
    const checkC1 = await db.query('SELECT 1 FROM customer WHERE cid = $1', [cid1]);
    const checkC2 = await db.query('SELECT 1 FROM customer WHERE cid = $1', [cid2]);
    assert(checkC1.rows.length === 1, 'Primary customer profile retained');
    assert(checkC2.rows.length === 1, 'Joint customer profile retained');

    // 3. External account is preserved
    const checkExtAcc = await db.query('SELECT 1 FROM account WHERE acc_id = $1', [extAccId]);
    assert(checkExtAcc.rows.length === 1, 'External account preserved');

    // 4. Beneficiary record retained with internal_acc_id unlinked (null)
    const checkBene = await db.query('SELECT internal_acc_id FROM beneficiary WHERE beneficiary_id = $1', [beneId]);
    assert(checkBene.rows.length === 1, 'Beneficiary record retained');
    assert(checkBene.rows[0].internal_acc_id === null, 'Beneficiary internal_acc_id safely set to NULL');

    // Cleanup
    await db.query('DELETE FROM beneficiary WHERE beneficiary_id = $1', [beneId]);
    await db.query('DELETE FROM account_holder WHERE acc_id = $1', [extAccId]);
    await db.query('DELETE FROM account WHERE acc_id = $1', [extAccId]);
    await db.query('DELETE FROM customer WHERE cid IN ($1, $2)', [cid1, cid2]);
  } catch (e) {
    assert(false, `Test 7 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 8. Atomic rollback on constraint / operation failure
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Atomic rollback on failure ---');
  try {
    const ifsc8 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Rollback Branch', 'Jaipur', 'Rajasthan', '302001', $1, '9876543217', 'ACTIVE')
       RETURNING b_id`,
      [ifsc8]
    );
    const bId = bRes.rows[0].b_id;

    const eRes = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Rollback', 'Staff', 55000, CURRENT_DATE, $1, 'rb_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const empId = eRes.rows[0].emp_id;

    // Simulate an atomic transaction where an error occurs midway
    let rolledBack = false;
    try {
      await db.executeTransaction(async (client) => {
        // Step 1: delete employee
        await client.query('DELETE FROM employee WHERE emp_id = $1', [empId]);
        // Step 2: intentionally throw an error before branch deletion
        throw new Error('Simulated network disruption midway through deletion');
      });
    } catch (txErr) {
      rolledBack = true;
      assert(txErr.message.includes('Simulated network disruption'), 'Midway error caught as expected');
    }
    assert(rolledBack, 'Transaction aborted cleanly');

    // Verify employee was NOT deleted due to atomic rollback
    const checkEmp = await db.query('SELECT 1 FROM employee WHERE emp_id = $1', [empId]);
    const checkBranch = await db.query('SELECT 1 FROM branch WHERE b_id = $1', [bId]);
    assert(checkEmp.rows.length === 1, 'Employee restored by atomic rollback');
    assert(checkBranch.rows.length === 1, 'Branch restored by atomic rollback');

    // Now cleanly delete with service
    await deletionService.confirmPermanentDelete('branch', bId);
  } catch (e) {
    assert(false, `Test 8 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 9. Concurrent dependency additions between preview and confirmation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Concurrent dependency additions ---');
  try {
    const ifsc9 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Concurrent Branch', 'Ahmedabad', 'Gujarat', '380001', $1, '9876543218', 'ACTIVE')
       RETURNING b_id`,
      [ifsc9]
    );
    const bId = bRes.rows[0].b_id;

    // Step A: Preview generated while branch has 0 accounts and 0 staff
    const preview1 = await deletionService.getDeletePreview('branch', bId);
    assert(preview1.impact.recordsToDelete.length === 1, 'Initial preview shows only 1 record to delete (branch itself)');

    // Step B: Concurrently, another transaction adds an employee and an account
    const eRes = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Concurrent', 'Worker', 48000, CURRENT_DATE, $1, 'conc_${Date.now()}@test.com', 'ACTIVE')
       RETURNING emp_id`,
      [bId]
    );
    const empId = eRes.rows[0].emp_id;

    const aRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 5000.00, 'ACTIVE', 'SAVINGS')
       RETURNING acc_id`,
      [bId]
    );
    const accId = aRes.rows[0].acc_id;

    // Step C: User confirms deletion. The execution dynamically re-queries all dependencies
    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Deletion successfully processed despite concurrent additions');
    assert(delRes.deleted.cascaded.employeesDeleted === 1, 'Cascade dynamically caught newly added employee');
    assert(delRes.deleted.cascaded.accountsDeleted === 1, 'Cascade dynamically caught newly added account');

    const checkE = await db.query('SELECT 1 FROM employee WHERE emp_id = $1', [empId]);
    const checkA = await db.query('SELECT 1 FROM account WHERE acc_id = $1', [accId]);
    const checkB = await db.query('SELECT 1 FROM branch WHERE b_id = $1', [bId]);
    assert(checkE.rows.length === 0, 'Concurrent employee deleted');
    assert(checkA.rows.length === 0, 'Concurrent account deleted');
    assert(checkB.rows.length === 0, 'Branch deleted');
  } catch (e) {
    assert(false, `Test 9 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 10. Preview counts matching deleted records
  // --------------------------------------------------------------------------
  console.log('\n--- Test 10: Preview counts matching deleted records ---');
  try {
    const ifsc10 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Count Branch', 'Nagpur', 'Maharashtra', '440001', $1, '9876543219', 'ACTIVE')
       RETURNING b_id`,
      [ifsc10]
    );
    const bId = bRes.rows[0].b_id;

    // 2 staff
    await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('E1', 'Test', 50000, CURRENT_DATE, $1, 'e1_${Date.now()}@test.com', 'ACTIVE')`,
      [bId]
    );
    await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('E2', 'Test', 50000, CURRENT_DATE, $1, 'e2_${Date.now()}@test.com', 'ACTIVE')`,
      [bId]
    );

    // 1 account with 3 transactions
    const aRes = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 3000.00, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = aRes.rows[0].acc_id;

    await db.query(`INSERT INTO "transaction" (acc_id, type, amount, mode, status, description) VALUES ($1, 'DEPOSIT', 1000, 'ONLINE', 'SUCCESS', 'T1')`, [accId]);
    await db.query(`INSERT INTO "transaction" (acc_id, type, amount, mode, status, description) VALUES ($1, 'DEPOSIT', 1000, 'ONLINE', 'SUCCESS', 'T2')`, [accId]);
    await db.query(`INSERT INTO "transaction" (acc_id, type, amount, mode, status, description) VALUES ($1, 'DEPOSIT', 1000, 'ONLINE', 'SUCCESS', 'T3')`, [accId]);

    const preview = await deletionService.getDeletePreview('branch', bId);
    const previewEmp = preview.impact.recordsToDelete.find(r => r.label === 'Assigned Employees')?.count || 0;
    const previewAcc = preview.impact.recordsToDelete.find(r => r.label === 'Domiciled Accounts')?.count || 0;
    const previewTx = preview.impact.protectedFinancialRecords.find(r => r.label === 'Historical Ledger Transactions')?.count || 0;

    assert(previewEmp === 2, 'Preview accurately counted 2 employees');
    assert(previewAcc === 1, 'Preview accurately counted 1 account');
    assert(previewTx === 3, 'Preview accurately counted 3 transactions');

    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.deleted.cascaded.employeesDeleted === previewEmp, 'Deleted employees matches preview count exactly');
    assert(delRes.deleted.cascaded.accountsDeleted === previewAcc, 'Deleted accounts matches preview count exactly');
    assert(delRes.deleted.cascaded.transactionsDeleted === previewTx, 'Deleted transactions matches preview count exactly');
  } catch (e) {
    assert(false, `Test 10 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 11. Audit logging (PERMANENT_DELETE_BRANCH)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 11: Audit logging for PERMANENT_DELETE_BRANCH ---');
  try {
    const ifsc11 = 'TEST' + Math.floor(1000000 + Math.random() * 9000000);
    const bRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Audit Branch', 'Indore', 'Madhya Pradesh', '452001', $1, '9876543220', 'ACTIVE')
       RETURNING b_id`,
      [ifsc11]
    );
    const bId = bRes.rows[0].b_id;

    await deletionService.confirmPermanentDelete('branch', bId, null, {
      empId: 201,
      ipAddress: '192.168.1.100'
    });

    const auditRes = await db.query(
      `SELECT log_id, action, entity_name, entity_id, ip_address, details
       FROM audit_log
       WHERE action = 'PERMANENT_DELETE_BRANCH' AND entity_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(bId)]
    );
    assert(auditRes.rows.length === 1, 'Audit log entry created for PERMANENT_DELETE_BRANCH');
    const log = auditRes.rows[0];
    assert(log.entity_name === 'BRANCH', 'Audit entity_name is BRANCH');
    assert(log.entity_id === String(bId), 'Audit entity_id matches deleted branch ID');
    assert(log.ip_address === '192.168.1.100', 'Audit ip_address recorded correctly');
    assert(typeof log.details === 'object', 'Audit details contains JSON payload');
  } catch (e) {
    assert(false, `Test 11 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // 12. Regression testing across accounts, customers, loans, and employees
  // --------------------------------------------------------------------------
  console.log('\n--- Test 12: System regression verification ---');
  try {
    // A. Check that existing accounts can deposit
    const accRes = await db.query(`SELECT acc_id FROM account WHERE status = 'ACTIVE' LIMIT 1`);
    if (accRes.rows.length > 0) {
      const activeAccId = accRes.rows[0].acc_id;
      const dep = await bankingService.processDeposit({
        acc_id: activeAccId,
        amount: 25,
        mode: 'ONLINE',
        description: 'Post-Branch-Deletion Regression Check'
      });
      assert(dep.transaction.status === 'SUCCESS', 'Banking deposit operation remains operational');
    }

    // B. Check that other deletion preview types remain functional
    const custRes = await db.query(`SELECT cid FROM customer LIMIT 1`);
    if (custRes.rows.length > 0) {
      const cPreview = await deletionService.getDeletePreview('customer', custRes.rows[0].cid);
      assert(Boolean(cPreview.entityTitle), 'Customer deletion preview operational');
    }

    const empRes = await db.query(`SELECT emp_id FROM employee LIMIT 1`);
    if (empRes.rows.length > 0) {
      const ePreview = await deletionService.getDeletePreview('employee', empRes.rows[0].emp_id);
      assert(Boolean(ePreview.entityTitle), 'Employee deletion preview operational');
    }

    const loanRes = await db.query(`SELECT l_id FROM loan LIMIT 1`);
    if (loanRes.rows.length > 0) {
      const lPreview = await deletionService.getDeletePreview('loan', loanRes.rows[0].l_id);
      assert(Boolean(lPreview.entityTitle), 'Loan deletion preview operational');
    }
  } catch (e) {
    assert(false, `Test 12 failed: ${e.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 BRANCH PERMANENT DELETION SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(e => {
  console.error('Fatal suite failure:', e);
  process.exit(1);
});
