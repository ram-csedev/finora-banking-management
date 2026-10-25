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
    allowedFields: ['b_id', 'branch_name', 'city', 'state', 'pincode', 'ifsc', 'contact', 'status'],
    updatableFields: ['branch_name', 'city', 'state', 'pincode', 'contact', 'status'],
    searchFields: ['branch_name', 'city', 'ifsc', 'status']
  },
  employee: {
    table: 'employee',
    pk: 'emp_id',
    allowedFields: ['emp_id', 'first_name', 'last_name', 'salary', 'hire_date', 'b_id', 'email', 'status'],
    updatableFields: ['first_name', 'last_name', 'salary', 'hire_date', 'b_id', 'email', 'status'],
    searchFields: ['first_name', 'last_name', 'email', 'status']
  },
  customer: {
    table: 'customer',
    pk: 'cid',
    allowedFields: ['cid', 'pan', 'first_name', 'last_name', 'city', 'state', 'pincode', 'dob', 'emp_id', 'email', 'status'],
    updatableFields: ['first_name', 'last_name', 'city', 'state', 'pincode', 'dob', 'emp_id', 'email', 'status'],
    searchFields: ['first_name', 'last_name', 'pan', 'city', 'email', 'status']
  },
  customer_phone: {
    table: 'customer_phone',
    pk: 'cid',
    compositePks: ['cid', 'phone'],
    allowedFields: ['cid', 'phone', 'phone_type', 'is_primary'],
    updatableFields: ['phone', 'phone_type', 'is_primary'],
    searchFields: ['phone']
  },
  account: {
    table: 'account',
    pk: 'acc_id',
    allowedFields: ['acc_id', 'b_id', 'balance', 'status', 'acc_type'],
    updatableFields: ['b_id', 'status', 'acc_type'], // Balance is ledger-driven only
    searchFields: ['status', 'acc_type']
  },
  account_holder: {
    table: 'account_holder',
    pk: 'acc_id',
    compositePks: ['acc_id', 'cid'],
    allowedFields: ['acc_id', 'cid', 'ownership_role', 'is_primary', 'share_percentage'],
    updatableFields: ['ownership_role', 'is_primary', 'share_percentage'],
    searchFields: ['ownership_role']
  },
  nominee: {
    table: 'nominee',
    pk: 'n_id',
    allowedFields: ['n_id', 'acc_id', 'cid', 'first_name', 'last_name', 'relationship', 'dob', 'contact_phone'],
    updatableFields: ['first_name', 'last_name', 'relationship', 'dob', 'contact_phone'],
    searchFields: ['first_name', 'last_name', 'relationship']
  },
  creditcard: {
    table: 'creditcard',
    pk: 'pno',
    allowedFields: ['pno', 'cid', 'type', 'card_limit', 'expiry', 'status', 'cvv'],
    updatableFields: ['type', 'card_limit', 'expiry', 'status'], // pno, cid, cvv protected
    searchFields: ['type', 'status']
  },
  loan: {
    table: 'loan',
    pk: 'l_id',
    allowedFields: ['l_id', 'cid', 'l_type', 'amount', 'interest', 'term', 'start_date', 'status', 'assigned_emp_id'],
    updatableFields: ['interest', 'term', 'status', 'assigned_emp_id', 'l_type'], // amount and start_date protected
    searchFields: ['l_type', 'status']
  },
  loan_payment: {
    table: 'loan_payment',
    pk: 'payment_id',
    allowedFields: ['payment_id', 'l_id', 'payment_date', 'amount', 'principal_amount', 'interest_amount', 'payment_mode', 'status', 'remarks'],
    updatableFields: ['remarks', 'payment_mode'], // amounts and loan pointers protected
    searchFields: ['payment_mode', 'status']
  },
  beneficiary: {
    table: 'beneficiary',
    pk: 'beneficiary_id',
    allowedFields: ['beneficiary_id', 'cid', 'nickname', 'beneficiary_name', 'destination_account_num', 'destination_ifsc', 'bank_name', 'internal_acc_id', 'is_verified'],
    updatableFields: ['nickname', 'beneficiary_name', 'destination_account_num', 'destination_ifsc', 'bank_name', 'internal_acc_id', 'is_verified'],
    searchFields: ['nickname', 'beneficiary_name', 'destination_ifsc']
  },
  transaction: {
    table: 'transaction',
    pk: 't_id',
    allowedFields: ['t_id', 'acc_id', 'trans_date', 'type', 'amount', 'mode', 'status', 'related_acc_id', 'related_trans_id', 'description', 'processed_by_emp_id'],
    updatableFields: ['description'], // Only narration memo is editable; ledger amounts/accounts immutable
    searchFields: ['type', 'mode', 'status', 'description']
  },
  audit_log: {
    table: 'audit_log',
    pk: 'log_id',
    allowedFields: ['log_id', 'emp_id', 'actor_type', 'actor_id', 'action', 'entity_name', 'entity_id', 'details', 'ip_address'],
    updatableFields: [], // Strictly immutable audit records
    searchFields: ['action', 'entity_name', 'actor_id']
  },
  responsible_for: {
    table: 'responsible_for',
    pk: 'rf_id',
    allowedFields: ['rf_id', 'emp_id', 'b_id', 'role_type', 'l_id', 't_id', 'assigned_date', 'status', 'notes'],
    updatableFields: ['emp_id', 'b_id', 'role_type', 'status', 'notes', 'l_id', 't_id'],
    searchFields: ['role_type', 'status']
  }
};

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

  if (search && cfg.searchFields.length > 0) {
    const searchConditions = cfg.searchFields.map((f) => `"${f}"::text ILIKE $${paramIdx}`);
    whereClauses.push(`(${searchConditions.join(' OR ')})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  // Exact matching for valid entity fields in filters
  if (filters && typeof filters === 'object') {
    for (const [key, value] of Object.entries(filters)) {
      const lowerKey = key.toLowerCase();
      if (
        cfg.allowedFields.includes(lowerKey) &&
        value !== undefined &&
        value !== null &&
        value !== '' &&
        String(value).trim().toLowerCase() !== 'all'
      ) {
        whereClauses.push(`"${lowerKey}"::text = $${paramIdx}`);
        params.push(String(value).trim());
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
async function createEntity(entityName, data, { empId = null, ipAddress = null } = {}) {
  const cfg = getEntityConfig(entityName);

  if (!data || typeof data !== 'object') {
    throw new AppError('Invalid payload. Expected JSON object.', 400);
  }

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
