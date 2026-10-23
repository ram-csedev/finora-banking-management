/**
 * Banking Operations Service
 * Handles atomic deposits, withdrawals, transfers, and loan payments
 * with automatic CockroachDB serializable retry handling (SQLSTATE 40001).
 */
const { executeTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('./auditService');

/**
 * Atomic Deposit
 */
async function processDeposit({ acc_id, amount, mode = 'ONLINE', description = null, emp_id = null, ipAddress = null }) {
  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    throw new AppError('Deposit amount must be a positive number.', 400);
  }

  const accountId = parseInt(acc_id, 10);
  if (isNaN(accountId)) {
    throw new AppError('Invalid account ID format.', 400);
  }

  return await executeTransaction(async (client) => {
    // 1. Validate Account
    const accRes = await client.query(`
      SELECT acc_id, balance, status, acc_type
      FROM account
      WHERE acc_id = $1
    `, [accountId]);

    if (accRes.rows.length === 0) {
      throw new AppError(`Account ID ${accountId} not found.`, 404);
    }

    const account = accRes.rows[0];
    if (account.status !== 'ACTIVE') {
      throw new AppError(`Account is ${account.status}. Deposits can only be made into ACTIVE accounts.`, 400);
    }

    // 2. Increment Balance
    const updateRes = await client.query(`
      UPDATE account
      SET balance = balance + $1
      WHERE acc_id = $2
      RETURNING acc_id, balance, status, acc_type
    `, [depositAmount, accountId]);

    const updatedAccount = updateRes.rows[0];

    // 3. Record Transaction Ledger Entry
    const transDesc = description || `Deposit via ${mode}`;
    const transRes = await client.query(`
      INSERT INTO "transaction" (acc_id, type, amount, mode, status, description, processed_by_emp_id)
      VALUES ($1, 'DEPOSIT', $2, $3, 'SUCCESS', $4, $5)
      RETURNING *
    `, [accountId, depositAmount, mode, transDesc, emp_id]);

    const transaction = transRes.rows[0];

    // 4. Record Audit Log
    await recordAudit({
      client,
      empId: emp_id,
      actorType: emp_id ? 'EMPLOYEE' : 'CUSTOMER',
      actorId: emp_id || accountId,
      action: 'DEPOSIT',
      entityName: 'ACCOUNT',
      entityId: String(accountId),
      details: {
        transaction_id: transaction.t_id,
        amount: depositAmount,
        previous_balance: parseFloat(account.balance),
        new_balance: parseFloat(updatedAccount.balance),
        mode
      },
      ipAddress
    });

    return {
      message: 'Deposit successful.',
      account: updatedAccount,
      transaction
    };
  });
}

/**
 * Atomic Withdrawal
 */
async function processWithdrawal({ acc_id, amount, mode = 'ATM', description = null, emp_id = null, ipAddress = null }) {
  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    throw new AppError('Withdrawal amount must be a positive number.', 400);
  }

  const accountId = parseInt(acc_id, 10);
  if (isNaN(accountId)) {
    throw new AppError('Invalid account ID format.', 400);
  }

  return await executeTransaction(async (client) => {
    // 1. Fetch & Check Account
    const accRes = await client.query(`
      SELECT acc_id, balance, status, acc_type
      FROM account
      WHERE acc_id = $1
    `, [accountId]);

    if (accRes.rows.length === 0) {
      throw new AppError(`Account ID ${accountId} not found.`, 404);
    }

    const account = accRes.rows[0];
    if (account.status !== 'ACTIVE') {
      throw new AppError(`Account is ${account.status}. Withdrawals can only be made from ACTIVE accounts.`, 400);
    }

    const currentBalance = parseFloat(account.balance);
    if (currentBalance < withdrawAmount) {
      throw new AppError('Insufficient balance for withdrawal.', 400, {
        availableBalance: currentBalance,
        requestedAmount: withdrawAmount
      });
    }

    // 2. Decrement Balance
    const updateRes = await client.query(`
      UPDATE account
      SET balance = balance - $1
      WHERE acc_id = $2
      RETURNING acc_id, balance, status, acc_type
    `, [withdrawAmount, accountId]);

    const updatedAccount = updateRes.rows[0];

    // 3. Record Transaction
    const transDesc = description || `Withdrawal via ${mode}`;
    const transRes = await client.query(`
      INSERT INTO "transaction" (acc_id, type, amount, mode, status, description, processed_by_emp_id)
      VALUES ($1, 'WITHDRAWAL', $2, $3, 'SUCCESS', $4, $5)
      RETURNING *
    `, [accountId, withdrawAmount, mode, transDesc, emp_id]);

    const transaction = transRes.rows[0];

    // 4. Record Audit Log
    await recordAudit({
      client,
      empId: emp_id,
      actorType: emp_id ? 'EMPLOYEE' : 'CUSTOMER',
      actorId: emp_id || accountId,
      action: 'WITHDRAWAL',
      entityName: 'ACCOUNT',
      entityId: String(accountId),
      details: {
        transaction_id: transaction.t_id,
        amount: withdrawAmount,
        previous_balance: currentBalance,
        new_balance: parseFloat(updatedAccount.balance),
        mode
      },
      ipAddress
    });

    return {
      message: 'Withdrawal successful.',
      account: updatedAccount,
      transaction
    };
  });
}

/**
 * Atomic Inter-Account Transfer with Bilaterally Linked Transaction Entries
 */
async function processTransfer({ from_acc, to_acc, amount, mode = 'ONLINE', description = null, emp_id = null, ipAddress = null }) {
  const transferAmount = parseFloat(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    throw new AppError('Transfer amount must be a positive number.', 400);
  }

  const fromAccId = parseInt(from_acc, 10);
  const toAccId = parseInt(to_acc, 10);

  if (isNaN(fromAccId) || isNaN(toAccId)) {
    throw new AppError('Source and destination account IDs must be valid numbers.', 400);
  }

  if (fromAccId === toAccId) {
    throw new AppError('Source and destination accounts cannot be identical.', 400);
  }

  return await executeTransaction(async (client) => {
    // 1. Fetch both accounts in a deterministic order to prevent deadlocks
    const firstId = Math.min(fromAccId, toAccId);
    const secondId = Math.max(fromAccId, toAccId);

    const accountsRes = await client.query(`
      SELECT acc_id, balance, status, acc_type
      FROM account
      WHERE acc_id IN ($1, $2)
      ORDER BY acc_id ASC
    `, [firstId, secondId]);

    const source = accountsRes.rows.find((a) => a.acc_id === String(fromAccId) || a.acc_id === fromAccId);
    const destination = accountsRes.rows.find((a) => a.acc_id === String(toAccId) || a.acc_id === toAccId);

    if (!source) {
      throw new AppError(`Source account ID ${fromAccId} not found.`, 404);
    }
    if (!destination) {
      throw new AppError(`Destination account ID ${toAccId} not found.`, 404);
    }

    if (source.status !== 'ACTIVE') {
      throw new AppError(`Source account is ${source.status}. Transfer cannot proceed.`, 400);
    }
    if (destination.status !== 'ACTIVE') {
      throw new AppError(`Destination account is ${destination.status}. Transfer cannot proceed.`, 400);
    }

    const sourceBal = parseFloat(source.balance);
    if (sourceBal < transferAmount) {
      throw new AppError('Insufficient funds for transfer.', 400, {
        availableBalance: sourceBal,
        transferAmount
      });
    }

    // 2. Perform Atomic Balance Adjustments
    const debitRes = await client.query(`
      UPDATE account SET balance = balance - $1 WHERE acc_id = $2 RETURNING balance
    `, [transferAmount, fromAccId]);

    const creditRes = await client.query(`
      UPDATE account SET balance = balance + $1 WHERE acc_id = $2 RETURNING balance
    `, [transferAmount, toAccId]);

    // 3. Create Linked Transaction Entries
    const leg1Desc = description || `Transfer to Account ${toAccId}`;
    const leg2Desc = description || `Transfer received from Account ${fromAccId}`;

    // Leg 1 (Debit / Outflow)
    const leg1Res = await client.query(`
      INSERT INTO "transaction" (acc_id, type, amount, mode, status, related_acc_id, description, processed_by_emp_id)
      VALUES ($1, 'TRANSFER', $2, $3, 'SUCCESS', $4, $5, $6)
      RETURNING *
    `, [fromAccId, transferAmount, mode, toAccId, leg1Desc, emp_id]);
    const leg1 = leg1Res.rows[0];

    // Leg 2 (Credit / Inflow) - directly linked to Leg 1
    const leg2Res = await client.query(`
      INSERT INTO "transaction" (acc_id, type, amount, mode, status, related_acc_id, related_trans_id, description, processed_by_emp_id)
      VALUES ($1, 'TRANSFER', $2, $3, 'SUCCESS', $4, $5, $6, $7)
      RETURNING *
    `, [toAccId, transferAmount, mode, fromAccId, leg1.t_id, leg2Desc, emp_id]);
    const leg2 = leg2Res.rows[0];

    // Symmetrically back-link Leg 1 to Leg 2
    await client.query(`
      UPDATE "transaction" SET related_trans_id = $1 WHERE t_id = $2
    `, [leg2.t_id, leg1.t_id]);
    leg1.related_trans_id = leg2.t_id;

    // 4. Record Audit Log
    await recordAudit({
      client,
      empId: emp_id,
      actorType: emp_id ? 'EMPLOYEE' : 'CUSTOMER',
      actorId: emp_id || fromAccId,
      action: 'TRANSFER_FUNDS',
      entityName: 'TRANSACTION',
      entityId: `${leg1.t_id}-${leg2.t_id}`,
      details: {
        from_acc: fromAccId,
        to_acc: toAccId,
        amount: transferAmount,
        source_new_balance: parseFloat(debitRes.rows[0].balance),
        dest_new_balance: parseFloat(creditRes.rows[0].balance),
        leg1_tid: leg1.t_id,
        leg2_tid: leg2.t_id
      },
      ipAddress
    });

    return {
      message: 'Transfer completed successfully.',
      transferAmount,
      fromAccount: {
        acc_id: fromAccId,
        balance: parseFloat(debitRes.rows[0].balance),
        transaction: leg1
      },
      toAccount: {
        acc_id: toAccId,
        balance: parseFloat(creditRes.rows[0].balance),
        transaction: leg2
      }
    };
  });
}

/**
 * Record Loan Repayment Installment
 */
async function processLoanPayment({ l_id, amount, principal_amount, interest_amount, payment_mode = 'ONLINE', remarks = null, emp_id = null, ipAddress = null }) {
  const totalAmount = parseFloat(amount);
  const principal = parseFloat(principal_amount);
  const interest = parseFloat(interest_amount);

  if (isNaN(totalAmount) || totalAmount <= 0) {
    throw new AppError('Total payment amount must be a positive number.', 400);
  }
  if (isNaN(principal) || principal < 0) {
    throw new AppError('Principal amount cannot be negative.', 400);
  }
  if (isNaN(interest) || interest < 0) {
    throw new AppError('Interest amount cannot be negative.', 400);
  }

  // Component Arithmetic check
  if (Math.abs(totalAmount - (principal + interest)) > 0.01) {
    throw new AppError('Total payment amount must equal principal plus interest components.', 400, {
      providedAmount: totalAmount,
      sumComponents: principal + interest
    });
  }

  const loanId = parseInt(l_id, 10);
  if (isNaN(loanId)) {
    throw new AppError('Invalid loan ID format.', 400);
  }

  return await executeTransaction(async (client) => {
    // 1. Verify Loan Exists and is Active
    const loanRes = await client.query(`
      SELECT l_id, cid, l_type, amount, interest, term, status
      FROM loan
      WHERE l_id = $1
    `, [loanId]);

    if (loanRes.rows.length === 0) {
      throw new AppError(`Loan ID ${loanId} not found.`, 404);
    }

    const loan = loanRes.rows[0];
    if (loan.status !== 'ACTIVE') {
      throw new AppError(`Cannot accept repayment. Loan is in status: ${loan.status}`, 400);
    }

    // 2. Insert Payment Record
    const paymentRes = await client.query(`
      INSERT INTO loan_payment (l_id, amount, principal_amount, interest_amount, payment_mode, status, remarks)
      VALUES ($1, $2, $3, $4, $5, 'SUCCESS', $6)
      RETURNING *
    `, [loanId, totalAmount, principal, interest, payment_mode, remarks || 'EMI Repayment']);

    const payment = paymentRes.rows[0];

    // 3. Record Audit Log
    await recordAudit({
      client,
      empId: emp_id,
      actorType: emp_id ? 'EMPLOYEE' : 'CUSTOMER',
      actorId: emp_id || loan.cid,
      action: 'LOAN_REPAYMENT',
      entityName: 'LOAN_PAYMENT',
      entityId: String(payment.payment_id),
      details: {
        loan_id: loanId,
        customer_id: loan.cid,
        amount: totalAmount,
        principal,
        interest,
        payment_mode
      },
      ipAddress
    });

    return {
      message: 'Loan repayment recorded successfully.',
      payment,
      loan
    };
  });
}

module.exports = {
  processDeposit,
  processWithdrawal,
  processTransfer,
  processLoanPayment
};
