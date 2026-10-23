/**
 * SQL Query Workbench Backend Route & Safeguard Policy
 * Implements strict read-only query execution, statement timeout, row limits,
 * multi-statement rejection, and protection against administrative privilege escalation.
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/auditService');

// Blocklist of administrative, destructive, secret-access, and session-altering commands
const PROHIBITED_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bSET\s+CLUSTER\b/i,
  /\bpg_shadow\b/i,
  /\bpg_authid\b/i,
  /\bsystem\.users\b/i,
  /\bcrdb_internal\.node_build_info\b/i,
];

/**
 * Validate query against strict read-only security policy
 */
function validateQuerySafety(queryStr) {
  if (!queryStr || typeof queryStr !== 'string') {
    return { valid: false, reason: 'Query string must be provided.' };
  }

  // Strip line comments (-- ...) and block comments (/* ... */) to prevent obfuscation
  const stripped = queryStr
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (stripped.length === 0) {
    return { valid: false, reason: 'Empty query or query contains only comments.' };
  }

  // Prevent multiple statements (semicolon chaining)
  const statements = stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    return {
      valid: false,
      reason: 'Multiple statements are forbidden. Only single statements may be executed in workbench mode.'
    };
  }

  const singleQuery = statements[0];

  // Enforce strictly read-only commands: SELECT, WITH, SHOW, EXPLAIN
  const isReadOnly = /^\s*(SELECT|WITH|SHOW|EXPLAIN)\b/i.test(singleQuery);
  if (!isReadOnly) {
    return {
      valid: false,
      reason: 'Execution rejected: Only read-only queries (SELECT, WITH, SHOW, EXPLAIN) are permitted in the Workbench sandbox.'
    };
  }

  // Check prohibited security patterns
  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(singleQuery)) {
      return {
        valid: false,
        reason: `Disallowed operation detected: Pattern matches restricted expression (${pattern.source}). Data modification and system administration commands are strictly forbidden.`
      };
    }
  }

  return {
    valid: true,
    isReadOnly: true,
    cleanedQuery: singleQuery
  };
}

/**
 * GET /api/workbench/policy
 * Returns the active safety policy and permissions model
 */
router.get('/policy', (req, res) => {
  res.json({
    success: true,
    policy: {
      mode: 'STRICT_READ_ONLY',
      statementTimeoutMs: 5000,
      maxRowLimit: 500,
      multipleStatementsAllowed: false,
      allowedOperations: ['SELECT', 'WITH (read-only)', 'SHOW', 'EXPLAIN'],
      prohibitedCommands: ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'USER MANAGEMENT'],
      description: 'Guarded read-only execution sandbox enforcing 5000ms timeouts and 500-row caps.'
    }
  });
});

/**
 * POST /api/workbench/validate
 * Validates a query string without executing it
 */
router.post('/validate', (req, res) => {
  const { query: queryStr } = req.body;
  const validation = validateQuerySafety(queryStr);
  res.json({ success: true, validation });
});

/**
 * POST /api/workbench/execute
 * Executes an authorized read-only query under 5-second timeout and 500-row cap
 */
router.post('/execute', async (req, res, next) => {
  const { query: queryStr } = req.body;
  const ipAddress = req.ip || req.headers['x-forwarded-for'];

  const validation = validateQuerySafety(queryStr);
  if (!validation.valid) {
    return next(new AppError(validation.reason, 403));
  }

  const client = await db.pool.connect();
  const startTime = Date.now();

  try {
    // 1. Enforce 5000ms statement timeout
    await client.query("SET statement_timeout = '5000ms';");

    // 2. Execute query
    const result = await client.query(validation.cleanedQuery);
    const duration = Date.now() - startTime;

    // 3. Apply maxRowLimit (500 rows)
    const maxRowLimit = 500;
    const isTruncated = result.rows && result.rows.length > maxRowLimit;
    const finalRows = isTruncated ? result.rows.slice(0, maxRowLimit) : (result.rows || []);

    // 4. Audit execution
    await recordAudit({
      actorType: 'SYSTEM',
      action: 'WORKBENCH_QUERY',
      entityName: 'SQL_QUERY',
      details: {
        query: validation.cleanedQuery.substring(0, 300),
        rowCount: finalRows.length,
        durationMs: duration
      },
      ipAddress
    });

    res.json({
      success: true,
      query: validation.cleanedQuery,
      rowCount: result.rowCount || finalRows.length,
      returnedRows: finalRows.length,
      isTruncated,
      durationMs: duration,
      fields: result.fields ? result.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) : [],
      data: finalRows
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    res.status(400).json({
      success: false,
      error: 'Query execution failed.',
      message: err.message,
      code: err.code || null,
      position: err.position || null,
      durationMs: duration
    });
  } finally {
    await client.query("RESET statement_timeout;").catch(() => {});
    client.release();
  }
});

module.exports = router;
