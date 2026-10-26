/**
 * Finora DA3 — Database Constraint & User-Friendly Error Handling Test Suite
 *
 * Verifies:
 *  1. Canonical value normalization (e.g. 'AUTO' -> 'CAR', 'UPI' -> 'ONLINE')
 *  2. CHECK constraint validation and user-friendly error messages (all categories)
 *  3. UNIQUE constraint enforcement and clear duplicate messages
 *  4. FOREIGN KEY constraint enforcement and parent-record guidance
 *  5. NOT NULL constraint violations and missing-field messages
 *  6. Valid create and update operations across audited entities
 *  7. Prevention of sensitive credential / SQL leakage in error responses
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const db = require('./config/db');
const entityService = require('./services/entityService');
const bankingService = require('./services/bankingService');
const { errorHandler } = require('./middleware/errorHandler');

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

// Mock Express response helper to invoke errorHandler directly
function mockErrorResponse(err) {
  let capturedStatus = 200;
  let capturedJson = null;

  const res = {
    status(s) {
      capturedStatus = s;
      return this;
    },
    json(j) {
      capturedJson = j;
      return this;
    }
  };

  errorHandler(err, {}, res, () => {});
  return { status: capturedStatus, body: capturedJson };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 FINORA DA3: DATABASE CONSTRAINT & ERROR HANDLING TEST SUITE');
  console.log('☁️  Database: CockroachDB Cloud (finora_da3)');
  console.log('================================================================\n');

  // Fetch valid test customer and branch
  const cRes = await db.query('SELECT cid FROM customer LIMIT 1');
  const testCid = cRes.rows[0].cid;
  const bRes = await db.query('SELECT b_id FROM branch LIMIT 1');
  const testBid = bRes.rows[0].b_id;

  // --------------------------------------------------------------------------
  // SECTION 1: CANONICAL VALUE NORMALIZATION & ALIAS MAPPINGS
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: CANONICAL VALUE NORMALIZATION & ALIAS MAPPINGS ---');
  let createdLoanId = null;
  try {
    // 1. Submit l_type: 'AUTO' -> should be mapped canonically to 'CAR'
    const autoLoan = await entityService.createEntity('loan', {
      cid: testCid,
      l_type: 'AUTO',
      amount: 450000,
      interest: 8.75,
      term: 60,
      status: 'ACTIVE'
    });
    assert(autoLoan.l_type === 'CAR', "Input 'AUTO' correctly mapped to canonical 'CAR'");
    createdLoanId = autoLoan.l_id;

    // Verify stored value in database
    const checkDb = await db.query('SELECT l_type FROM loan WHERE l_id = $1', [createdLoanId]);
    assert(checkDb.rows[0].l_type === 'CAR', "Database persists canonical 'CAR'");

    // 2. Submit l_type: 'AUTO LOAN' -> should map to 'CAR'
    const autoLoan2 = await entityService.createEntity('loan', {
      cid: testCid,
      l_type: 'AUTO LOAN',
      amount: 300000,
      interest: 9.0,
      term: 36,
      status: 'ACTIVE'
    });
    assert(autoLoan2.l_type === 'CAR', "Input 'AUTO LOAN' correctly mapped to canonical 'CAR'");
    await db.query('DELETE FROM loan WHERE l_id = $1', [autoLoan2.l_id]);

    // 3. Submit status: 'APPLIED' -> should map to 'PENDING'
    const pendingLoan = await entityService.createEntity('loan', {
      cid: testCid,
      l_type: 'PERSONAL',
      amount: 100000,
      interest: 11.5,
      term: 24,
      status: 'APPLIED'
    });
    assert(pendingLoan.status === 'PENDING', "Input 'APPLIED' correctly mapped to canonical 'PENDING'");
    await db.query('DELETE FROM loan WHERE l_id = $1', [pendingLoan.l_id]);

    // 4. Submit loan payment with payment_mode: 'UPI' -> maps to 'ONLINE'
    const paymentRes = await bankingService.processLoanPayment({
      l_id: createdLoanId,
      amount: 10000,
      principal_amount: 8000,
      interest_amount: 2000,
      payment_mode: 'UPI',
      remarks: 'UPI Payment Alias Test'
    });
    assert(paymentRes.payment.payment_mode === 'ONLINE', "Payment mode 'UPI' mapped to canonical 'ONLINE'");
    await db.query('DELETE FROM loan_payment WHERE payment_id = $1', [paymentRes.payment.payment_id]);
  } catch (e) {
    assert(false, `Section 1 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 2: CHECK CONSTRAINT VALIDATION & FRIENDLY ERROR MESSAGES
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: CHECK CONSTRAINT VALIDATION & FRIENDLY ERROR MESSAGES ---');

  // Test 2.1: Invalid Loan Category (chk_loan_type)
  try {
    try {
      await entityService.createEntity('loan', {
        cid: testCid,
        l_type: 'BOAT',
        amount: 200000,
        interest: 9.0,
        term: 24
      });
      assert(false, 'Should reject invalid loan category');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_LOAN_CATEGORY', 'Error code is INVALID_LOAN_CATEGORY');
      assert(resp.body.field === 'l_type', 'Error identifies field l_type');
      assert(resp.body.message.includes('Select Home, Car, Personal, Education, or Business Loan'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.1 failed: ${e.message}`);
  }

  // Test 2.2: Negative or Zero Loan Amount (chk_loan_amount)
  try {
    try {
      await entityService.createEntity('loan', {
        cid: testCid,
        l_type: 'CAR',
        amount: -50000,
        interest: 8.5,
        term: 36
      });
      assert(false, 'Should reject negative loan amount');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_LOAN_AMOUNT', 'Error code is INVALID_LOAN_AMOUNT');
      assert(resp.body.field === 'amount', 'Error identifies field amount');
      assert(resp.body.message.includes('Enter an amount greater than zero'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.2 failed: ${e.message}`);
  }

  // Test 2.3: Negative Loan Interest Rate (chk_loan_interest)
  try {
    try {
      await entityService.createEntity('loan', {
        cid: testCid,
        l_type: 'HOME',
        amount: 2000000,
        interest: -2.5,
        term: 180
      });
      assert(false, 'Should reject negative interest rate');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_LOAN_INTEREST', 'Error code is INVALID_LOAN_INTEREST');
      assert(resp.body.field === 'interest', 'Error identifies field interest');
      assert(resp.body.message.includes('non-negative interest rate'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.3 failed: ${e.message}`);
  }

  // Test 2.4: Zero Loan Term Duration (chk_loan_term)
  try {
    try {
      await entityService.createEntity('loan', {
        cid: testCid,
        l_type: 'HOME',
        amount: 1000000,
        interest: 8.5,
        term: 0
      });
      assert(false, 'Should reject zero loan term');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_LOAN_TERM', 'Error code is INVALID_LOAN_TERM');
      assert(resp.body.field === 'term', 'Error identifies field term');
      assert(resp.body.message.includes('greater than zero months'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.4 failed: ${e.message}`);
  }

  // Test 2.5: Negative Account Balance (chk_account_balance)
  try {
    try {
      await entityService.createEntity('account', {
        b_id: testBid,
        acc_type: 'SAVINGS',
        balance: -500
      });
      assert(false, 'Should reject negative account balance');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_ACCOUNT_BALANCE', 'Error code is INVALID_ACCOUNT_BALANCE');
      assert(resp.body.field === 'balance', 'Error identifies field balance');
      assert(resp.body.message.includes('negative account balance'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.5 failed: ${e.message}`);
  }

  // Test 2.6: Invalid Account Type (chk_account_type)
  try {
    try {
      await entityService.createEntity('account', {
        b_id: testBid,
        acc_type: 'CRYPTO',
        balance: 1000
      });
      assert(false, 'Should reject invalid account type');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_ACCOUNT_TYPE', 'Error code is INVALID_ACCOUNT_TYPE');
      assert(resp.body.field === 'acc_type', 'Error identifies field acc_type');
      assert(resp.body.message.includes('Select Savings, Current, Salary, or Fixed Deposit'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.6 failed: ${e.message}`);
  }

  // Test 2.7: Invalid Credit Card Network Type (chk_creditcard_type)
  try {
    const cardNum = '5999' + Math.floor(100000000000 + Math.random() * 900000000000);
    try {
      await entityService.createEntity('creditcard', {
        pno: cardNum,
        cid: testCid,
        type: 'DISCOVER',
        card_limit: 50000,
        expiry: '2028-12-31'
      });
      assert(false, 'Should reject invalid credit card network');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_CARD_TYPE', 'Error code is INVALID_CARD_TYPE');
      assert(resp.body.field === 'type', 'Error identifies field type');
      assert(resp.body.message.includes('Select Visa, Mastercard, RuPay, or American Express'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.7 failed: ${e.message}`);
  }

  // Test 2.8: Invalid Ownership Share Percentage (chk_share_percentage)
  try {
    try {
      await entityService.createEntity('account_holder', {
        acc_id: 401,
        cid: testCid,
        ownership_role: 'JOINT',
        is_primary: false,
        share_percentage: 125
      });
      assert(false, 'Should reject share percentage > 100%');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_SHARE_PERCENTAGE', 'Error code is INVALID_SHARE_PERCENTAGE');
      assert(resp.body.field === 'share_percentage', 'Error identifies field share_percentage');
      assert(resp.body.message.includes('between 0% and 100%'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.8 failed: ${e.message}`);
  }

  // Test 2.9: Loan Payment Arithmetic Mismatch (chk_payment_components)
  try {
    try {
      await bankingService.processLoanPayment({
        l_id: createdLoanId,
        amount: 15000,
        principal_amount: 10000,
        interest_amount: 2000, // Sum = 12000 != 15000
        payment_mode: 'ONLINE'
      });
      assert(false, 'Should reject component arithmetic mismatch');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'Rejection returned HTTP 400');
      assert(resp.body.code === 'INVALID_PAYMENT_COMPONENTS', 'Error code is INVALID_PAYMENT_COMPONENTS');
      assert(resp.body.message.includes('equal principal plus interest'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Test 2.9 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 3: UNIQUE CONSTRAINT VIOLATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: UNIQUE CONSTRAINT VIOLATIONS ---');
  try {
    // 3.1: Duplicate PAN
    const existingCust = await db.query('SELECT pan FROM customer LIMIT 1');
    const dupPan = existingCust.rows[0].pan;
    try {
      await entityService.createEntity('customer', {
        pan: dupPan,
        first_name: 'Duplicate',
        last_name: 'User',
        email: 'dup@test.com'
      });
      assert(false, 'Should reject duplicate PAN');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 409, 'Duplicate rejection returned HTTP 409');
      assert(resp.body.code === 'DUPLICATE_PAN', 'Error code is DUPLICATE_PAN');
      assert(resp.body.field === 'pan', 'Identifies field pan');
      assert(resp.body.message.includes('Permanent Account Number (PAN) already exists'), `User-friendly message: "${resp.body.message}"`);
    }

    // 3.2: Duplicate IFSC
    const existingBranch = await db.query('SELECT ifsc FROM branch LIMIT 1');
    const dupIfsc = existingBranch.rows[0].ifsc;
    try {
      await entityService.createEntity('branch', {
        branch_name: 'Duplicate Branch',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        ifsc: dupIfsc,
        contact: '9999999999'
      });
      assert(false, 'Should reject duplicate IFSC');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 409, 'Duplicate rejection returned HTTP 409');
      assert(resp.body.code === 'DUPLICATE_IFSC', 'Error code is DUPLICATE_IFSC');
      assert(resp.body.field === 'ifsc', 'Identifies field ifsc');
      assert(resp.body.message.includes('IFSC code already exists'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Section 3 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 4: FOREIGN KEY VIOLATIONS & REFERENTIAL INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: FOREIGN KEY VIOLATIONS ---');
  try {
    // 4.1: Originating loan with non-existent customer ID
    try {
      await db.query(`
        INSERT INTO loan (cid, l_type, amount, interest, term, status)
        VALUES (888888888, 'CAR', 300000, 8.5, 36, 'ACTIVE')
      `);
      assert(false, 'Should reject non-existent customer reference');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400 || resp.status === 409, 'Rejection returned HTTP 400/409');
      assert(resp.body.code === 'INVALID_CUSTOMER_REFERENCE', 'Error code is INVALID_CUSTOMER_REFERENCE');
      assert(resp.body.field === 'cid', 'Identifies foreign key field cid');
      assert(resp.body.message.includes('customer does not exist'), `User-friendly message: "${resp.body.message}"`);
    }

    // 4.2: Creating account with non-existent branch ID
    try {
      await db.query(`
        INSERT INTO account (b_id, balance, status, acc_type)
        VALUES (888888888, 5000, 'ACTIVE', 'SAVINGS')
      `);
      assert(false, 'Should reject non-existent branch reference');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400 || resp.status === 409, 'Rejection returned HTTP 400/409');
      assert(resp.body.code === 'INVALID_BRANCH_REFERENCE', 'Error code is INVALID_BRANCH_REFERENCE');
      assert(resp.body.field === 'b_id', 'Identifies foreign key field b_id');
      assert(resp.body.message.includes('branch does not exist'), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Section 4 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 5: NOT NULL CONSTRAINT VIOLATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: NOT NULL VIOLATIONS ---');
  try {
    try {
      // Omit mandatory column 'term' in raw SQL insert
      await db.query(`
        INSERT INTO loan (cid, l_type, amount, interest)
        VALUES ($1, 'HOME', 1000000, 8.5)
      `, [testCid]);
      assert(false, 'Should reject missing term column');
    } catch (err) {
      const resp = mockErrorResponse(err);
      assert(resp.status === 400, 'NOT NULL rejection returned HTTP 400');
      assert(resp.body.code === 'MISSING_REQUIRED_FIELD', 'Error code is MISSING_REQUIRED_FIELD');
      assert(resp.body.field === 'term', 'Identifies missing field term');
      assert(resp.body.message.includes("A required field 'term' is missing"), `User-friendly message: "${resp.body.message}"`);
    }
  } catch (e) {
    assert(false, `Section 5 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 6: VALID CREATE & UPDATE OPERATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: VALID CREATE & UPDATE OPERATIONS ---');
  try {
    // 6.1: Valid loan update
    const updatedLoan = await entityService.updateEntity('loan', createdLoanId, {
      interest: 9.25,
      term: 72,
      status: 'ACTIVE'
    });
    assert(parseFloat(updatedLoan.interest) === 9.25, 'Loan interest updated successfully');
    assert(parseInt(updatedLoan.term, 10) === 72, 'Loan term updated successfully');

    // 6.2: Valid branch update
    const updatedBranch = await entityService.updateEntity('branch', testBid, {
      status: 'ACTIVE'
    });
    assert(updatedBranch.status === 'ACTIVE', 'Branch status updated successfully');
  } catch (e) {
    assert(false, `Section 6 failed: ${e.message}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 7: SECURITY & SENSITIVE INFORMATION PROTECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: SECURITY & DATA PROTECTION ---');
  try {
    // Generate an unexpected internal error
    const simulatedError = new Error('Database password failed for user root@cockroach-cloud-internal-cluster.us-east-1');
    const resp = mockErrorResponse(simulatedError);

    assert(resp.status === 500, 'Unexpected error returns HTTP 500');
    assert(resp.body.code === 'INTERNAL_SERVER_ERROR', 'Error code is generic INTERNAL_SERVER_ERROR');
    assert(!resp.body.message.includes('password'), 'Database password scrubbed from client response');
    assert(!resp.body.message.includes('cockroach-cloud'), 'Internal cluster host scrubbed from client response');
    assert(resp.body.message.includes('internal server error occurred'), 'Safe generic message returned');
  } catch (e) {
    assert(false, `Section 7 failed: ${e.message}`);
  }

  // Clean up test loan
  if (createdLoanId) {
    await db.query('DELETE FROM loan WHERE l_id = $1', [createdLoanId]);
  }

  console.log('\n================================================================');
  console.log(`🏁 CONSTRAINT & ERROR HANDLING SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
