/**
 * Banking Entity CRUD Service
 * Provides secure, allowlisted, parameterized data access for core entities
 * with pagination, filtering, audit integration, and referential protection.
 */
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('./auditService');

// Allowlist of entities and their configuration
const ENTITY_CONFIG = {
  branch: {
    table: 'branch',
    pk: 'b_id',
    idPrefix: 'BR-',
    allowedFields: ['b_id', 'branch_name', 'city', 'state', 'pincode', 'ifsc', 'contact', 'status'],
    updatableFields: ['branch_name', 'city', 'state', 'pincode', 'contact', 'status'],
    searchFields: ['b_id', 'branch_name', 'city', 'state', 'pincode', 'ifsc', 'contact', 'status']
  },
  employee: {
    table: 'employee',
    pk: 'emp_id',
    idPrefix: 'EMP-',
    allowedFields: ['emp_id', 'first_name', 'last_name', 'salary', 'hire_date', 'b_id', 'email', 'status'],
    updatableFields: ['first_name', 'last_name', 'salary', 'hire_date', 'b_id', 'email', 'status'],
    searchFields: ['emp_id', 'first_name', 'last_name', 'salary', 'b_id', 'email', 'status']
  },
  customer: {
    table: 'customer',
    pk: 'cid',
    idPrefix: 'CUST-',
    allowedFields: ['cid', 'pan', 'first_name', 'last_name', 'city', 'state', 'pincode', 'dob', 'emp_id', 'email', 'status'],
    updatableFields: ['first_name', 'last_name', 'city', 'state', 'pincode', 'dob', 'emp_id', 'email', 'status'],
    searchFields: ['cid', 'pan', 'first_name', 'last_name', 'city', 'state', 'pincode', 'email', 'status']
  },
  customer_phone: {
    table: 'customer_phone',
    pk: 'cid',
    compositePks: ['cid', 'phone'],
    allowedFields: ['cid', 'phone', 'phone_type', 'is_primary'],
    updatableFields: ['phone', 'phone_type', 'is_primary'],
    searchFields: ['cid', 'phone', 'phone_type']
  },
  account: {
    table: 'account',
    pk: 'acc_id',
    idPrefix: 'ACC-',
    allowedFields: ['acc_id', 'b_id', 'balance', 'status', 'acc_type'],
    updatableFields: ['b_id', 'status', 'acc_type'], // Balance is ledger-driven only
    searchFields: ['acc_id', 'b_id', 'balance', 'status', 'acc_type']
  },
  account_holder: {
    table: 'account_holder',
    pk: 'acc_id',
    compositePks: ['acc_id', 'cid'],
    allowedFields: ['acc_id', 'cid', 'ownership_role', 'is_primary', 'share_percentage'],
    updatableFields: ['ownership_role', 'is_primary', 'share_percentage'],
    searchFields: ['acc_id', 'cid', 'ownership_role']
  },
  nominee: {
    table: 'nominee',
    pk: 'n_id',
    idPrefix: 'NOM-',
    allowedFields: ['n_id', 'acc_id', 'cid', 'first_name', 'last_name', 'relationship', 'dob', 'contact_phone'],
    updatableFields: ['first_name', 'last_name', 'relationship', 'dob', 'contact_phone'],
    searchFields: ['n_id', 'acc_id', 'cid', 'first_name', 'last_name', 'relationship', 'contact_phone']
  },
  creditcard: {
    table: 'creditcard',
    pk: 'pno',
    idPrefix: 'CC-',
    allowedFields: ['pno', 'cid', 'type', 'card_limit', 'expiry', 'status', 'cvv'],
    updatableFields: ['type', 'card_limit', 'expiry', 'status'], // pno, cid, cvv protected
    searchFields: ['pno', 'cid', 'type', 'card_limit', 'expiry', 'status']
  },
  loan: {
    table: 'loan',
    pk: 'l_id',
    idPrefix: 'LN-',
    allowedFields: ['l_id', 'cid', 'l_type', 'amount', 'interest', 'term', 'start_date', 'status', 'assigned_emp_id'],
    updatableFields: ['interest', 'term', 'status', 'assigned_emp_id', 'l_type'], // amount and start_date protected
    searchFields: ['l_id', 'cid', 'l_type', 'amount', 'interest', 'term', 'status', 'assigned_emp_id']
  },
  loan_payment: {
    table: 'loan_payment',
    pk: 'payment_id',
    idPrefix: 'PAY-',
    allowedFields: ['payment_id', 'l_id', 'payment_date', 'amount', 'principal_amount', 'interest_amount', 'payment_mode', 'status', 'remarks'],
    updatableFields: ['remarks', 'payment_mode'], // amounts and loan pointers protected
    searchFields: ['payment_id', 'l_id', 'amount', 'payment_mode', 'status', 'remarks']
  },
  beneficiary: {
    table: 'beneficiary',
    pk: 'beneficiary_id',
    idPrefix: 'BEN-',
    allowedFields: ['beneficiary_id', 'cid', 'nickname', 'beneficiary_name', 'destination_account_num', 'destination_ifsc', 'bank_name', 'internal_acc_id', 'is_verified'],
    updatableFields: ['nickname', 'beneficiary_name', 'destination_account_num', 'destination_ifsc', 'bank_name', 'internal_acc_id', 'is_verified'],
    searchFields: ['beneficiary_id', 'cid', 'nickname', 'beneficiary_name', 'destination_account_num', 'destination_ifsc', 'bank_name']
  },
  transaction: {
    table: 'transaction',
    pk: 't_id',
    idPrefix: 'TXN-',
    allowedFields: ['t_id', 'acc_id', 'trans_date', 'type', 'amount', 'mode', 'status', 'related_acc_id', 'related_trans_id', 'description', 'processed_by_emp_id'],
    updatableFields: ['description'], // Only narration memo is editable; ledger amounts/accounts immutable
    searchFields: ['description', 'type', 'mode', 'status']
  },
  audit_log: {
    table: 'audit_log',
    pk: 'log_id',
    allowedFields: ['log_id', 'emp_id', 'actor_type', 'actor_id', 'action', 'entity_name', 'entity_id', 'details', 'ip_address'],
    updatableFields: [], // Strictly immutable audit records
    searchFields: ['log_id', 'emp_id', 'actor_type', 'actor_id', 'action', 'entity_name', 'entity_id', 'details', 'ip_address']
  },
  responsible_for: {
    table: 'responsible_for',
    pk: 'rf_id',
    idPrefix: 'RF-',
    allowedFields: ['rf_id', 'emp_id', 'b_id', 'role_type', 'l_id', 't_id', 'assigned_date', 'status', 'notes'],
    updatableFields: ['emp_id', 'b_id', 'role_type', 'status', 'notes', 'l_id', 't_id'],
    searchFields: ['rf_id', 'emp_id', 'b_id', 'role_type', 'status', 'notes']
  }
};

/**
 * Build rich search condition expressions for a specific token/term parameter index
 */
function buildTokenConditions(cfg, paramIndexStr) {
  const conds = [];
  const table = `"${cfg.table}"`;

  // 1. Direct fields: text substring matching
  if (cfg.searchFields && cfg.searchFields.length > 0) {
    for (const f of cfg.searchFields) {
      conds.push(`${table}."${f}"::text ILIKE ('%' || ${paramIndexStr} || '%')`);
    }
  }

  // 2. Prefixed IDs and Primary Key (for non-transaction entities)
  if (cfg.idPrefix && cfg.pk && cfg.table !== 'transaction') {
    conds.push(`(${table}."${cfg.pk}"::text = ${paramIndexStr} OR ('${cfg.idPrefix}' || ${table}."${cfg.pk}"::text) = ${paramIndexStr} OR ('${cfg.idPrefix}' || ${table}."${cfg.pk}"::text) ILIKE (${paramIndexStr} || '%') OR ('${cfg.idPrefix}' || ${table}."${cfg.pk}"::text) ILIKE ('%' || ${paramIndexStr} || '%'))`);
  }

  // 3. Full name concatenation for entities with first_name and last_name
  if (cfg.allowedFields.includes('first_name') && cfg.allowedFields.includes('last_name')) {
    conds.push(`concat(${table}."first_name", ' ', coalesce(${table}."last_name", '')) ILIKE ('%' || ${paramIndexStr} || '%')`);
    conds.push(`concat(coalesce(${table}."last_name", ''), ' ', ${table}."first_name") ILIKE ('%' || ${paramIndexStr} || '%')`);
  }

  // 4. Entity-specific relationships
  if (cfg.table === 'customer') {
    // Search customer's phone numbers
    conds.push(`EXISTS (SELECT 1 FROM customer_phone cp WHERE cp.cid = ${table}.cid AND cp.phone ILIKE ('%' || ${paramIndexStr} || '%'))`);
  } else if (cfg.table === 'account') {
    // Search account holders (customer name, PAN, email, CID)
    conds.push(`EXISTS (
      SELECT 1 FROM account_holder ah
      JOIN customer c ON ah.cid = c.cid
      WHERE ah.acc_id = ${table}.acc_id AND (
        c.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(c.first_name, ' ', coalesce(c.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.pan ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.email ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.cid::text = ${paramIndexStr} OR
        ('CUST-' || c.cid::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
    // Search domiciled branch (branch name, city, IFSC)
    conds.push(`EXISTS (
      SELECT 1 FROM branch b
      WHERE b.b_id = ${table}.b_id AND (
        b.branch_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.city ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.ifsc ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  } else if (cfg.table === 'transaction') {
    // 1. Transaction ID: Exact match or formatted TXN- prefix (avoids false-positive substring matches on 19-digit snowflake IDs)
    conds.push(`(${table}.t_id::text = ${paramIndexStr} OR ('TXN-' || ${table}.t_id::text) = ${paramIndexStr} OR ('TXN-' || ${table}.t_id::text) ILIKE (${paramIndexStr} || '%'))`);

    // 2. Direct Account ID match or formatted ACC- prefix match
    conds.push(`(${table}.acc_id::text = ${paramIndexStr} OR ('ACC-' || ${table}.acc_id::text) = ${paramIndexStr} OR ('ACC-' || ${table}.acc_id::text) ILIKE ('%' || ${paramIndexStr} || '%'))`);

    // 3. Related Account ID match (for transfers)
    conds.push(`(${table}.related_acc_id IS NOT NULL AND (${table}.related_acc_id::text = ${paramIndexStr} OR ('ACC-' || ${table}.related_acc_id::text) = ${paramIndexStr} OR ('ACC-' || ${table}.related_acc_id::text) ILIKE ('%' || ${paramIndexStr} || '%')))`);

    // 4. Cross-entity: Processed Teller / Employee
    conds.push(`EXISTS (
      SELECT 1 FROM employee e
      WHERE e.emp_id = ${table}.processed_by_emp_id AND (
        e.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(e.first_name, ' ', coalesce(e.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.emp_id::text = ${paramIndexStr} OR
        ('EMP-' || e.emp_id::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);

    // 5. Cross-entity: Account Holder Customer (CID, PAN, Name)
    conds.push(`EXISTS (
      SELECT 1 FROM account_holder ah
      JOIN customer c ON ah.cid = c.cid
      WHERE (ah.acc_id = ${table}.acc_id OR ah.acc_id = ${table}.related_acc_id) AND (
        c.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(c.first_name, ' ', coalesce(c.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.pan ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.cid::text = ${paramIndexStr} OR
        ('CUST-' || c.cid::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  } else if (cfg.table === 'loan') {
    // Search borrowing customer name, PAN, CID
    conds.push(`EXISTS (
      SELECT 1 FROM customer c
      WHERE c.cid = ${table}.cid AND (
        c.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(c.first_name, ' ', coalesce(c.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.pan ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.cid::text = ${paramIndexStr} OR
        ('CUST-' || c.cid::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
    // Search loan officer / officer branch
    conds.push(`EXISTS (
      SELECT 1 FROM employee e
      LEFT JOIN branch b ON e.b_id = b.b_id
      WHERE e.emp_id = ${table}.assigned_emp_id AND (
        e.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(e.first_name, ' ', coalesce(e.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.branch_name ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  } else if (cfg.table === 'creditcard') {
    // Search cardholder customer name, PAN, CID
    conds.push(`EXISTS (
      SELECT 1 FROM customer c
      WHERE c.cid = ${table}.cid AND (
        c.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(c.first_name, ' ', coalesce(c.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.pan ILIKE ('%' || ${paramIndexStr} || '%') OR
        c.cid::text = ${paramIndexStr} OR
        ('CUST-' || c.cid::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  } else if (cfg.table === 'employee') {
    // Search assigned branch name, city, IFSC
    conds.push(`EXISTS (
      SELECT 1 FROM branch b
      WHERE b.b_id = ${table}.b_id AND (
        b.branch_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.city ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.ifsc ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  } else if (cfg.table === 'responsible_for') {
    // Search assigned staff member name, email, ID
    conds.push(`EXISTS (
      SELECT 1 FROM employee e
      WHERE e.emp_id = ${table}.emp_id AND (
        e.first_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.last_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        concat(e.first_name, ' ', coalesce(e.last_name, '')) ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.email ILIKE ('%' || ${paramIndexStr} || '%') OR
        e.emp_id::text = ${paramIndexStr} OR
        ('EMP-' || e.emp_id::text) ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
    // Search operational branch name, city, IFSC
    conds.push(`EXISTS (
      SELECT 1 FROM branch b
      WHERE b.b_id = ${table}.b_id AND (
        b.branch_name ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.city ILIKE ('%' || ${paramIndexStr} || '%') OR
        b.ifsc ILIKE ('%' || ${paramIndexStr} || '%')
      )
    )`);
  }

  return conds;
}

/**
 * Validate entity name against strict allowlist
 */
function getEntityConfig(entityName) {
  const normalized = String(entityName).toLowerCase();
  const cfg = ENTITY_CONFIG[normalized];
  if (!cfg) {
    throw new AppError(`Unknown entity '${entityName}'. Allowed entities: ${Object.keys(ENTITY_CONFIG).join(', ')}`, 400);
  }
  return cfg;
}

/**
 * List records with pagination, filtering, and search
 */
async function listEntities(entityName, { page = 1, limit = 50, search = '', sortBy = null, sortOrder = 'ASC', filters = {} } = {}) {
  const cfg = getEntityConfig(entityName);

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  let whereClauses = [];
  let params = [];
  let paramIdx = 1;

  const trimmedSearch = String(search || '').trim();
  if (trimmedSearch) {
    const tokens = trimmedSearch.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      // Single token search: match across direct fields, prefixed IDs, names, relations
      const conds = buildTokenConditions(cfg, `$${paramIdx}`);
      if (conds.length > 0) {
        whereClauses.push(`(${conds.join(' OR ')})`);
        params.push(tokens[0]);
        paramIdx++;
      }
    } else if (tokens.length > 1) {
      // Multi-token search: match as exact full phrase OR all tokens matching across attributes
      // 1. Full phrase condition:
      const phraseParamIdx = paramIdx;
      const phraseConds = buildTokenConditions(cfg, `$${phraseParamIdx}`);
      params.push(trimmedSearch);
      paramIdx++;

      // 2. Token-by-token conditions (all individual tokens must match):
      const tokenClauseList = [];
      for (const tok of tokens) {
        const tokConds = buildTokenConditions(cfg, `$${paramIdx}`);
        if (tokConds.length > 0) {
          tokenClauseList.push(`(${tokConds.join(' OR ')})`);
          params.push(tok);
          paramIdx++;
        }
      }

      if (phraseConds.length > 0 && tokenClauseList.length > 0) {
        whereClauses.push(`((${phraseConds.join(' OR ')}) OR (${tokenClauseList.join(' AND ')}))`);
      } else if (phraseConds.length > 0) {
        whereClauses.push(`(${phraseConds.join(' OR ')})`);
      } else if (tokenClauseList.length > 0) {
        whereClauses.push(`(${tokenClauseList.join(' AND ')})`);
      }
    }
  }

  // Exact matching for valid entity fields in filters (with canonical normalization)
  if (filters && typeof filters === 'object') {
    for (const [key, rawValue] of Object.entries(filters)) {
      const lowerKey = key.toLowerCase();
      if (
        cfg.allowedFields.includes(lowerKey) &&
        rawValue !== undefined &&
        rawValue !== null &&
        rawValue !== '' &&
        String(rawValue).trim().toLowerCase() !== 'all'
      ) {
        let filterVal = String(rawValue).trim();

        // Canonical normalization for query filters
        if (cfg.table === 'loan') {
          if (lowerKey === 'l_type') {
            const u = filterVal.toUpperCase();
            if (u === 'AUTO' || u === 'AUTO LOAN' || u === 'CAR LOAN') filterVal = 'CAR';
          } else if (lowerKey === 'status') {
            if (filterVal.toUpperCase() === 'APPLIED') filterVal = 'PENDING';
          }
        } else if (cfg.table === 'transaction') {
          if (lowerKey === 'type') {
            const u = filterVal.toUpperCase();
            if (u === 'TRANSFER_IN' || u === 'TRANSFER_OUT') filterVal = 'TRANSFER';
            else if (u === 'INTEREST_CREDIT') filterVal = 'INTEREST';
            else if (u === 'FEE_DEBIT') filterVal = 'FEE';
          } else if (lowerKey === 'status') {
            if (filterVal.toUpperCase() === 'COMPLETED') filterVal = 'SUCCESS';
          }
        }

        whereClauses.push(`"${lowerKey}"::text = $${paramIdx}`);
        params.push(filterVal);
        paramIdx++;
      }
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total records
  const countSql = `SELECT count(*)::int AS total FROM "${cfg.table}" ${whereSql}`;
  const countRes = await db.query(countSql, params);
  const total = parseInt(countRes.rows[0]?.total, 10) || 0;

  // Ordering
  let orderColumn = cfg.pk;
  if (sortBy && cfg.allowedFields.includes(sortBy.toLowerCase())) {
    orderColumn = sortBy.toLowerCase();
  }
  const safeDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const selectSql = `
    SELECT *
    FROM "${cfg.table}"
    ${whereSql}
    ORDER BY "${orderColumn}" ${safeDirection}
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;
  params.push(safeLimit, offset);

  const result = await db.query(selectSql, params);

  return {
    entity: cfg.table,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRecords: total,
      totalPages: Math.ceil(total / safeLimit)
    },
    data: result.rows
  };
}

/**
 * Get single record by ID
 */
async function getEntityById(entityName, id) {
  const cfg = getEntityConfig(entityName);

  const sql = `SELECT * FROM "${cfg.table}" WHERE "${cfg.pk}" = $1;`;
  const result = await db.query(sql, [id]);

  if (result.rows.length === 0) {
    throw new AppError(`Record in '${cfg.table}' with ${cfg.pk} = '${id}' not found.`, 404);
  }

  return result.rows[0];
}

/**
 * Create a new record
 */

/**
 * Canonical payload normalization and integrity validation
 */
function normalizeAndValidatePayload(entityName, data, isUpdate = false) {
  if (!data || typeof data !== 'object') return;
  const normEntity = String(entityName).toLowerCase();

  switch (normEntity) {
    case 'loan': {
      // 1. Loan Category (chk_loan_type)
      if (data.l_type !== undefined) {
        let typeVal = String(data.l_type || '').trim().toUpperCase();
        if (['AUTO', 'AUTO LOAN', 'CAR LOAN', 'VEHICLE', 'AUTOMOBILE'].includes(typeVal)) {
          typeVal = 'CAR';
        } else if (typeVal === 'HOME LOAN') {
          typeVal = 'HOME';
        } else if (typeVal === 'PERSONAL LOAN') {
          typeVal = 'PERSONAL';
        } else if (['EDUCATION LOAN', 'STUDENT', 'STUDENT LOAN'].includes(typeVal)) {
          typeVal = 'EDUCATION';
        } else if (['BUSINESS LOAN', 'COMMERCIAL'].includes(typeVal)) {
          typeVal = 'BUSINESS';
        }

        const validLoanTypes = ['HOME', 'CAR', 'PERSONAL', 'EDUCATION', 'BUSINESS'];
        if (!validLoanTypes.includes(typeVal)) {
          throw new AppError(
            'Invalid loan category. Select Home, Car, Personal, Education, or Business Loan.',
            400,
            null,
            'INVALID_LOAN_CATEGORY',
            'l_type'
          );
        }
        data.l_type = typeVal;
      }

      // 2. Amount (chk_loan_amount)
      if (data.amount !== undefined) {
        const amt = parseFloat(data.amount);
        if (isNaN(amt) || amt <= 0) {
          throw new AppError(
            'Invalid loan amount. Enter an amount greater than zero.',
            400,
            null,
            'INVALID_LOAN_AMOUNT',
            'amount'
          );
        }
      }

      // 3. Interest Rate (chk_loan_interest)
      if (data.interest !== undefined) {
        const rate = parseFloat(data.interest);
        if (isNaN(rate) || rate < 0) {
          throw new AppError(
            'Invalid interest rate. Enter a non-negative interest rate within the permitted range.',
            400,
            null,
            'INVALID_LOAN_INTEREST',
            'interest'
          );
        }
      }

      // 4. Term (chk_loan_term)
      if (data.term !== undefined) {
        const tenure = parseInt(data.term, 10);
        if (isNaN(tenure) || tenure <= 0) {
          throw new AppError(
            'Invalid loan tenure. Enter a repayment term duration greater than zero months.',
            400,
            null,
            'INVALID_LOAN_TERM',
            'term'
          );
        }
      }

      // 5. Status (chk_loan_status)
      if (data.status !== undefined) {
        let statusVal = String(data.status || '').trim().toUpperCase();
        if (statusVal === 'APPLIED') statusVal = 'PENDING';

        const validStatuses = ['PENDING', 'APPROVED', 'ACTIVE', 'PAID_OFF', 'DEFAULTED', 'REJECTED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError(
            'Invalid loan status. Select Pending, Approved, Active, Paid Off, Defaulted, or Rejected.',
            400,
            null,
            'INVALID_LOAN_STATUS',
            'status'
          );
        }
        data.status = statusVal;
      }
      break;
    }

    case 'loan_payment': {
      // 1. Payment Mode (chk_payment_mode)
      if (data.payment_mode !== undefined) {
        let modeVal = String(data.payment_mode || '').trim().toUpperCase();
        if (['UPI', 'NEFT', 'RTGS', 'NETBANKING', 'IMPS'].includes(modeVal)) {
          modeVal = 'ONLINE';
        }
        const validModes = ['ONLINE', 'AUTO_DEBIT', 'CASH', 'CHEQUE'];
        if (!validModes.includes(modeVal)) {
          throw new AppError(
            'Invalid payment mode for loan installment. Select Online, Auto Debit, Cash, or Cheque.',
            400,
            null,
            'INVALID_LOAN_PAYMENT_MODE',
            'payment_mode'
          );
        }
        data.payment_mode = modeVal;
      }

      // 2. Amounts arithmetic check
      if (data.amount !== undefined && data.principal_amount !== undefined && data.interest_amount !== undefined) {
        const total = parseFloat(data.amount);
        const princ = parseFloat(data.principal_amount);
        const intr = parseFloat(data.interest_amount);
        if (isNaN(total) || total <= 0) {
          throw new AppError('Repayment installment amount must be greater than zero.', 400, null, 'INVALID_PAYMENT_AMOUNT', 'amount');
        }
        if (isNaN(princ) || princ < 0) {
          throw new AppError('Principal component cannot be negative. Enter an amount greater than or equal to zero.', 400, null, 'INVALID_PRINCIPAL_COMPONENT', 'principal_amount');
        }
        if (isNaN(intr) || intr < 0) {
          throw new AppError('Interest component cannot be negative. Enter an amount greater than or equal to zero.', 400, null, 'INVALID_INTEREST_COMPONENT', 'interest_amount');
        }
        if (Math.abs(total - (princ + intr)) > 0.01) {
          throw new AppError('Component mismatch: Total payment amount must exactly equal principal plus interest components.', 400, null, 'INVALID_PAYMENT_COMPONENTS', 'amount');
        }
      }
      break;
    }

    case 'account': {
      // 1. Account Type (chk_account_type)
      if (data.acc_type !== undefined) {
        const typeVal = String(data.acc_type || '').trim().toUpperCase();
        const validTypes = ['SAVINGS', 'CURRENT', 'SALARY', 'FIXED_DEPOSIT'];
        if (!validTypes.includes(typeVal)) {
          throw new AppError('Invalid account type. Select Savings, Current, Salary, or Fixed Deposit.', 400, null, 'INVALID_ACCOUNT_TYPE', 'acc_type');
        }
        data.acc_type = typeVal;
      }

      // 2. Initial Balance (chk_account_balance)
      if (data.balance !== undefined) {
        const bal = parseFloat(data.balance);
        if (isNaN(bal) || bal < 0) {
          throw new AppError('This operation would result in a negative account balance. Enter a valid non-negative balance.', 400, null, 'INVALID_ACCOUNT_BALANCE', 'balance');
        }
      }

      // 3. Status (chk_account_status)
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'DORMANT', 'FROZEN', 'CLOSED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid account status. Select Active, Dormant, Frozen, or Closed.', 400, null, 'INVALID_ACCOUNT_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'account_holder': {
      // 1. Ownership Role (chk_ownership_role)
      if (data.ownership_role !== undefined) {
        const roleVal = String(data.ownership_role || '').trim().toUpperCase();
        const validRoles = ['PRIMARY', 'JOINT', 'SECONDARY', 'GUARDIAN'];
        if (!validRoles.includes(roleVal)) {
          throw new AppError('Invalid ownership role. Select Primary, Joint, Secondary, or Guardian.', 400, null, 'INVALID_OWNERSHIP_ROLE', 'ownership_role');
        }
        data.ownership_role = roleVal;
      }

      // 2. Share Percentage (chk_share_percentage)
      if (data.share_percentage !== undefined) {
        const share = parseFloat(data.share_percentage);
        if (isNaN(share) || share < 0 || share > 100) {
          throw new AppError('Invalid ownership share percentage. Enter a value between 0% and 100%.', 400, null, 'INVALID_SHARE_PERCENTAGE', 'share_percentage');
        }
      }
      break;
    }

    case 'creditcard': {
      // 1. Card Type (chk_creditcard_type)
      if (data.type !== undefined) {
        const typeVal = String(data.type || '').trim().toUpperCase();
        const validTypes = ['VISA', 'MASTERCARD', 'RUPAY', 'AMEX'];
        if (!validTypes.includes(typeVal)) {
          throw new AppError('Invalid credit card network. Select Visa, Mastercard, RuPay, or American Express.', 400, null, 'INVALID_CARD_TYPE', 'type');
        }
        data.type = typeVal;
      }

      // 2. Limit (chk_creditcard_limit)
      if (data.card_limit !== undefined) {
        const lim = parseFloat(data.card_limit);
        if (isNaN(lim) || lim <= 0) {
          throw new AppError('Invalid credit limit. Enter a credit card limit greater than zero.', 400, null, 'INVALID_CARD_LIMIT', 'card_limit');
        }
      }

      // 3. Status (chk_creditcard_status)
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'BLOCKED', 'EXPIRED', 'CANCELLED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid credit card status. Select Active, Blocked, Expired, or Cancelled.', 400, null, 'INVALID_CARD_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'employee': {
      // 1. Salary (check_salary)
      if (data.salary !== undefined) {
        const sal = parseFloat(data.salary);
        if (isNaN(sal) || sal < 0) {
          throw new AppError('Salary cannot be negative. Enter a valid non-negative compensation amount.', 400, null, 'INVALID_EMPLOYEE_SALARY', 'salary');
        }
      }

      // 2. Status (chk_employee_status)
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE', 'TERMINATED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid employee status. Select Active, Inactive, Suspended, On Leave, or Terminated.', 400, null, 'INVALID_EMPLOYEE_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'responsible_for': {
      // 1. Role Type (chk_responsible_role)
      if (data.role_type !== undefined) {
        const roleVal = String(data.role_type || '').trim().toUpperCase();
        const validRoles = ['BRANCH_MANAGER', 'LOAN_OFFICER', 'TELLER_SUPERVISOR', 'OPERATIONAL_SUPERVISOR', 'AUDIT_OFFICER'];
        if (!validRoles.includes(roleVal)) {
          throw new AppError('Invalid operational responsibility role. Select Branch Manager, Loan Officer, Teller Supervisor, Operational Supervisor, or Audit Officer.', 400, null, 'INVALID_ROLE_TYPE', 'role_type');
        }
        data.role_type = roleVal;
      }

      // 2. Status (chk_responsible_status)
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'COMPLETED', 'REVOKED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid duty assignment status. Select Active, Completed, or Revoked.', 400, null, 'INVALID_ASSIGNMENT_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'customer': {
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid customer status. Select Active, Inactive, or Suspended.', 400, null, 'INVALID_CUSTOMER_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'customer_phone': {
      if (data.phone_type !== undefined) {
        const typeVal = String(data.phone_type || '').trim().toUpperCase();
        const validTypes = ['MOBILE', 'HOME', 'WORK', 'OTHER'];
        if (!validTypes.includes(typeVal)) {
          throw new AppError('Invalid phone type. Select Mobile, Home, Work, or Other.', 400, null, 'INVALID_PHONE_TYPE', 'phone_type');
        }
        data.phone_type = typeVal;
      }
      break;
    }

    case 'branch': {
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['ACTIVE', 'INACTIVE', 'CLOSED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid branch status. Select Active, Inactive, or Closed.', 400, null, 'INVALID_BRANCH_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    case 'transaction': {
      if (data.type !== undefined) {
        const typeVal = String(data.type || '').trim().toUpperCase();
        const validTypes = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'INTEREST', 'FEE'];
        if (!validTypes.includes(typeVal)) {
          throw new AppError('Invalid transaction type. Select Deposit, Withdrawal, Transfer, Interest, or Fee.', 400, null, 'INVALID_TRANSACTION_TYPE', 'type');
        }
        data.type = typeVal;
      }
      if (data.mode !== undefined) {
        const modeVal = String(data.mode || '').trim().toUpperCase();
        const validModes = ['ONLINE', 'ATM', 'CASH', 'BRANCH', 'UPI', 'NEFT', 'RTGS'];
        if (!validModes.includes(modeVal)) {
          throw new AppError('Invalid transaction channel. Select Online, ATM, Cash, Branch, UPI, NEFT, or RTGS.', 400, null, 'INVALID_TRANSACTION_MODE', 'mode');
        }
        data.mode = modeVal;
      }
      if (data.amount !== undefined) {
        const amt = parseFloat(data.amount);
        if (isNaN(amt) || amt <= 0) {
          throw new AppError('Invalid transaction amount. Enter an amount greater than zero.', 400, null, 'INVALID_TRANSACTION_AMOUNT', 'amount');
        }
      }
      if (data.status !== undefined) {
        const statusVal = String(data.status || '').trim().toUpperCase();
        const validStatuses = ['SUCCESS', 'PENDING', 'FAILED', 'REVERSED'];
        if (!validStatuses.includes(statusVal)) {
          throw new AppError('Invalid transaction status. Select Success, Pending, Failed, or Reversed.', 400, null, 'INVALID_TRANSACTION_STATUS', 'status');
        }
        data.status = statusVal;
      }
      break;
    }

    default:
      break;
  }
}

async function createEntity(entityName, data, { empId = null, ipAddress = null } = {}) {
  const cfg = getEntityConfig(entityName);

  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid payload. Expected JSON object.', 400);
  }

  // Canonical normalization and pre-query validation
  normalizeAndValidatePayload(entityName, data, false);

  // Filter allowed fields only
  const keys = Object.keys(data).filter((k) => cfg.allowedFields.includes(k.toLowerCase()));
  if (keys.length === 0) {
    throw new AppError(`No valid fields provided. Allowed fields: ${cfg.allowedFields.join(', ')}`, 400);
  }

  const cols = keys.map((k) => `"${k.toLowerCase()}"`).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => data[k]);

  const sql = `
    INSERT INTO "${cfg.table}" (${cols})
    VALUES (${placeholders})
    RETURNING *;
  `;

  const result = await db.query(sql, values);
  const created = result.rows[0];

  // Audit
  await recordAudit({
    empId,
    action: `CREATE_${cfg.table.toUpperCase()}`,
    entityName: cfg.table.toUpperCase(),
    entityId: String(created[cfg.pk] || 'NEW'),
    details: created,
    ipAddress
  });

  return created;
}

/**
 * Update an existing record
 */
async function updateEntity(entityName, id, data, { subId = null, empId = null, ipAddress = null } = {}) {
  const cfg = getEntityConfig(entityName);

  if (cfg.table === 'audit_log' || (cfg.updatableFields && cfg.updatableFields.length === 0)) {
    throw new AppError('Audit logs and security records are strictly immutable and cannot be updated.', 403);
  }

  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid payload. Expected JSON object.', 400);
  }

  // Canonical normalization and pre-query validation
  normalizeAndValidatePayload(entityName, data, true);

  // Filter allowed updatable fields excluding primary keys
  const allowedUpdates = cfg.updatableFields || cfg.allowedFields.filter((f) => f !== cfg.pk);
  const keys = Object.keys(data).filter(
    (k) => allowedUpdates.includes(k.toLowerCase()) && k.toLowerCase() !== cfg.pk
  );

  if (keys.length === 0) {
    throw new AppError(`No valid updatable fields provided in payload. Allowed editable fields: ${allowedUpdates.join(', ')}`, 400);
  }

  const setClauses = keys.map((k, i) => `"${k.toLowerCase()}" = $${i + 1}`).join(', ');
  const values = keys.map((k) => data[k]);

  // Determine WHERE condition (handling composite primary keys)
  let whereClause = `"${cfg.pk}" = $${values.length + 1}`;
  values.push(id);

  if (cfg.table === 'account_holder') {
    const targetCid = subId || data.cid;
    if (!targetCid) {
      throw new AppError('Customer ID (cid) is required to identify account_holder relationship.', 400);
    }
    values.push(targetCid);
    whereClause = `"acc_id" = $${values.length - 1} AND "cid" = $${values.length}`;
  } else if (cfg.table === 'customer_phone') {
    const targetPhone = subId || data.old_phone || data.current_phone;
    if (targetPhone) {
      values.push(targetPhone);
      whereClause = `"cid" = $${values.length - 1} AND "phone" = $${values.length}`;
    }
  }

  const sql = `
    UPDATE "${cfg.table}"
    SET ${setClauses}
    WHERE ${whereClause}
    RETURNING *;
  `;

  const result = await db.query(sql, values);
  if (result.rows.length === 0) {
    throw new AppError(`Record in '${cfg.table}' matching identifier '${id}' not found.`, 404);
  }

  const updated = result.rows[0];

  await recordAudit({
    empId,
    action: `UPDATE_${cfg.table.toUpperCase()}`,
    entityName: cfg.table.toUpperCase(),
    entityId: subId ? `${id}-${subId}` : String(id),
    details: updated,
    ipAddress
  });

  return updated;
}

/**
 * Delete a record with referential safeguards
 */
async function deleteEntity(entityName, id, subId = null, { empId = null, ipAddress = null } = {}) {
  const deletionService = require('./deletionService');
  const preview = await deletionService.getDeletePreview(entityName, id, subId);
  if (preview.isBlocked) {
    throw new AppError(`Deletion blocked: ${preview.blockReasons.join(' ')}`, 400);
  }
  if (preview.hasProtectedHistory && entityName === 'customer') {
    throw new AppError(
      `Deletion of customer #${id} requires confirmation: record has active account/loan relationships. Use the permanent deletion confirmation endpoint.`,
      400
    );
  }
  if (preview.hasProtectedHistory && entityName === 'account') {
    throw new AppError(
      `Deletion of account #${id} requires confirmation: record has positive balance & transaction history. Use the permanent deletion confirmation endpoint.`,
      400
    );
  }
  if (preview.hasProtectedHistory && entityName === 'branch') {
    throw new AppError(
      `Deletion of branch #${id} requires confirmation: record has active employee or account dependencies. Use the permanent deletion confirmation endpoint.`,
      400
    );
  }
  return await deletionService.confirmPermanentDelete(entityName, id, subId, { empId, ipAddress });
}

module.exports = {
  listEntities,
  getEntityById,
  createEntity,
  updateEntity,
  deleteEntity,
  ENTITY_CONFIG
};
