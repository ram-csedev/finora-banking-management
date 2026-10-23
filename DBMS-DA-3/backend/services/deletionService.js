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

  const blockReasons = [];
  if (txCount > 0) {
    blockReasons.push(
      `Account has ${txCount} historical transaction(s). In accordance with banking regulations and CockroachDB referential constraints, financial ledger history cannot be deleted.`
    );
  }
  if (balance > 0) {
    blockReasons.push(
      `Account has an active balance of ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Balance must be withdrawn or transferred to zero before deletion or closure.`
    );
  }

  const isBlocked = blockReasons.length > 0;

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: !isBlocked,
      disabledReason: isBlocked ? blockReasons[0] : null
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
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [
        { label: 'Account Record', count: 1, description: 'Primary account record' },
        { label: 'Nominee Registrations', count: nomCount, description: 'Nominees assigned to this account (CASCADE)' }
      ],
      relationshipsToRemove: [
        { label: 'Account Ownerships', count: holderCount, description: 'Customer ownership links (CASCADE)' }
      ],
      retainedRecords: [
        { label: 'External Beneficiary Links', count: beneCount, description: 'Destination links will be set to NULL; beneficiaries preserved' }
      ],
      protectedFinancialRecords: [
        { label: 'Ledger Transactions', count: txCount, description: 'Historical ledger transactions (IMMUTABLE)' }
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

  const blockReasons = [];
  if (holderCount > 0) {
    blockReasons.push(
      `Customer has ${holderCount} active account ownership relationship(s). Accounts must be closed or ownership transferred first.`
    );
  }
  if (loanCount > 0) {
    blockReasons.push(
      `Customer has ${loanCount} registered loan facility(ies). Loans must be settled or closed before customer profile deletion.`
    );
  }
  if (cardCount > 0) {
    blockReasons.push(
      `Customer has ${cardCount} registered credit card(s). Credit cards must be cancelled or removed first.`
    );
  }

  const isBlocked = blockReasons.length > 0;

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
      enabled: !isBlocked,
      disabledReason: isBlocked ? blockReasons[0] : null
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
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [
        { label: 'Customer Profile', count: 1, description: 'Core customer record' },
        { label: 'Phone Numbers', count: phoneCount, description: 'Contact phone numbers (CASCADE)' },
        { label: 'Saved Beneficiaries', count: beneCount, description: 'Customer beneficiary entries (CASCADE)' }
      ],
      relationshipsToRemove: [
        { label: 'Nominee Linkages', count: nomCount, description: 'Nominee links to this customer (SET NULL)' }
      ],
      retainedRecords: [
        { label: 'Associated Bank Accounts', count: holderCount, description: 'Bank accounts retained' }
      ],
      protectedFinancialRecords: [
        { label: 'Active Loan Facilities', count: loanCount, description: 'Loan agreements and repayments' },
        { label: 'Credit Card Accounts', count: cardCount, description: 'Credit card accounts' }
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

  // No child tables directly reference creditcard.pno
  const isBlocked = false;
  const blockReasons = [];

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
    isBlocked,
    blockReasons,
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

  const blockReasons = [];
  if (paymentCount > 0) {
    blockReasons.push(
      `Loan has ${paymentCount} recorded repayment installment(s) totaling ₹${totalPaid.toLocaleString('en-IN')}. Financial audit rules protect repayment history from deletion.`
    );
  }

  const isBlocked = blockReasons.length > 0;

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: !isBlocked,
      disabledReason: isBlocked ? blockReasons[0] : null
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
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [
        { label: 'Loan Agreement Record', count: 1, description: 'Loan agreement' }
      ],
      relationshipsToRemove: [
        { label: 'Assigned Officer Responsibilities', count: respCount, description: 'Responsibility links (SET NULL)' }
      ],
      retainedRecords: [
        { label: 'Customer Profile', count: 1, description: 'Borrower customer record is retained' }
      ],
      protectedFinancialRecords: [
        { label: 'Repayment Installments', count: paymentCount, description: 'Loan payment audit transactions (IMMUTABLE)' }
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

  const blockReasons = [];
  if (activeRespCount > 0) {
    blockReasons.push(
      `Employee holds ${activeRespCount} active operational assignment(s). Reassign responsibilities before deletion.`
    );
  }

  const isBlocked = blockReasons.length > 0;

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: !isBlocked,
      disabledReason: isBlocked ? blockReasons[0] : null
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
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [
        { label: 'Employee Record', count: 1, description: 'Staff directory record' }
      ],
      relationshipsToRemove: [
        { label: 'Role Responsibilities', count: totalRespCount, description: 'Role assignments' }
      ],
      retainedRecords: [
        { label: 'Assigned Customers', count: custCount, description: 'Manager links set to NULL; customers retained' },
        { label: 'Assigned Loans', count: loanCount, description: 'Officer links set to NULL; loans retained' }
      ],
      protectedFinancialRecords: [
        { label: 'Processed Transactions', count: txCount, description: 'Teller audit transactions (retained)' }
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
      (SELECT count(*) FROM responsible_for WHERE b_id = $1) as resp_count`,
    [bId]
  );
  const dep = depRes.rows[0];
  const empCount = parseInt(dep.emp_count, 10) || 0;
  const accCount = parseInt(dep.acc_count, 10) || 0;
  const respCount = parseInt(dep.resp_count, 10) || 0;

  const blockReasons = [];
  if (empCount > 0) {
    blockReasons.push(
      `Branch has ${empCount} employee(s) assigned. Reassign staff to other branches before branch deletion.`
    );
  }
  if (accCount > 0) {
    blockReasons.push(
      `Branch has ${accCount} active bank account(s) domiciled. Transfer accounts before branch deletion.`
    );
  }

  const isBlocked = blockReasons.length > 0;

  const allowedActions = [
    {
      action: 'delete_permanent',
      label: 'Delete Permanently',
      variant: 'danger',
      enabled: !isBlocked,
      disabledReason: isBlocked ? blockReasons[0] : null
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
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [
        { label: 'Branch Record', count: 1, description: 'Branch directory entry' }
      ],
      relationshipsToRemove: [
        { label: 'Operational Assignments', count: respCount, description: 'Branch supervisory links' }
      ],
      retainedRecords: [
        { label: 'Branch Staff', count: empCount, description: 'Staff members must be transferred' },
        { label: 'Domiciled Accounts', count: accCount, description: 'Customer accounts must be transferred' }
      ],
      protectedFinancialRecords: []
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
    blockReasons: [],
    impact: {
      recordsToDelete: [
        { label: 'Nominee Record', count: 1, description: 'Nominee registration for account' }
      ],
      relationshipsToRemove: [],
      retainedRecords: [
        { label: 'Account', count: 1, description: 'Account #${nom.acc_id} remains active' }
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
    ? ['Cannot remove the only registered account holder. An account must retain at least one owner.']
    : [];

  return {
    entityType: 'account_holder',
    entityId: `${accId}/${cid}`,
    entityTitle: `Ownership: Customer #${cid} on Account #${accId}`,
    target: holder,
    isBlocked,
    blockReasons,
    impact: {
      recordsToDelete: [],
      relationshipsToRemove: [
        { label: 'Account Holder Link', count: 1, description: 'Joint/co-owner relationship severed' }
      ],
      retainedRecords: [
        { label: 'Account', count: 1, description: 'Account #${accId} remains active' },
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
        // Double check balance & transactions
        const check = await client.query(
          `SELECT balance, (SELECT count(*) FROM "transaction" WHERE acc_id = $1) as tx_count FROM account WHERE acc_id = $1`,
          [id]
        );
        if (check.rows.length === 0) throw new AppError(`Account #${id} not found.`, 404);
        if (parseFloat(check.rows[0].balance) > 0 || parseInt(check.rows[0].tx_count, 10) > 0) {
          throw new AppError(`Concurrent change detected: Account balance or transaction history is no longer zero. Deletion aborted.`, 409);
        }

        const delRes = await client.query(`DELETE FROM account WHERE acc_id = $1 RETURNING *`, [id]);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'customer': {
        // Double check accounts, loans, cards
        const check = await client.query(
          `SELECT
            (SELECT count(*) FROM account_holder WHERE cid = $1) as acc_count,
            (SELECT count(*) FROM loan WHERE cid = $1) as loan_count,
            (SELECT count(*) FROM creditcard WHERE cid = $1) as card_count`,
          [id]
        );
        if (check.rows.length === 0) throw new AppError(`Customer #${id} not found.`, 404);
        const r = check.rows[0];
        if (parseInt(r.acc_count, 10) > 0 || parseInt(r.loan_count, 10) > 0 || parseInt(r.card_count, 10) > 0) {
          throw new AppError(`Concurrent change detected: Customer has newly linked accounts, loans, or cards. Deletion aborted.`, 409);
        }

        const delRes = await client.query(`DELETE FROM customer WHERE cid = $1 RETURNING *`, [id]);
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
        // Double check payments
        const check = await client.query(
          `SELECT count(*) as count FROM loan_payment WHERE l_id = $1`,
          [id]
        );
        if (parseInt(check.rows[0].count, 10) > 0) {
          throw new AppError(`Concurrent change detected: Loan repayments have been posted. Deletion aborted.`, 409);
        }

        const delRes = await client.query(`DELETE FROM loan WHERE l_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Loan #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'employee': {
        // Double check active duties
        const check = await client.query(
          `SELECT count(*) as count FROM responsible_for WHERE emp_id = $1 AND status = 'ACTIVE'`,
          [id]
        );
        if (parseInt(check.rows[0].count, 10) > 0) {
          throw new AppError(`Concurrent change detected: Employee has active duties. Deletion aborted.`, 409);
        }

        const delRes = await client.query(`DELETE FROM employee WHERE emp_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Employee #${id} not found.`, 404);
        deletedRecord = delRes.rows[0];
        break;
      }

      case 'branch': {
        const check = await client.query(
          `SELECT
            (SELECT count(*) FROM employee WHERE b_id = $1) as emp_count,
            (SELECT count(*) FROM account WHERE b_id = $1) as acc_count`,
          [id]
        );
        const r = check.rows[0];
        if (parseInt(r.emp_count, 10) > 0 || parseInt(r.acc_count, 10) > 0) {
          throw new AppError(`Concurrent change detected: Branch has attached staff or accounts. Deletion aborted.`, 409);
        }

        const delRes = await client.query(`DELETE FROM branch WHERE b_id = $1 RETURNING *`, [id]);
        if (delRes.rows.length === 0) throw new AppError(`Branch #${id} not found.`, 404);
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
        const bal = parseFloat(accCheck.rows[0].balance);
        if (bal !== 0) {
          throw new AppError(`Account balance must be zero before closing. Current balance: ₹${bal.toLocaleString('en-IN')}`, 400);
        }

        const res = await client.query(
          `UPDATE account SET status = 'CLOSED' WHERE acc_id = $1 RETURNING *`,
          [id]
        );
        updatedRecord = res.rows[0];
        auditAction = 'CLOSE_ACCOUNT';
        message = `Account #${id} successfully closed. Balance is zero.`;
        break;
      }

      case 'reopen_account': {
        if (entity !== 'account') throw new AppError(`Action 'reopen_account' is only valid for accounts.`, 400);
        const res = await client.query(
          `UPDATE account SET status = 'ACTIVE' WHERE acc_id = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Account #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'REOPEN_ACCOUNT';
        message = `Account #${id} successfully reopened and activated.`;
        break;
      }

      // 2. Customer actions
      case 'deactivate_customer': {
        if (entity !== 'customer') throw new AppError(`Action 'deactivate_customer' is only valid for customers.`, 400);
        // Verify no active unpaid loans or cards
        const check = await client.query(
          `SELECT
            (SELECT count(*) FROM loan WHERE cid = $1 AND status IN ('ACTIVE', 'APPROVED', 'PENDING')) as active_loans,
            (SELECT count(*) FROM creditcard WHERE cid = $1 AND status = 'ACTIVE') as active_cards`,
          [id]
        );
        const r = check.rows[0];
        if (parseInt(r.active_loans, 10) > 0) {
          throw new AppError(`Cannot deactivate customer: Customer has active loan obligations.`, 400);
        }
        if (parseInt(r.active_cards, 10) > 0) {
          throw new AppError(`Cannot deactivate customer: Customer has active credit card accounts.`, 400);
        }

        const res = await client.query(
          `UPDATE customer SET status = 'INACTIVE' WHERE cid = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Customer #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'DEACTIVATE_CUSTOMER';
        message = `Customer #${id} (${updatedRecord.first_name} ${updatedRecord.last_name || ''}) deactivated.`;
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
        message = `Customer #${id} reactivated to ACTIVE status.`;
        break;
      }

      // 3. Credit Card actions
      case 'block_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'block_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'BLOCKED' WHERE pno = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Credit card #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'BLOCK_CREDITCARD';
        message = `Credit card •••• ${String(id).slice(-4)} has been BLOCKED.`;
        break;
      }

      case 'unblock_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'unblock_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'ACTIVE' WHERE pno = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Credit card #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'UNBLOCK_CREDITCARD';
        message = `Credit card •••• ${String(id).slice(-4)} has been UNBLOCKED and set to ACTIVE.`;
        break;
      }

      case 'close_card': {
        if (entity !== 'creditcard') throw new AppError(`Action 'close_card' is only valid for credit cards.`, 400);
        const res = await client.query(
          `UPDATE creditcard SET status = 'CANCELLED' WHERE pno = $1 RETURNING *`,
          [id]
        );
        if (res.rows.length === 0) throw new AppError(`Credit card #${id} not found.`, 404);
        updatedRecord = res.rows[0];
        auditAction = 'CLOSE_CREDITCARD';
        message = `Credit card •••• ${String(id).slice(-4)} has been CANCELLED.`;
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
        message = `Loan #${id} has been settled and marked PAID_OFF.`;
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
        message = `Staff #${id} (${updatedRecord.first_name} ${updatedRecord.last_name || ''}) deactivated.`;
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
        message = `Staff #${id} reactivated to ACTIVE status.`;
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
        message = `Branch #${id} (${updatedRecord.branch_name}) deactivated.`;
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
        message = `Branch #${id} (${updatedRecord.branch_name}) reactivated to ACTIVE status.`;
        break;
      }

      default:
        throw new AppError(`Unknown lifecycle action '${action}' for entity '${entity}'.`, 400);
    }

    // Record audit entry
    await recordAudit({
      client,
      empId,
      action: auditAction,
      entityName: entity.toUpperCase(),
      entityId: String(id),
      details: { ...updatedRecord, reason: reason || 'User triggered lifecycle state change' },
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
  normalizeEntity,
  getDeletePreview,
  confirmPermanentDelete,
  executeLifecycleAction
};
