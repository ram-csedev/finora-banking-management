/**
 * Audit Logging Service
 * Records administrative, security, and banking events in audit_log.
 * Strips secrets, passwords, CVVs, and credentials.
 */
const db = require('../config/db');

const SENSITIVE_KEYS = new Set(['password', 'cvv', 'secret', 'token', 'authorization', 'credential', 'api_key']);

function sanitizeDetails(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeDetails);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeDetails(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Record an audit event into audit_log
 * Can accept either an external client (if part of an existing transaction) or use the general pool.
 */
async function recordAudit({
  client = null,
  empId = null,
  actorType = 'SYSTEM',
  actorId = null,
  action,
  entityName,
  entityId = null,
  details = null,
  ipAddress = null
}) {
  const sanitized = sanitizeDetails(details);
  const sql = `
    INSERT INTO audit_log (emp_id, actor_type, actor_id, action, entity_name, entity_id, details, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING log_id, created_at;
  `;
  const params = [
    empId,
    actorType,
    actorId ? String(actorId) : (empId ? String(empId) : 'SYSTEM'),
    action,
    entityName,
    entityId ? String(entityId) : null,
    sanitized ? JSON.stringify(sanitized) : null,
    ipAddress || '127.0.0.1'
  ];

  try {
    if (client) {
      const res = await client.query(sql, params);
      return res.rows[0];
    } else {
      const res = await db.query(sql, params);
      return res.rows[0];
    }
  } catch (err) {
    // Audit logging should not crash the primary operation unless strictly required,
    // but in banking transactions it's captured inside the transaction.
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  recordAudit,
  sanitizeDetails
};
