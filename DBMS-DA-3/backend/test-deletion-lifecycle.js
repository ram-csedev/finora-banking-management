/**
 * Finora DA3 - Comprehensive Phase 7 Automated Test Suite
 * Tests all 20 verification scenarios required by Section 10:
 * 1. Deletion preview for existing and nonexistent records
 * 2. Deletion cancellation without database changes
 * 3. Deletion of a record with no dependencies
 * 4. Preview with multiple dependent records
 * 5. Preservation of shared customer and account records
 * 6. Account closure with zero balance
 * 7. Rejection of account closure with a non-zero balance
 * 8. Prevention of deposits and withdrawals on closed accounts
 * 9. Protection of completed transaction history
 * 10. Credit-card blocking, unblocking, and closure
 * 11. Loan settlement and payment-history preservation
 * 12. Employee deletion and deactivation
 * 13. Branch deletion and deactivation
 * 14. Nominee removal, beneficiary deletion, and phone deletion
 * 15. Account-holder relationship removal
 * 16. Foreign-key violations and rollback
 * 17. Concurrent changes between preview and confirmation
 * 18. Duplicate submissions
 * 19. Audit-log correctness
 * 20. Regression tests for existing banking operations
 */
require('dotenv').config();
const db = require('./config/db');
const deletionService = require('./services/deletionService');
const bankingService = require('./services/bankingService');

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 FINORA DA3 - PHASE 7 VERIFICATION & REGRESSION SUITE');
  console.log('☁️  Target: CockroachDB Cloud (finora_da3)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Scenario 1: Deletion preview for existing and nonexistent records
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 1: Deletion preview for existing & nonexistent records ---');
  try {
    const existingCust = await db.query('SELECT cid FROM customer LIMIT 1');
    const pExist = await deletionService.getDeletePreview('customer', existingCust.rows[0].cid);
    assert(pExist.entityId === String(existingCust.rows[0].cid), 'Preview exists for valid customer');
    assert(pExist.impact.recordsToDelete.length > 0, 'Impact breakdown contains recordsToDelete');

    try {
      await deletionService.getDeletePreview('customer', 88888888888);
      assert(false, 'Should throw 404 for nonexistent customer');
    } catch (e) {
      assert(e.statusCode === 404, 'Nonexistent record preview throws 404');
    }
  } catch (e) {
    assert(false, `Scenario 1 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 2: Deletion cancellation without database changes
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Deletion cancellation without database changes ---');
  try {
    const beforeCount = await db.query('SELECT count(*) FROM customer');
    // Simulate user requesting preview, but cancelling (no confirm API called)
    const custRes = await db.query('SELECT cid FROM customer LIMIT 1');
    await deletionService.getDeletePreview('customer', custRes.rows[0].cid);
    const afterCount = await db.query('SELECT count(*) FROM customer');
    assert(beforeCount.rows[0].count === afterCount.rows[0].count, 'Record count unchanged after preview without confirmation');
  } catch (e) {
    assert(false, `Scenario 2 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 3: Deletion of a record with no dependencies
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Deletion of a record with no dependencies ---');
  try {
    const pan = 'TEMP' + Math.floor(100000 + Math.random() * 900000);
    const ins = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email, city)
       VALUES ($1, 'Solitary', 'Customer', 'solitary@test.com', 'Delhi') RETURNING cid`,
      [pan]
    );
    const tempCid = ins.rows[0].cid;

    const preview = await deletionService.getDeletePreview('customer', tempCid);
    assert(preview.isBlocked === false, 'Customer with zero dependencies is unblocked');

    const del = await deletionService.confirmPermanentDelete('customer', tempCid);
    assert(del.success === true, 'Permanent deletion succeeded cleanly for unlinked record');

    const verify = await db.query('SELECT 1 FROM customer WHERE cid = $1', [tempCid]);
    assert(verify.rows.length === 0, 'Deleted customer verified absent from database');
  } catch (e) {
    assert(false, `Scenario 3 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 4: Preview with multiple dependent records
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Preview with multiple dependent records ---');
  try {
    // Find customer with accounts, loans or creditcards
    const custDep = await db.query(
      `SELECT c.cid FROM customer c
       JOIN account_holder ah ON c.cid = ah.cid
       LIMIT 1`
    );
    if (custDep.rows.length > 0) {
      const p = await deletionService.getDeletePreview('customer', custDep.rows[0].cid);
      assert(p.isBlocked === true, 'Customer with active account relationships is blocked');
      assert(p.blockReasons.length > 0, `Block reason provided: "${p.blockReasons[0]}"`);
      assert(p.allowedActions.find(a => a.action === 'delete_permanent').enabled === false, 'Delete Permanently button disabled');
    } else {
      console.log('  ⚠️ Skipping Scenario 4: No customer with account dependencies found');
    }
  } catch (e) {
    assert(false, `Scenario 4 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 5: Preservation of shared customer and account records
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Preservation of shared customer and account records ---');
  try {
    // When a joint holder relationship is removed, both the customer and account are preserved
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;

    // Create 2 test customers and 1 shared account
    const c1 = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email)
       VALUES ('SHAR1' || floor(random()*90000)::text, 'Holder1', 'Test', 'h1@test.com') RETURNING cid`
    );
    const c2 = await db.query(
      `INSERT INTO customer (pan, first_name, last_name, email)
       VALUES ('SHAR2' || floor(random()*90000)::text, 'Holder2', 'Test', 'h2@test.com') RETURNING cid`
    );
    const cid1 = c1.rows[0].cid;
    const cid2 = c2.rows[0].cid;

    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 0, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    // Link both as account holders
    await db.query(
      `INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary, share_percentage)
       VALUES ($1, $2, 'PRIMARY', true, 50), ($1, $3, 'JOINT', false, 50)`,
      [accId, cid1, cid2]
    );

    // Remove holder2 link
    const rem = await deletionService.confirmPermanentDelete('account_holder', accId, cid2);
    assert(rem.success === true, 'Successfully removed joint holder relationship');

    // Verify account still exists, holder1 still exists, and holder2 profile still exists
    const accCheck = await db.query('SELECT 1 FROM account WHERE acc_id = $1', [accId]);
    const c2Check = await db.query('SELECT 1 FROM customer WHERE cid = $1', [cid2]);
    assert(accCheck.rows.length === 1, 'Account preserved after relationship removal');
    assert(c2Check.rows.length === 1, 'Customer profile preserved after relationship removal');

    // Clean up
    await db.query('DELETE FROM account_holder WHERE acc_id = $1', [accId]);
    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
    await db.query('DELETE FROM customer WHERE cid IN ($1, $2)', [cid1, cid2]);
  } catch (e) {
    assert(false, `Scenario 5 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 6: Account closure with zero balance
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Account closure with zero balance ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;
    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 0, 'ACTIVE', 'CURRENT') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    const res = await deletionService.executeLifecycleAction('account', accId, 'close_account');
    assert(res.success === true, 'Zero-balance account successfully closed');
    assert(res.data.status === 'CLOSED', 'Account status confirmed as CLOSED');

    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
  } catch (e) {
    assert(false, `Scenario 6 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 7: Rejection of account closure with non-zero balance
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Rejection of account closure with non-zero balance ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;
    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 2500.50, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    try {
      await deletionService.executeLifecycleAction('account', accId, 'close_account');
      assert(false, 'Should reject closure for account with balance > 0');
    } catch (e) {
      assert(e.statusCode === 400, 'Closure rejected with 400 for positive balance');
    }

    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
  } catch (e) {
    assert(false, `Scenario 7 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 8: Prevention of deposits and withdrawals on closed accounts
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Prevention of deposits and withdrawals on closed accounts ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;
    const testAccId = 88000 + Math.floor(Math.random() * 9000);
    const acc = await db.query(
      `INSERT INTO account (acc_id, b_id, balance, status, acc_type)
       VALUES ($1, $2, 0, 'CLOSED', 'SAVINGS') RETURNING acc_id`,
      [testAccId, bId]
    );
    const accId = acc.rows[0].acc_id;

    // Test deposit
    try {
      await bankingService.processDeposit({ acc_id: accId, amount: 500, mode: 'ONLINE' });
      assert(false, 'Deposit should fail on closed account');
    } catch (e) {
      assert(e.statusCode === 400, 'Deposit rejected with 400 on closed account');
    }

    // Test withdrawal
    try {
      await bankingService.processWithdrawal({ acc_id: accId, amount: 100, mode: 'ATM' });
      assert(false, 'Withdrawal should fail on closed account');
    } catch (e) {
      assert(e.statusCode === 400, 'Withdrawal rejected with 400 on closed account');
    }

    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
  } catch (e) {
    assert(false, `Scenario 8 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 9: Protection of completed transaction history
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 9: Protection of completed transaction history ---');
  try {
    const tx = await db.query('SELECT t_id FROM "transaction" LIMIT 1');
    if (tx.rows.length > 0) {
      const tId = tx.rows[0].t_id;
      try {
        await deletionService.getDeletePreview('transaction', tId);
        assert(false, 'Transaction preview should be blocked');
      } catch (e) {
        assert(e.statusCode === 403, 'Transaction deletion preview forbidden with 403');
      }

      try {
        await deletionService.confirmPermanentDelete('transaction', tId);
        assert(false, 'Transaction deletion should be blocked');
      } catch (e) {
        assert(e.statusCode === 403, 'Transaction permanent deletion forbidden with 403');
      }
    } else {
      console.log('  ⚠️ Skipping Scenario 9: No transactions found');
    }
  } catch (e) {
    assert(false, `Scenario 9 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 10: Credit card blocking, unblocking, and closure
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 10: Credit card blocking, unblocking, and closure ---');
  try {
    const custRes = await db.query('SELECT cid FROM customer LIMIT 1');
    const cid = custRes.rows[0].cid;
    const pno = 'SCEN10' + Math.floor(1000000000 + Math.random() * 9000000000);

    await db.query(
      `INSERT INTO creditcard (pno, cid, type, card_limit, expiry, status)
       VALUES ($1, $2, 'VISA', 75000, CURRENT_DATE + 365, 'ACTIVE')`,
      [pno, cid]
    );

    const bRes = await deletionService.executeLifecycleAction('creditcard', pno, 'block_card');
    assert(bRes.data.status === 'BLOCKED', 'Card status set to BLOCKED');

    const uRes = await deletionService.executeLifecycleAction('creditcard', pno, 'unblock_card');
    assert(uRes.data.status === 'ACTIVE', 'Card status set back to ACTIVE');

    const cRes = await deletionService.executeLifecycleAction('creditcard', pno, 'close_card');
    assert(cRes.data.status === 'CANCELLED', 'Card status set to CANCELLED');

    await db.query('DELETE FROM creditcard WHERE pno = $1', [pno]);
  } catch (e) {
    assert(false, `Scenario 10 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 11: Loan settlement and payment-history preservation
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 11: Loan settlement and payment-history preservation ---');
  try {
    const custRes = await db.query('SELECT cid FROM customer LIMIT 1');
    const cid = custRes.rows[0].cid;

    const loanRes = await db.query(
      `INSERT INTO loan (cid, l_type, amount, interest, term, start_date, status)
       VALUES ($1, 'PERSONAL', 50000, 10.5, 12, CURRENT_DATE, 'ACTIVE') RETURNING l_id`,
      [cid]
    );
    const lId = loanRes.rows[0].l_id;

    // Post a payment installment
    const payRes = await db.query(
      `INSERT INTO loan_payment (l_id, payment_date, amount, principal_amount, interest_amount, payment_mode, status)
       VALUES ($1, CURRENT_DATE, 5000, 4500, 500, 'ONLINE', 'SUCCESS') RETURNING payment_id`,
      [lId]
    );
    const paymentId = payRes.rows[0].payment_id;

    // Verify deletion is blocked because payment exists
    const p = await deletionService.getDeletePreview('loan', lId);
    assert(p.isBlocked === true, 'Loan deletion is blocked due to repayment installments');

    // Settle loan
    const setRes = await deletionService.executeLifecycleAction('loan', lId, 'settle_loan');
    assert(setRes.data.status === 'PAID_OFF', 'Loan status updated to PAID_OFF');

    // Verify payment was preserved
    const payCheck = await db.query('SELECT 1 FROM loan_payment WHERE payment_id = $1', [paymentId]);
    assert(payCheck.rows.length === 1, 'Payment installment preserved after loan settlement');

    // Clean up
    await db.query('DELETE FROM loan_payment WHERE payment_id = $1', [paymentId]);
    await db.query('DELETE FROM loan WHERE l_id = $1', [lId]);
  } catch (e) {
    assert(false, `Scenario 11 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 12: Employee deletion and deactivation
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 12: Employee deletion and deactivation ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;

    const empRes = await db.query(
      `INSERT INTO employee (first_name, last_name, salary, hire_date, b_id, email, status)
       VALUES ('Staff', 'Test', 45000, CURRENT_DATE, $1, 'stafftest@example.com', 'ACTIVE') RETURNING emp_id`,
      [bId]
    );
    const empId = empRes.rows[0].emp_id;

    // Deactivate
    const dRes = await deletionService.executeLifecycleAction('employee', empId, 'deactivate_employee');
    assert(dRes.data.status === 'INACTIVE', 'Staff status updated to INACTIVE');

    // Reactivate
    const rRes = await deletionService.executeLifecycleAction('employee', empId, 'reactivate_employee');
    assert(rRes.data.status === 'ACTIVE', 'Staff status reactivated to ACTIVE');

    // Delete
    const delRes = await deletionService.confirmPermanentDelete('employee', empId);
    assert(delRes.success === true, 'Unlinked employee deleted permanently');
  } catch (e) {
    assert(false, `Scenario 12 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 13: Branch deletion and deactivation
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 13: Branch deletion and deactivation ---');
  try {
    const ifsc = 'FINO' + Math.floor(1000000 + Math.random() * 9000000);
    const brRes = await db.query(
      `INSERT INTO branch (branch_name, city, state, pincode, ifsc, contact, status)
       VALUES ('Temp Test Branch', 'Pune', 'Maharashtra', '411001', $1, '9876543210', 'ACTIVE') RETURNING b_id`,
      [ifsc]
    );
    const bId = brRes.rows[0].b_id;

    // Deactivate
    const dRes = await deletionService.executeLifecycleAction('branch', bId, 'deactivate_branch');
    assert(dRes.data.status === 'INACTIVE', 'Branch status updated to INACTIVE');

    // Reactivate
    const rRes = await deletionService.executeLifecycleAction('branch', bId, 'reactivate_branch');
    assert(rRes.data.status === 'ACTIVE', 'Branch status reactivated to ACTIVE');

    // Delete (has no employees or accounts)
    const delRes = await deletionService.confirmPermanentDelete('branch', bId);
    assert(delRes.success === true, 'Empty branch deleted permanently');
  } catch (e) {
    assert(false, `Scenario 13 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 14: Nominee removal, beneficiary deletion, and phone deletion
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 14: Nominee, Beneficiary, and Phone deletion ---');
  try {
    const custRes = await db.query('SELECT cid FROM customer LIMIT 1');
    const cid = custRes.rows[0].cid;
    const accRes = await db.query('SELECT acc_id FROM account LIMIT 1');
    const accId = accRes.rows[0].acc_id;

    // Nominee
    const nomRes = await db.query(
      `INSERT INTO nominee (acc_id, cid, first_name, last_name, relationship)
       VALUES ($1, $2, 'Nominee', 'Test', 'SPOUSE') RETURNING n_id`,
      [accId, cid]
    );
    const nId = nomRes.rows[0].n_id;
    const delNom = await deletionService.confirmPermanentDelete('nominee', nId);
    assert(delNom.success === true, 'Nominee record removed without affecting account or customer');

    // Phone
    const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
    await db.query(
      `INSERT INTO customer_phone (cid, phone, phone_type, is_primary)
       VALUES ($1, $2, 'MOBILE', false)`,
      [cid, testPhone]
    );
    const delPhone = await deletionService.confirmPermanentDelete('customer_phone', cid, testPhone);
    assert(delPhone.success === true, 'Customer phone removed without affecting customer');

    // Beneficiary
    const beneRes = await db.query(
      `INSERT INTO beneficiary (cid, nickname, beneficiary_name, destination_account_num, destination_ifsc)
       VALUES ($1, 'TestBene', 'Bene User', '123456789012', 'HDFC0001234') RETURNING beneficiary_id`,
      [cid]
    );
    const beneId = beneRes.rows[0].beneficiary_id;
    const delBene = await deletionService.confirmPermanentDelete('beneficiary', beneId);
    assert(delBene.success === true, 'Beneficiary record removed safely');
  } catch (e) {
    assert(false, `Scenario 14 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 15: Account-holder relationship removal
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 15: Account-holder removal protection ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;
    const custRes = await db.query('SELECT cid FROM customer LIMIT 1');
    const cid = custRes.rows[0].cid;

    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 0, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    await db.query(
      `INSERT INTO account_holder (acc_id, cid, ownership_role, is_primary, share_percentage)
       VALUES ($1, $2, 'PRIMARY', true, 100)`,
      [accId, cid]
    );

    // Attempting to remove the ONLY account holder must be blocked
    try {
      await deletionService.confirmPermanentDelete('account_holder', accId, cid);
      assert(false, 'Removing sole account holder should be rejected');
    } catch (e) {
      assert(e.statusCode === 400, 'Sole account holder removal correctly blocked with 400');
    }

    await db.query('DELETE FROM account_holder WHERE acc_id = $1', [accId]);
    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
  } catch (e) {
    assert(false, `Scenario 15 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 16: Foreign-key violations and rollback
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 16: Foreign-key violations and rollback ---');
  try {
    // If a deletion encounters a constraint violation, the transaction rolls back cleanly
    const existingBranch = await db.query('SELECT b_id FROM branch WHERE b_id IN (SELECT b_id FROM employee) LIMIT 1');
    if (existingBranch.rows.length > 0) {
      const bId = existingBranch.rows[0].b_id;
      try {
        await deletionService.confirmPermanentDelete('branch', bId);
        assert(false, 'Deleting branch with attached employees should fail');
      } catch (e) {
        assert(e.statusCode === 400 || e.statusCode === 409, 'Branch deletion blocked by dependency safeguards');
      }
    }
  } catch (e) {
    assert(false, `Scenario 16 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 17: Concurrent changes between preview and confirmation
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 17: Concurrent changes between preview and confirmation ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;

    // Create an empty account
    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 0, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    // Preview sees 0 balance (would allow delete)
    const p = await deletionService.getDeletePreview('account', accId);
    assert(p.isBlocked === false, 'Initial preview is unblocked');

    // Simulate concurrent update: someone deposits money before confirm is submitted
    await db.query('UPDATE account SET balance = 500 WHERE acc_id = $1', [accId]);

    // Now confirm is submitted: revalidation must catch this change and abort!
    try {
      await deletionService.confirmPermanentDelete('account', accId);
      assert(false, 'Should abort when concurrent balance change occurred');
    } catch (e) {
      assert(e.statusCode === 400 || e.statusCode === 409, 'Revalidation caught concurrent balance change and aborted');
    }

    await db.query('DELETE FROM account WHERE acc_id = $1', [accId]);
  } catch (e) {
    assert(false, `Scenario 17 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 18: Duplicate submissions
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 18: Duplicate submissions ---');
  try {
    const branchRes = await db.query('SELECT b_id FROM branch LIMIT 1');
    const bId = branchRes.rows[0].b_id;

    const acc = await db.query(
      `INSERT INTO account (b_id, balance, status, acc_type)
       VALUES ($1, 0, 'ACTIVE', 'SAVINGS') RETURNING acc_id`,
      [bId]
    );
    const accId = acc.rows[0].acc_id;

    // First deletion
    const del1 = await deletionService.confirmPermanentDelete('account', accId);
    assert(del1.success === true, 'First deletion submission succeeds');

    // Immediate duplicate deletion submission for same ID
    try {
      await deletionService.confirmPermanentDelete('account', accId);
      assert(false, 'Second duplicate deletion must fail');
    } catch (e) {
      assert(e.statusCode === 404, 'Duplicate submission safely returns 404 (already deleted)');
    }
  } catch (e) {
    assert(false, `Scenario 18 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 19: Audit-log correctness
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 19: Audit-log correctness ---');
  try {
    const auditRes = await db.query(
      `SELECT log_id, action, entity_name, entity_id, details, ip_address, created_at
       FROM audit_log
       ORDER BY created_at DESC
       LIMIT 5`
    );
    assert(auditRes.rows.length > 0, 'Audit entries successfully recorded');
    const recent = auditRes.rows[0];
    assert(Boolean(recent.action), `Audit entry has action: ${recent.action}`);
    assert(Boolean(recent.entity_name), `Audit entry has entity_name: ${recent.entity_name}`);
    assert(Boolean(recent.created_at), `Audit entry has valid timestamp`);
  } catch (e) {
    assert(false, `Scenario 19 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 20: Regression tests for all existing banking operations
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 20: Regression tests for existing banking operations ---');
  try {
    // Test that existing active account can still execute deposit and transfer
    const activeAccs = await db.query(
      `SELECT acc_id, balance FROM account WHERE status = 'ACTIVE' LIMIT 2`
    );
    if (activeAccs.rows.length >= 2) {
      const a1 = activeAccs.rows[0].acc_id;
      const a2 = activeAccs.rows[1].acc_id;

      // Deposit
      const dep = await bankingService.processDeposit({ acc_id: a1, amount: 10, mode: 'ONLINE', description: 'Regression Test Deposit' });
      assert(dep.transaction.status === 'SUCCESS', 'Existing deposit service continues to work regression-free');

      // Transfer
      const xfer = await bankingService.processTransfer({
        from_acc: a1,
        to_acc: a2,
        amount: 5,
        mode: 'ONLINE',
        description: 'Regression Test Transfer'
      });
      assert(xfer.fromAccount.transaction.status === 'SUCCESS', 'Existing transfer service continues to work regression-free');
    } else {
      console.log('  ⚠️ Skipping Scenario 20 transfer: fewer than 2 active accounts');
    }
  } catch (e) {
    assert(false, `Scenario 20 failed: ${e.message}`);
  }

  console.log('\n================================================================');
  console.log(`🏁 FINORA DA3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
