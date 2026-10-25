/**
 * Finora DA3 - Deletion & Lifecycle Management Service
 * Targets CockroachDB Cloud (finora_da3)
 * Provides comprehensive deletion dependency previews, atomic execution,
 * referential integrity protection, and banking lifecycle state changes.
 */
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('./auditService');

// Entities where deletion is strictly forbidden
const IMMUTABLE_FINANCIAL_ENTITIES = new Set([
  'transaction',
  'loan_payment',
  'audit_log'
]);

// Plural to singular normalization mapping
const ENTITY_ALIASES = {
  customers: 'customer',
  customer: 'customer',
  accounts: 'account',
  account: 'account',
  creditcards: 'creditcard',
  creditcard: 'creditcard',
  loans: 'loan',
  loan: 'loan',
  employees: 'employee',
  employee: 'employee',
  branches: 'branch',
  branch: 'branch',
  nominees: 'nominee',
  nominee: 'nominee',
  'customer-phones': 'customer_phone',
  customer_phone: 'customer_phone',
  beneficiaries: 'beneficiary',
  beneficiary: 'beneficiary',
  'account-holders': 'account_holder',
  'responsible-for': 'responsible_for',
  'responsible_for': 'responsible_for',
  'responsible-fors': 'responsible_for',
  'responsible_fors': 'responsible_for',
  responsibilities: 'responsible_for',
  responsibility: 'responsible_for',
  account_holder: 'account_holder',
  transactions: 'transaction',
  transaction: 'transaction',
  'loan-payments': 'loan_payment',
  loan_payments: 'loan_payment',
  loan_payment: 'loan_payment',
  'audit-logs': 'audit_log',
  audit_logs: 'audit_log',
  audit_log: 'audit_log'
};

function normalizeEntity(name) {
  const norm = String(name || '').toLowerCase().trim();
  return ENTITY_ALIASES[norm] || norm;
}

/**
 * ----------------------------------------------------------------------------
 * 1. DELETION PREVIEW
 * Computes live CockroachDB dependencies without modifying data.
 * ----------------------------------------------------------------------------
 */
async function getDeletePreview(entityInput, id, extraParam = null) {
  const entity = normalizeEntity(entityInput);

  if (IMMUTABLE_FINANCIAL_ENTITIES.has(entity)) {
    throw new AppError(
      `Financial record '${entity}' is permanent, immutable, and strictly protected from deletion. Ledger records cannot be removed.`,
      403
    );
  }

  switch (entity) {
    case 'account':
      return await getAccountPreview(id);
    case 'customer':
      return await getCustomerPreview(id);
    case 'creditcard':
      return await getCreditCardPreview(id);
    case 'loan':
      return await getLoanPreview(id);
    case 'employee':
      return await getEmployeePreview(id);
    case 'branch':
      return await getBranchPreview(id);
    case 'nominee':
      return await getNomineePreview(id);
    case 'beneficiary':
      return await getBeneficiaryPreview(id);
    case 'customer_phone':
      return await getCustomerPhonePreview(id, extraParam);
    case 'account_holder':
      return await getAccountHolderPreview(id, extraParam);
    case 'responsible_for':
      return await getResponsibleForPreview(id);
    default:
      throw new AppError(`Entity '${entity}' is not configured for deletion preview.`, 400);
  }
}

/**
 * Account Deletion Preview
 */
async function getAccountPreview(accId, client = null) {
  const executor = client || db;

  const accRes = await executor.query(
    `SELECT acc_id, b_id, balance, status, acc_type, created_at FROM account WHERE acc_id = $1`,
    [accId]
  );
  if (accRes.rows.length === 0) {
    throw new AppError(`Account #${accId} not found.`, 404);
  }
  const acc = accRes.rows[0];
  const balance = parseFloat(acc.balance);

  // Query live dependencies in a single round-trip
  const depRes = await executor.query(
    `SELECT
      (SELECT count(*) FROM account_holder WHERE acc_id = $1) as holder_count,
      (SELECT count(*) FROM nominee WHERE acc_id = $1) as nom_count,
      (SELECT count(*) FROM "transaction" WHERE acc_id = $1) as tx_count,
      (SELECT count(*) FROM beneficiary WHERE internal_acc_id = $1) as bene_count`,
    [accId]
  );
  const dep = depRes.rows[0];
  const holderCount = parseInt(dep.holder_count, 10) || 0;
  const nomCount = parseInt(dep.nom_count, 10) || 0;
  const txCount = parseInt(dep.tx_count, 10) || 0;
  const beneCount = parseInt(dep.bene_count, 10) || 0;

  const hasProtectedHistory = txCount > 0 || balance > 0;
  const financialProtectionReasons = [];
  if (txCount > 0) {
    financialProtectionReasons.push(`${txCount} historical ledger transaction(s)`);
  }
  if (balance > 0) {
    financialProtectionReasons.push(`an active ledger balance of ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }
  const financialProtectionReason = hasProtectedHistory
    ? `Account has ${financialProtectionReasons.join(' and ')}.`
    : null;

  const consequenceWarning = hasProtectedHistory
    ? `Permanently deleting this account will cascade and delete all associated historical ledger transactions (${txCount} transaction${txCount === 1 ? '' : 's'}) and active ledger balance (₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}). External beneficiary links will be severed and nominee registrations will be removed.`
    : `Permanently deleting this account will remove its record, nominee registrations, and customer ownership links.`;

  const recordsToDelete = [
    { label: 'Account Record', count: 1, description: 'Primary account record' },
    { label: 'Nominee Registrations', count: nomCount, description: 'Nominees assigned to this account (CASCADE)' }
  ];
  if (txCount > 0) {
    recordsToDelete.push({
      label: 'Historical Ledger Transactions',
      count: txCount,
      description: 'Historical transactions will be permanently deleted with this account'
    });
  }

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    },
    {
      action: 'close_account',
      label: 'Close Account',
      variant: 'warning',
      enabled: balance === 0 && acc.status !== 'CLOSED',
      disabledReason:
        balance > 0
          ? `Balance must be zero before closing. Current balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
          : acc.status === 'CLOSED'
          ? 'Account is already closed.'
          : null
    }
  ];

  if (acc.status === 'CLOSED') {
    allowedActions.push({
      action: 'reopen_account',
      label: 'Reopen Account',
      variant: 'success',
      enabled: true,
      disabledReason: null
    });
  }

  return {
    entityType: 'account',
    entityId: String(accId),
    entityTitle: `Account #${accId} (${acc.acc_type})`,
    target: acc,
    isBlocked: false,
    hasProtectedHistory,
    financialProtectionReason,
    consequenceWarning,
    blockReasons: [],
    impact: {
      recordsToDelete,
      relationshipsToRemove: [
        { label: 'Account Ownerships', count: holderCount, description: 'Customer ownership links (CASCADE)' }
      ],
      retainedRecords: [
        { label: 'External Beneficiary Links', count: beneCount, description: 'Destination links will be set to NULL; beneficiaries preserved' }
      ],
      protectedFinancialRecords: [
        {
          label: 'Ledger Transactions',
          count: txCount,
          description: txCount > 0
            ? `${txCount} historical ledger transaction(s) will be permanently deleted with this account`
            : 'No historical transactions'
        }
      ]
    },
    allowedActions
  };
}

/**
 * Customer Deletion Preview
 */
async function getCustomerPreview(cid, client = null) {
  const executor = client || db;

  const custRes = await executor.query(
    `SELECT cid, pan, first_name, last_name, email, city, state, status, created_at FROM customer WHERE cid = $1`,
    [cid]
  );
  if (custRes.rows.length === 0) {
    throw new AppError(`Customer #${cid} not found.`, 404);
  }
  const cust = custRes.rows[0];

  // Query live dependencies and obligations in a single round-trip
  const depRes = await executor.query(
    `SELECT
      (SELECT count(*) FROM account_holder WHERE cid = $1) as holder_count,
      (SELECT count(*) FROM loan WHERE cid = $1) as loan_count,
      (SELECT count(*) FROM creditcard WHERE cid = $1) as card_count,
      (SELECT count(*) FROM customer_phone WHERE cid = $1) as phone_count,
      (SELECT count(*) FROM beneficiary WHERE cid = $1) as bene_count,
      (SELECT count(*) FROM nominee WHERE cid = $1) as nom_count,
      (SELECT count(*) FROM loan WHERE cid = $1 AND status IN ('ACTIVE', 'APPROVED', 'PENDING')) as active_loan_count,
      (SELECT count(*) FROM creditcard WHERE cid = $1 AND status = 'ACTIVE') as active_card_count`,
    [cid]
  );
  const dep = depRes.rows[0];
  const holderCount = parseInt(dep.holder_count, 10) || 0;
  const loanCount = parseInt(dep.loan_count, 10) || 0;
  const cardCount = parseInt(dep.card_count, 10) || 0;
  const phoneCount = parseInt(dep.phone_count, 10) || 0;
  const beneCount = parseInt(dep.bene_count, 10) || 0;
  const nomCount = parseInt(dep.nom_count, 10) || 0;
  const activeLoanCount = parseInt(dep.active_loan_count, 10) || 0;
  const activeCardCount = parseInt(dep.active_card_count, 10) || 0;

  const hasProtectedHistory = holderCount > 0 || loanCount > 0 || cardCount > 0;
  const financialProtectionReasons = [];
  if (holderCount > 0) financialProtectionReasons.push(`${holderCount} active account relationship(s)`);
  if (loanCount > 0) financialProtectionReasons.push(`${loanCount} registered loan facility(ies)`);
  if (cardCount > 0) financialProtectionReasons.push(`${cardCount} registered credit card(s)`);
  const financialProtectionReason = hasProtectedHistory
    ? `Customer has ${financialProtectionReasons.join(', ')}.`
    : null;

  const consequenceWarning = hasProtectedHistory
    ? `Permanently deleting this customer profile will cascade and delete all registered credit cards (${cardCount}), loan facilities (${loanCount}) with their repayments, and sole-owned bank accounts (${holderCount} linked accounts). Joint account ownerships will be severed.`
    : `Permanently deleting this customer profile will remove contact phone numbers and saved beneficiaries.`;

  const recordsToDelete = [
    { label: 'Customer Profile', count: 1, description: 'Core customer record' },
    { label: 'Phone Numbers', count: phoneCount, description: 'Contact phone numbers (CASCADE)' },
    { label: 'Saved Beneficiaries', count: beneCount, description: 'Customer beneficiary entries (CASCADE)' }
  ];
  if (cardCount > 0) {
    recordsToDelete.push({
      label: 'Credit Cards',
      count: cardCount,
      description: 'Credit cards will be permanently deleted'
    });
  }
  if (loanCount > 0) {
    recordsToDelete.push({
      label: 'Loan Facilities',
      count: loanCount,
      description: 'Loan facilities and repayment installments will be permanently deleted'
    });
  }

  // Deactivation rules: permitted only if no active loans or active cards
  const canDeactivate = cust.status === 'ACTIVE' && activeLoanCount === 0 && activeCardCount === 0;
  let deactivateDisabledReason = null;
  if (cust.status !== 'ACTIVE') {
    deactivateDisabledReason = 'Customer is already inactive.';
  } else if (activeLoanCount > 0) {
    deactivateDisabledReason = `Cannot deactivate customer with ${activeLoanCount} active loan(s). Settle loans first.`;
  } else if (activeCardCount > 0) {
    deactivateDisabledReason = `Cannot deactivate customer with ${activeCardCount} active credit card(s). Cancel cards first.`;
  }

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    },
    {
      action: 'deactivate_customer',
      label: 'Deactivate Customer',
      variant: 'warning',
      enabled: canDeactivate,
      disabledReason: deactivateDisabledReason
    }
  ];

  if (cust.status === 'INACTIVE' || cust.status === 'SUSPENDED') {
    allowedActions.push({
      action: 'reactivate_customer',
      label: 'Reactivate Customer',
      variant: 'success',
      enabled: true,
      disabledReason: null
    });
  }

  return {
    entityType: 'customer',
    entityId: String(cid),
    entityTitle: `${cust.first_name} ${cust.last_name || ''} (#${cid})`,
    target: cust,
    isBlocked: false,
    hasProtectedHistory,
    financialProtectionReason,
    consequenceWarning,
    blockReasons: [],
    impact: {
      recordsToDelete,
      relationshipsToRemove: [
        { label: 'Nominee Linkages', count: nomCount, description: 'Nominee links to this customer (SET NULL)' },
        { label: 'Joint Account Ownerships', count: holderCount, description: 'Account ownership links severed' }
      ],
      retainedRecords: [
        { label: 'Joint Bank Accounts', count: holderCount, description: 'Bank accounts co-owned with other customers are preserved' }
      ],
      protectedFinancialRecords: [
        {
          label: 'Active Loan Facilities',
          count: loanCount,
          description: loanCount > 0
            ? `${loanCount} loan facility(ies) and repayments will be permanently deleted`
            : 'No active loans'
        },
        {
          label: 'Credit Card Accounts',
          count: cardCount,
          description: cardCount > 0
            ? `${cardCount} credit card(s) will be permanently deleted`
            : 'No credit cards'
        }
      ]
    },
    allowedActions
  };
}

/**
 * Credit Card Deletion Preview
 */
async function getCreditCardPreview(pno, client = null) {
  const executor = client || db;

  const cardRes = await executor.query(
    `SELECT pno, cid, type, card_limit, expiry, status, created_at FROM creditcard WHERE pno = $1`,
    [pno]
  );
  if (cardRes.rows.length === 0) {
    throw new AppError(`Credit Card #${pno} not found.`, 404);
  }
  const card = cardRes.rows[0];

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    }
  ];

  if (card.status === 'ACTIVE') {
    allowedActions.push(
      { action: 'block_card', label: 'Block Card', variant: 'warning', enabled: true, disabledReason: null },
      { action: 'close_card', label: 'Close Card', variant: 'danger', enabled: true, disabledReason: null }
    );
  } else if (card.status === 'BLOCKED') {
    allowedActions.push(
      { action: 'unblock_card', label: 'Unblock Card', variant: 'success', enabled: true, disabledReason: null },
      { action: 'close_card', label: 'Close Card', variant: 'danger', enabled: true, disabledReason: null }
    );
  } else if (card.status !== 'CANCELLED') {
    allowedActions.push({
      action: 'close_card',
      label: 'Close Card',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    });
  }

  return {
    entityType: 'creditcard',
    entityId: String(pno),
    entityTitle: `${card.type} Card •••• ${String(pno).slice(-4)}`,
    target: card,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning: 'Permanently deleting this credit card will remove the card contract and credentials. Customer profile and bank accounts will be retained.',
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Credit Card Record', count: 1, description: 'Card contract and credentials' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Customer Account', count: 1, description: 'Customer profile is preserved' }
      ],
      protectedFinancialRecords: []
    },
    allowedActions
  };
}

/**
 * Loan Deletion Preview
 */
async function getLoanPreview(lId, client = null) {
  const executor = client || db;

  const loanRes = await executor.query(
    `SELECT l_id, cid, l_type, amount, interest, term, start_date, status, assigned_emp_id, created_at FROM loan WHERE l_id = $1`,
    [lId]
  );
  if (loanRes.rows.length === 0) {
    throw new AppError(`Loan #${lId} not found.`, 404);
  }
  const loan = loanRes.rows[0];

  // Query repayment ledger and responsibilities in a single round-trip
  const depRes = await executor.query(
    `SELECT
      (SELECT count(*) FROM loan_payment WHERE l_id = $1 AND status = 'SUCCESS') as payment_count,
      (SELECT COALESCE(SUM(principal_amount), 0) FROM loan_payment WHERE l_id = $1 AND status = 'SUCCESS') as paid_principal,
      (SELECT COALESCE(SUM(amount), 0) FROM loan_payment WHERE l_id = $1 AND status = 'SUCCESS') as total_paid,
      (SELECT count(*) FROM responsible_for WHERE l_id = $1) as resp_count`,
    [lId]
  );
  const dep = depRes.rows[0];
  const paymentCount = parseInt(dep.payment_count, 10) || 0;
  const paidPrincipal = parseFloat(dep.paid_principal) || 0;
  const totalPaid = parseFloat(dep.total_paid) || 0;
  const respCount = parseInt(dep.resp_count, 10) || 0;
  const loanAmount = parseFloat(loan.amount);

  const remainingPrincipal = Math.max(0, loanAmount - paidPrincipal);

  const hasProtectedHistory = paymentCount > 0;
  const financialProtectionReason = hasProtectedHistory
    ? `Loan has ${paymentCount} recorded repayment installment(s) totaling ₹${totalPaid.toLocaleString('en-IN')}.`
    : null;

  const consequenceWarning = paymentCount > 0
    ? `Permanently deleting this loan agreement will cascade and delete all associated repayment installment records (${paymentCount} payment${paymentCount === 1 ? '' : 's'} totaling ₹${totalPaid.toLocaleString('en-IN')}). The borrower customer profile will be retained and officer responsibilities will be removed.`
    : `Permanently deleting this loan agreement will remove the loan facility. The borrower customer profile will be retained.`;

  const recordsToDelete = [
    { label: 'Loan Agreement Record', count: 1, description: 'Loan agreement' }
  ];
  if (paymentCount > 0) {
    recordsToDelete.push({
      label: 'Repayment Installments',
      count: paymentCount,
      description: 'Repayment installments will be permanently deleted with this loan agreement'
    });
  }

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    }
  ];

  if (loan.status !== 'PAID_OFF') {
    allowedActions.push({
      action: 'settle_loan',
      label: 'Settle Loan',
      variant: 'success',
      enabled: remainingPrincipal === 0 || loan.status === 'ACTIVE',
      disabledReason: null
    });
  }

  return {
    entityType: 'loan',
    entityId: String(lId),
    entityTitle: `${loan.l_type} Loan #${lId}`,
    target: {
      ...loan,
      paidPrincipal,
      totalPaid,
      remainingPrincipal
    },
    isBlocked: false,
    hasProtectedHistory,
    financialProtectionReason,
    consequenceWarning,
    blockReasons: [],
    impact: {
      recordsToDelete,
      relationshipsToRemove: [
        { label: 'Assigned Officer Responsibilities', count: respCount, description: 'Responsibility links (SET NULL)' }
      ],
      retainedRecords: [
        { label: 'Customer Profile', count: 1, description: 'Borrower customer record is retained' }
      ],
      protectedFinancialRecords: [
        {
          label: 'Repayment Installments',
          count: paymentCount,
          description: paymentCount > 0
            ? `${paymentCount} repayment installment(s) totaling ₹${totalPaid.toLocaleString('en-IN')} will be permanently deleted`
            : 'No recorded repayments'
        }
      ]
    },
    allowedActions
  };
}

/**
 * Employee Deletion Preview
 */
async function getEmployeePreview(empId, client = null) {
  const executor = client || db;

  const empRes = await executor.query(
    `SELECT emp_id, first_name, last_name, salary, hire_date, b_id, email, status, created_at FROM employee WHERE emp_id = $1`,
    [empId]
  );
  if (empRes.rows.length === 0) {
    throw new AppError(`Employee #${empId} not found.`, 404);
  }
  const emp = empRes.rows[0];

  // Query staff assignments and transactions in a single round-trip
  const depRes = await executor.query(
    `SELECT
      (SELECT count(*) FROM responsible_for WHERE emp_id = $1 AND status = 'ACTIVE') as active_resp_count,
      (SELECT count(*) FROM responsible_for WHERE emp_id = $1) as total_resp_count,
      (SELECT count(*) FROM customer WHERE emp_id = $1) as cust_count,
      (SELECT count(*) FROM loan WHERE assigned_emp_id = $1) as loan_count,
      (SELECT count(*) FROM "transaction" WHERE processed_by_emp_id = $1) as tx_count`,
    [empId]
  );
  const dep = depRes.rows[0];
  const activeRespCount = parseInt(dep.active_resp_count, 10) || 0;
  const totalRespCount = parseInt(dep.total_resp_count, 10) || 0;
  const custCount = parseInt(dep.cust_count, 10) || 0;
  const loanCount = parseInt(dep.loan_count, 10) || 0;
  const txCount = parseInt(dep.tx_count, 10) || 0;

  const consequenceWarning = `Deleting this staff member will remove their operational role assignments (${totalRespCount} assignment${totalRespCount === 1 ? '' : 's'}). Assigned customer, loan, and teller transaction records will be retained with officer links cleared.`;

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    },
    {
      action: 'deactivate_employee',
      label: 'Deactivate Employee',
      variant: 'warning',
      enabled: emp.status === 'ACTIVE',
      disabledReason: emp.status !== 'ACTIVE' ? 'Employee is not active.' : null
    }
  ];

  if (emp.status === 'INACTIVE' || emp.status === 'SUSPENDED' || emp.status === 'ON_LEAVE') {
    allowedActions.push({
      action: 'reactivate_employee',
      label: 'Reactivate Employee',
      variant: 'success',
      enabled: true,
      disabledReason: null
    });
  }

  return {
    entityType: 'employee',
    entityId: String(empId),
    entityTitle: `${emp.first_name} ${emp.last_name || ''} (Staff #${empId})`,
    target: emp,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning,
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Employee Record', count: 1, description: 'Staff directory record' }
      ],
      relationshipsToRemove: [
        { label: 'Role Responsibilities', count: totalRespCount, description: 'Role assignments removed' }
      ],
      retainedRecords: [
        { label: 'Assigned Customers', count: custCount, description: 'Manager links set to NULL; customers retained' },
        { label: 'Assigned Loans', count: loanCount, description: 'Officer links set to NULL; loans retained' }
      ],
      protectedFinancialRecords: [
        { label: 'Processed Transactions', count: txCount, description: 'Teller audit transactions retained with staff ID set to NULL' }
      ]
    },
    allowedActions
  };
}

/**
 * Branch Deletion Preview
 */
async function getBranchPreview(bId, client = null) {
  const executor = client || db;

  const branchRes = await executor.query(
    `SELECT b_id, branch_name, city, state, pincode, ifsc, contact, status, created_at FROM branch WHERE b_id = $1`,
    [bId]
  );
  if (branchRes.rows.length === 0) {
    throw new AppError(`Branch #${bId} not found.`, 404);
  }
  const branch = branchRes.rows[0];

  // Query branch dependencies in a single round-trip
  const depRes = await executor.query(
    `SELECT
      (SELECT count(*) FROM employee WHERE b_id = $1) as emp_count,
      (SELECT count(*) FROM account WHERE b_id = $1) as acc_count,
      (SELECT COALESCE(SUM(balance), 0) FROM account WHERE b_id = $1) as total_balance,
      (SELECT count(*) FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as tx_count,
      (SELECT COALESCE(SUM(amount), 0) FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as total_tx_amount,
      (SELECT count(*) FROM responsible_for WHERE b_id = $1 OR emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1) OR t_id IN (SELECT t_id FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1))) as resp_count,
      (SELECT count(*) FROM nominee WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as nom_count,
      (SELECT count(*) FROM account_holder WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as holder_count,
      (SELECT count(*) FROM beneficiary WHERE internal_acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as bene_link_count,
      (SELECT count(DISTINCT cid) FROM customer WHERE emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)) as managed_cust_count,
      (SELECT count(*) FROM loan WHERE assigned_emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)) as assigned_loan_count`,
    [bId]
  );
  const dep = depRes.rows[0];
  const empCount = parseInt(dep.emp_count, 10) || 0;
  const accCount = parseInt(dep.acc_count, 10) || 0;
  const totalBalance = parseFloat(dep.total_balance) || 0;
  const txCount = parseInt(dep.tx_count, 10) || 0;
  const totalTxAmount = parseFloat(dep.total_tx_amount) || 0;
  const respCount = parseInt(dep.resp_count, 10) || 0;
  const nomCount = parseInt(dep.nom_count, 10) || 0;
  const holderCount = parseInt(dep.holder_count, 10) || 0;
  const beneLinkCount = parseInt(dep.bene_link_count, 10) || 0;
  const managedCustCount = parseInt(dep.managed_cust_count, 10) || 0;
  const assignedLoanCount = parseInt(dep.assigned_loan_count, 10) || 0;

  // Branch permanent deletion is permitted regardless of dependencies
  const isBlocked = false;
  const blockReasons = [];

  const hasDependencies = empCount > 0 || accCount > 0 || respCount > 0 || txCount > 0;
  const consequenceWarning = hasDependencies
    ? 'Deleting this branch will permanently remove the branch and the dependent records listed below. This operation cannot be undone.'
    : 'Permanently deleting this branch will remove its directory entry and any associated supervisory duty links. This operation cannot be undone.';

  const recordsToDelete = [
    { label: 'Branch Record', count: 1, description: 'Core branch directory record' }
  ];
  if (empCount > 0) {
    recordsToDelete.push({
      label: 'Assigned Employees',
      count: empCount,
      description: 'Staff directory records assigned to this branch (CASCADE)'
    });
  }
  if (accCount > 0) {
    recordsToDelete.push({
      label: 'Domiciled Accounts',
      count: accCount,
      description: `Bank accounts domiciled at this branch totaling ₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (CASCADE)`
    });
  }
  if (nomCount > 0) {
    recordsToDelete.push({
      label: 'Nominee Registrations',
      count: nomCount,
      description: 'Nominees registered on domiciled accounts (CASCADE)'
    });
  }

  const relationshipsToRemove = [];
  if (respCount > 0) {
    relationshipsToRemove.push({
      label: 'Operational Assignments',
      count: respCount,
      description: 'Branch, staff, and transaction role duties (CASCADE)'
    });
  }
  if (holderCount > 0) {
    relationshipsToRemove.push({
      label: 'Account Ownerships',
      count: holderCount,
      description: 'Customer account ownership links (CASCADE)'
    });
  }

  const retainedRecords = [];
  if (managedCustCount > 0 || holderCount > 0) {
    retainedRecords.push({
      label: 'Customer Profiles',
      count: Math.max(managedCustCount, holderCount),
      description: 'Customer profiles are retained; staff relationship manager links set to NULL'
    });
  }
  if (assignedLoanCount > 0) {
    retainedRecords.push({
      label: 'Loan Facilities',
      count: assignedLoanCount,
      description: 'Loans and repayments are retained; officer assignment links set to NULL'
    });
  }
  if (beneLinkCount > 0) {
    retainedRecords.push({
      label: 'Beneficiary Links',
      count: beneLinkCount,
      description: 'Beneficiary payee records preserved; internal account links set to NULL'
    });
  }

  const protectedFinancialRecords = [];
  if (txCount > 0) {
    protectedFinancialRecords.push({
      label: 'Historical Ledger Transactions',
      count: txCount,
      description: `${txCount} historical transaction(s) totaling ₹${totalTxAmount.toLocaleString('en-IN')} will be permanently deleted with the branch accounts`
    });
  }

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: true,
      disabledReason: null
    },
    {
      action: 'deactivate_branch',
      label: 'Deactivate Branch',
      variant: 'warning',
      enabled: branch.status === 'ACTIVE',
      disabledReason: branch.status !== 'ACTIVE' ? 'Branch is already inactive.' : null
    }
  ];

  if (branch.status === 'INACTIVE' || branch.status === 'CLOSED') {
    allowedActions.push({
      action: 'reactivate_branch',
      label: 'Reactivate Branch',
      variant: 'success',
      enabled: true,
      disabledReason: null
    });
  }

  return {
    entityType: 'branch',
    entityId: String(bId),
    entityTitle: `${branch.branch_name} Branch (${branch.ifsc})`,
    target: branch,
    isBlocked: false,
    hasProtectedHistory: txCount > 0 || accCount > 0 || empCount > 0,
    financialProtectionReason: txCount > 0 ? `Branch accounts have ${txCount} historical transactions totaling ₹${totalTxAmount.toLocaleString('en-IN')}.` : null,
    consequenceWarning,
    blockReasons: [],
    impact: {
      recordsToDelete,
      relationshipsToRemove,
      retainedRecords,
      protectedFinancialRecords
    },
    allowedActions
  };
}

/**
 * Sub-resources previews
 */
async function getNomineePreview(nId, client = null) {
  const executor = client || db;
  const res = await executor.query(`SELECT * FROM nominee WHERE n_id = $1`, [nId]);
  if (res.rows.length === 0) throw new AppError(`Nominee #${nId} not found.`, 404);
  const nom = res.rows[0];

  return {
    entityType: 'nominee',
    entityId: String(nId),
    entityTitle: `Nominee: ${nom.first_name} ${nom.last_name || ''} (${nom.relationship})`,
    target: nom,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning: `Permanently deleting this nominee registration will remove it from Account #${nom.acc_id}. The account and customer records will be retained.`,
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Nominee Record', count: 1, description: 'Nominee registration for account' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Account', count: 1, description: `Account #${nom.acc_id} remains active` }
      ],
      protectedFinancialRecords: []
    },
    allowedActions: [
      { action: 'delete_permanent', label: 'Remove Nominee', variant: 'danger', enabled: true, disabledReason: null }
    ]
  };
}

async function getBeneficiaryPreview(beneId, client = null) {
  const executor = client || db;
  const res = await executor.query(`SELECT * FROM beneficiary WHERE beneficiary_id = $1`, [beneId]);
  if (res.rows.length === 0) throw new AppError(`Beneficiary #${beneId} not found.`, 404);
  const bene = res.rows[0];

  return {
    entityType: 'beneficiary',
    entityId: String(beneId),
    entityTitle: `Beneficiary: ${bene.beneficiary_name} (${bene.nickname})`,
    target: bene,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning: `Permanently deleting this beneficiary entry will remove payee credentials for '${bene.beneficiary_name}'. Customer profile and past transfer history will be retained.`,
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Beneficiary Entry', count: 1, description: 'Saved payee entry' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Customer Profile', count: 1, description: 'Customer profile retained' }
      ],
      protectedFinancialRecords: []
    },
    allowedActions: [
      { action: 'delete_permanent', label: 'Delete Beneficiary', variant: 'danger', enabled: true, disabledReason: null }
    ]
  };
}

async function getCustomerPhonePreview(cid, phone, client = null) {
  const executor = client || db;
  const res = await executor.query(`SELECT * FROM customer_phone WHERE cid = $1 AND phone = $2`, [cid, phone]);
  if (res.rows.length === 0) throw new AppError(`Phone '${phone}' for customer #${cid} not found.`, 404);
  const p = res.rows[0];

  return {
    entityType: 'customer_phone',
    entityId: `${cid}/${phone}`,
    entityTitle: `Phone: ${p.phone} (${p.phone_type})`,
    target: p,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning: `Removing phone number '${p.phone}' will delete it from Customer #${cid}'s contact records. Other contact methods and accounts will be retained.`,
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Phone Number', count: 1, description: 'Contact phone record' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Customer Profile', count: 1, description: 'Customer profile retained' }
      ],
      protectedFinancialRecords: []
    },
    allowedActions: [
      { action: 'delete_permanent', label: 'Delete Phone', variant: 'danger', enabled: true, disabledReason: null }
    ]
  };
}

async function getAccountHolderPreview(accId, cid, client = null) {
  const executor = client || db;
  const res = await executor.query(
    `SELECT * FROM account_holder WHERE acc_id = $1 AND cid = $2`,
    [accId, cid]
  );
  if (res.rows.length === 0) throw new AppError(`Holder link for account #${accId} and customer #${cid} not found.`, 404);
  const holder = res.rows[0];

  const countRes = await executor.query(
    `SELECT count(*) as count FROM account_holder WHERE acc_id = $1`,
    [accId]
  );
  const totalHolders = parseInt(countRes.rows[0].count, 10) || 0;

  const isBlocked = totalHolders <= 1;
  const blockReasons = isBlocked
    ? ['Cannot remove the only registered account holder. An account must retain at least one owner. Delete the account instead if you wish to close it.']
    : [];

  const consequenceWarning = isBlocked
    ? null
    : `Removing customer #${cid}'s ownership link will sever joint ownership on Account #${accId}. The account will remain active under the remaining registered owner(s).`;

  return {
    entityType: 'account_holder',
    entityId: `${accId}/${cid}`,
    entityTitle: `Ownership: Customer #${cid} on Account #${accId}`,
    target: holder,
    isBlocked,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning,
    blockReasons,
    impact: {
      recordsToDelete: [],
      relationshipsToRemove: [
        { label: 'Account Holder Link', count: 1, description: 'Joint/co-owner relationship severed' }
      ],
      retainedRecords: [
        { label: 'Account', count: 1, description: `Account #${accId} remains active` },
        { label: 'Customer Profile', count: 1, description: 'Customer profile remains active' }
      ],
      protectedFinancialRecords: []
    },
    allowedActions: [
      {
        action: 'delete_permanent',
        label: 'Remove Account Holder',
        variant: 'danger',
        enabled: !isBlocked,
        disabledReason: isBlocked ? blockReasons[0] : null
      }
    ]
  };
}

/**
 * Operational Duty Assignment Deletion Preview (responsible_for)
 */
async function getResponsibleForPreview(rfId, client = null) {
  const executor = client || db;
  const res = await executor.query(`SELECT * FROM responsible_for WHERE rf_id = $1`, [rfId]);
  if (res.rows.length === 0) throw new AppError(`Duty assignment #${rfId} not found.`, 404);
  const duty = res.rows[0];

  return {
    entityType: 'responsible_for',
    entityId: String(rfId),
    entityTitle: `Assignment #${rfId} (${duty.role_type})`,
    target: duty,
    isBlocked: false,
    hasProtectedHistory: false,
    financialProtectionReason: null,
    consequenceWarning: `Permanently deleting duty assignment #${rfId} will remove the operational role mapping. Employee #${duty.emp_id} and Branch #${duty.b_id} will be retained.`,
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Duty Assignment Record', count: 1, description: 'Operational duty record from responsible_for' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Staff Member', count: 1, description: `Employee #${duty.emp_id} is retained` },
        { label: 'Branch Record', count: 1, description: `Branch #${duty.b_id} is retained` }
      ],
      protectedFinancialRecords: []
    },
    allowedActions: [
      { action: 'delete_permanent', label: 'Delete Assignment', variant: 'danger', enabled: true, disabledReason: null }
    ]
  };
}

/**
 * ----------------------------------------------------------------------------
 * 2. ATOMIC TRANSACTION EXECUTION & REVALIDATION
 * Re-queries dependencies inside a CockroachDB transaction (retryable SQLSTATE 40001)
 * to ensure that live state has not changed concurrently before executing.
 * ----------------------------------------------------------------------------
 */

/**
 * Confirm Permanent Deletion
 */
async function confirmPermanentDelete(entityInput, id, extraParam = null, { empId = null, ipAddress = null } = {}) {
  const entity = normalizeEntity(entityInput);

  if (IMMUTABLE_FINANCIAL_ENTITIES.has(entity)) {
    throw new AppError(
      `Financial record '${entity}' is permanent and protected. Deletion forbidden.`,
      403
    );
  }

  return await db.executeTransaction(async (client) => {
    // 1. Revalidate preview inside the transaction to prevent stale race conditions
    const preview = await getDeletePreview(entity, id, extraParam);

    if (preview.isBlocked) {
      throw new AppError(
        `Deletion blocked: ${preview.blockReasons.join(' ')}`,
        400
      );
    }

    let deletedRecord = null;

    // 2. Execute deletion according to entity rules
    switch (entity) {
      case 'account': {
        // Cascading deletion for account:
        // 1. Delete responsibility entries attached to this account's transactions
        await client.query(
          `DELETE FROM responsible_for WHERE t_id IN (SELECT t_id FROM "transaction" WHERE acc_id = $1)`,
          [id]
        );

        // 2. Unlink any self-referencing related_trans_id
        await client.query(
          `UPDATE "transaction" SET related_trans_id = NULL WHERE related_trans_id IN (SELECT t_id FROM "transaction" WHERE acc_id = $1)`,
          [id]
        );

        // 3. Unlink transactions where related_acc_id points to this account
        await client.query(
          `UPDATE "transaction" SET related_acc_id = NULL WHERE related_acc_id = $1`,
          [id]
        );

        // 4. Unlink beneficiaries pointing to this internal account
        await client.query(
          `UPDATE beneficiary SET internal_acc_id = NULL WHERE internal_acc_id = $1`,
          [id]
        );

        // 5. Delete all transactions for this account
        await client.query(`DELETE FROM "transaction" WHERE acc_id = $1`, [id]);

        // 6. Delete account root record (CockroachDB cascades account_holder and nominee)
        const delRes = await client.query(`DELETE FROM account WHERE acc_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Account #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'customer': {
        // Cascading deletion for customer:
        // 1. Delete customer's loans (and payments/responsibilities)
        const custLoans = await client.query(`SELECT l_id FROM loan WHERE cid = $1`, [id]);
        if (custLoans.rows.length > 0) {
          await client.query(
            `DELETE FROM loan_payment WHERE l_id IN (SELECT l_id FROM loan WHERE cid = $1)`,
            [id]
          );
          await client.query(
            `DELETE FROM responsible_for WHERE l_id IN (SELECT l_id FROM loan WHERE cid = $1)`,
            [id]
          );
          await client.query(`DELETE FROM loan WHERE cid = $1`, [id]);
        }

        // 2. Delete customer's credit cards
        await client.query(`DELETE FROM creditcard WHERE cid = $1`, [id]);

        // 3. Handle accounts where this customer is the sole holder
        const soleAccs = await client.query(
          `SELECT acc_id FROM account_holder
           WHERE cid = $1
             AND acc_id IN (SELECT acc_id FROM account_holder GROUP BY acc_id HAVING count(*) = 1)`,
          [id]
        );
        for (const row of soleAccs.rows) {
          const soleAccId = row.acc_id;
          await client.query(
            `DELETE FROM responsible_for WHERE t_id IN (SELECT t_id FROM "transaction" WHERE acc_id = $1)`,
            [soleAccId]
          );
          await client.query(
            `UPDATE "transaction" SET related_trans_id = NULL WHERE related_trans_id IN (SELECT t_id FROM "transaction" WHERE acc_id = $1)`,
            [soleAccId]
          );
          await client.query(
            `UPDATE "transaction" SET related_acc_id = NULL WHERE related_acc_id = $1`,
            [soleAccId]
          );
          await client.query(
            `UPDATE beneficiary SET internal_acc_id = NULL WHERE internal_acc_id = $1`,
            [soleAccId]
          );
          await client.query(`DELETE FROM "transaction" WHERE acc_id = $1`, [soleAccId]);
          await client.query(`DELETE FROM account WHERE acc_id = $1`, [soleAccId]);
        }

        // 4. Remove customer ownership from any remaining joint accounts
        await client.query(`DELETE FROM account_holder WHERE cid = $1`, [id]);

        // 5. Delete customer (CockroachDB cascades phones, beneficiaries, sets nominee cid to null)
        const delRes = await client.query(`DELETE FROM customer WHERE cid = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Customer #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'creditcard': {
        const delRes = await client.query(`DELETE FROM creditcard WHERE pno = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Credit card #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'loan': {
        await client.query(`DELETE FROM loan_payment WHERE l_id = $1`, [id]);
        await client.query(`DELETE FROM responsible_for WHERE l_id = $1`, [id]);
        const delRes = await client.query(`DELETE FROM loan WHERE l_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Loan #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'employee': {
        // Unlink duty assignments
        await client.query(`DELETE FROM responsible_for WHERE emp_id = $1`, [id]);
        // Unlink references in customer, loan, transaction, audit_log
        await client.query(`UPDATE customer SET emp_id = NULL WHERE emp_id = $1`, [id]);
        await client.query(`UPDATE loan SET assigned_emp_id = NULL WHERE assigned_emp_id = $1`, [id]);
        await client.query(`UPDATE "transaction" SET processed_by_emp_id = NULL WHERE processed_by_emp_id = $1`, [id]);
        await client.query(`UPDATE audit_log SET emp_id = NULL WHERE emp_id = $1`, [id]);

        const delRes = await client.query(`DELETE FROM employee WHERE emp_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Employee #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'branch': {
        // Query dependency counts for audit log and summary before cascade
        const stats = await client.query(
          `SELECT
            (SELECT count(*) FROM employee WHERE b_id = $1) as emp_count,
            (SELECT count(*) FROM account WHERE b_id = $1) as acc_count,
            (SELECT count(*) FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)) as tx_count,
            (SELECT count(*) FROM responsible_for WHERE b_id = $1 OR emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1) OR t_id IN (SELECT t_id FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1))) as resp_count`,
          [id]
        );
        const s = stats.rows[0];

        // 1. Unlink self-referencing related_trans_id in transactions
        await client.query(
          `UPDATE "transaction"
           SET related_trans_id = NULL
           WHERE related_trans_id IN (
             SELECT t_id FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)
           )`,
          [id]
        );

        // 2. Unlink related_acc_id in transactions pointing to this branch's accounts
        await client.query(
          `UPDATE "transaction"
           SET related_acc_id = NULL
           WHERE related_acc_id IN (
             SELECT acc_id FROM account WHERE b_id = $1
           )`,
          [id]
        );

        // 3. Unlink beneficiaries pointing to this branch's internal accounts
        await client.query(
          `UPDATE beneficiary
           SET internal_acc_id = NULL
           WHERE internal_acc_id IN (
             SELECT acc_id FROM account WHERE b_id = $1
           )`,
          [id]
        );

        // 4. Delete operational assignments (responsible_for) for this branch, its employees, or its account transactions
        await client.query(
          `DELETE FROM responsible_for
           WHERE b_id = $1
              OR emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)
              OR t_id IN (SELECT t_id FROM "transaction" WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1))`,
          [id]
        );

        // 5. Delete transactions of this branch's accounts
        await client.query(
          `DELETE FROM "transaction"
           WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)`,
          [id]
        );

        // 6. Delete account nominees and account holders
        await client.query(
          `DELETE FROM nominee
           WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)`,
          [id]
        );

        await client.query(
          `DELETE FROM account_holder
           WHERE acc_id IN (SELECT acc_id FROM account WHERE b_id = $1)`,
          [id]
        );

        // 7. Delete accounts domiciled at this branch
        await client.query(
          `DELETE FROM account
           WHERE b_id = $1`,
          [id]
        );

        // 8. Unlink employee references across customer, loan, audit_log, and transaction
        await client.query(
          `UPDATE customer
           SET emp_id = NULL
           WHERE emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)`,
          [id]
        );

        await client.query(
          `UPDATE loan
           SET assigned_emp_id = NULL
           WHERE assigned_emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)`,
          [id]
        );

        await client.query(
          `UPDATE "transaction"
           SET processed_by_emp_id = NULL
           WHERE processed_by_emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)`,
          [id]
        );

        await client.query(
          `UPDATE audit_log
           SET emp_id = NULL
           WHERE emp_id IN (SELECT emp_id FROM employee WHERE b_id = $1)`,
          [id]
        );

        // 9. Delete employees assigned to this branch
        await client.query(
          `DELETE FROM employee
           WHERE b_id = $1`,
          [id]
        );

        // 10. Delete the branch itself
        const delRes = await client.query(
          `DELETE FROM branch
           WHERE b_id = $1
           RETURNING *`,
          [id]
        );
        if (delRes.rows.length === 0) throw new AppError(`Branch #${id} not found.`, 404);
        deletedRecord = {
          ...delRes.rows[0],
          cascaded: {
            employeesDeleted: parseInt(s.emp_count, 10) || 0,
            accountsDeleted: parseInt(s.acc_count, 10) || 0,
            transactionsDeleted: parseInt(s.tx_count, 10) || 0,
            dutiesDeleted: parseInt(s.resp_count, 10) || 0
          }
        };
        break;
      }

      case 'responsible_for': {
        const delRes = await client.query(`DELETE FROM responsible_for WHERE rf_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Operational duty #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'nominee': {
        const delRes = await client.query(`DELETE FROM nominee WHERE n_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Nominee #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'beneficiary': {
        const delRes = await client.query(`DELETE FROM beneficiary WHERE beneficiary_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Beneficiary #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'customer_phone': {
        const delRes = await client.query(
          `DELETE FROM customer_phone WHERE cid = $1 AND phone = $2 RETURNING *`,
          [id, extraParam]
        );
        if (delRes.rows.length === 0) throw new AppError(`Phone record not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'account_holder': {
        const countRes = await client.query(
          `SELECT count(*) as count FROM account_holder WHERE acc_id = $1`,
          [id]
        );
        if (parseInt(countRes.rows[0].count, 10) <= 1) {
          throw new AppError(`Cannot remove account holder: Account #${id} must retain at least one registered owner.`, 400);
        }

        const delRes = await client.query(
          `DELETE FROM account_holder WHERE acc_id = $1 AND cid = $2 RETURNING *`,
          [id, extraParam]
        );
        if (delRes.rows.length === 0) throw new AppError(`Account holder link not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      default:
        throw new AppError(`Unknown deletion entity '${entity}'.`, 400);
    }

    // 3. Record audit trail
    await recordAudit({
      client,
      empId,
      action: `PERMANENT_DELETE_${entity.toUpperCase()}`,
      entityName: entity.toUpperCase(),
      entityId: extraParam ? `${id}/${extraParam}` : String(id),
      details: deletedRecord,
      ipAddress
    });

    return {
      success: true,
      message: `${preview.entityTitle} successfully deleted permanently.`,
      deleted: deletedRecord
    };
  });
}

/**
 * Execute Banking Lifecycle State Action
 * (e.g. close account, deactivate customer, block card, settle loan, etc.)
 */
async function executeLifecycleAction(entityInput, id, actionName, { empId = null, ipAddress = null, reason = '' } = {}) {
  const entity = normalizeEntity(entityInput);
  const action = String(actionName || '').toLowerCase().trim();

  return await db.executeTransaction(async (client) => {
    let updatedRecord = null;
    let auditAction = null;
    let message = null;

    switch (action) {
      // 1. Account actions
      case 'close_account': {
        if (entity !== 'account') throw new AppError(`Action 'close_account' is only valid for accounts.`, 400);
        const accCheck = await client.query(`SELECT balance, status FROM account WHERE acc_id = $1`, [id]);
        if (accCheck.rows.length === 0) throw new AppError(`Account #${id} not found.`, 404);
        const acc = accCheck.rows[0];
        if (parseFloat(acc.balance) > 0) {
          throw new AppError(`Cannot close account with positive balance (₹${parseFloat(acc.balance).toLocaleString('en-IN')}). Withdraw funds first.`, 400);
        }
        if (acc.status === 'CLOSED') {
          throw new AppError(`Account #${id} is already closed.`, 400);
        }

        const res = await client.query(
          `UPDATE account SET status = 'CLOSED' WHERE acc_id = $1 RETURNING *`,
          [id]
        );
        updatedRecord = res.rows[0];
        auditAction = 'CLOSE_ACCOUNT';
        message = `Account #${id} successfully closed.`;
        break;
      }

      case 'reopen_account': {
        if (entity !== 'account') throw new AppError(`Action 'reopen_account' is only valid for accounts.`, 400);
        const res = await client.query(
          `UPDATE account SET status = 'ACTIVE' WHERE acc_id = $1 AND status = 'CLOSED' RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Account #${id} is not closed or does not exist.`, 400);
        updatedRecord = res.rows[0];
        auditAction = 'REOPEN_ACCOUNT';
        message = `Account #${id} successfully reopened.`;
        break;
      }

      // 2. Customer actions
      case 'deactivate_customer': {
        if (entity !== 'customer') throw new AppError(`Action 'deactivate_customer' is only valid for customers.`, 400);
        const depCheck = await client.query(
          `SELECT
            (SELECT count(*) FROM loan WHERE cid = $1 AND status IN ('ACTIVE', 'APPROVED', 'PENDING')) as active_loans,
            (SELECT count(*) FROM creditcard WHERE cid = $1 AND status = 'ACTIVE') as active_cards`,
          [id]
        );
        const r = depCheck.rows[0];
        if (parseInt(r.active_loans, 10) > 0) {
          throw new AppError(`Cannot deactivate customer with active loan facilities. Settle loans first.`, 400);
        }
        if (parseInt(r.active_cards, 10) > 0) {
          throw new AppError(`Cannot deactivate customer with active credit cards. Cancel or close cards first.`, 400);
        }

        const res = await client.query(
          `UPDATE customer SET status = 'INACTIVE' WHERE cid = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Customer #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'DEACTIVATE_CUSTOMER';
        message = `Customer #${id} successfully deactivated.`;
        break;
      }

      case 'reactivate_customer': {
        if (entity !== 'customer') throw new AppError(`Action 'reactivate_customer' is only valid for customers.`, 400);
        const res = await client.query(
          `UPDATE customer SET status = 'ACTIVE' WHERE cid = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Customer #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'REACTIVATE_CUSTOMER';
        message = `Customer #${id} successfully reactivated.`;
        break;
      }

      // 3. Credit Card actions
      case 'block_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'block_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'BLOCKED' WHERE pno = $1 AND status = 'ACTIVE' RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Card #${id} is not active or does not exist.`, 400);
        updatedRecord = res.rows[0];
        auditAction = 'BLOCK_CREDITCARD';
        message = `Credit Card •••• ${String(id).slice(-4)} successfully blocked.`;
        break;
      }

      case 'unblock_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'unblock_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'ACTIVE' WHERE pno = $1 AND status = 'BLOCKED' RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Card #${id} is not blocked or does not exist.`, 400);
        updatedRecord = res.rows[0];
        auditAction = 'UNBLOCK_CREDITCARD';
        message = `Credit Card •••• ${String(id).slice(-4)} successfully unblocked.`;
        break;
      }

      case 'close_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'close_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'CANCELLED' WHERE pno = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Card #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'CLOSE_CREDITCARD';
        message = `Credit Card •••• ${String(id).slice(-4)} cancelled and closed.`;
        break;
      }

      // 4. Loan actions
      case 'settle_loan': {
        if (entity !== 'loan') throw new AppError(`Action 'settle_loan' is only valid for loans.`, 400);
        const res = await client.query(
          `UPDATE loan SET status = 'PAID_OFF' WHERE l_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Loan #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'SETTLE_LOAN';
        message = `Loan #${id} settled and marked PAID_OFF.`;
        break;
      }

      // 5. Employee actions
      case 'deactivate_employee': {
        if (entity !== 'employee') throw new AppError(`Action 'deactivate_employee' is only valid for employees.`, 400);
        const res = await client.query(
          `UPDATE employee SET status = 'INACTIVE' WHERE emp_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Employee #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'DEACTIVATE_EMPLOYEE';
        message = `Employee #${id} deactivated.`;
        break;
      }

      case 'reactivate_employee': {
        if (entity !== 'employee') throw new AppError(`Action 'reactivate_employee' is only valid for employees.`, 400);
        const res = await client.query(
          `UPDATE employee SET status = 'ACTIVE' WHERE emp_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Employee #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'REACTIVATE_EMPLOYEE';
        message = `Employee #${id} reactivated.`;
        break;
      }

      // 6. Branch actions
      case 'deactivate_branch': {
        if (entity !== 'branch') throw new AppError(`Action 'deactivate_branch' is only valid for branches.`, 400);
        const res = await client.query(
          `UPDATE branch SET status = 'INACTIVE' WHERE b_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Branch #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'DEACTIVATE_BRANCH';
        message = `Branch #${id} deactivated.`;
        break;
      }

      case 'reactivate_branch': {
        if (entity !== 'branch') throw new AppError(`Action 'reactivate_branch' is only valid for branches.`, 400);
        const res = await client.query(
          `UPDATE branch SET status = 'ACTIVE' WHERE b_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Branch #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'REACTIVATE_BRANCH';
        message = `Branch #${id} reactivated.`;
        break;
      }

      default:
        throw new AppError(`Unknown lifecycle action '${action}' for entity '${entity}'.`, 400);
    }

    // Record audit trail
    await recordAudit({
      client,
      empId,
      action: auditAction,
      entityName: entity.toUpperCase(),
      entityId: String(id),
      details: { updatedRecord, reason },
      ipAddress
    });

    return {
      success: true,
      action,
      message,
      data: updatedRecord
    };
  });
}

module.exports = {
  getDeletePreview,
  confirmPermanentDelete,
  executeLifecycleAction,
  normalizeEntity,
  IMMUTABLE_FINANCIAL_ENTITIES
};
