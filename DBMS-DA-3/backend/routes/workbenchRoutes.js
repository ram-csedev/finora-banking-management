/**
 * Finora DA3 — SQL Query Workbench Backend Route & Safeguard Policy
 *
 * Implements strict, multi-layered read-only query execution:
 *  1. SQL-aware lexical tokenization: masks string literals & comments to eliminate false positives
 *  2. Single-statement enforcement (blocks semicolon chaining outside string literals)
 *  3. Structural AST blocklist (blocks DDL, DML mutations, privilege escalation, and secret tables)
 *  4. Database-level read-only transaction (BEGIN TRANSACTION READ ONLY) preventing any engine-level mutation
 *  5. Hard 5000ms statement timeout (SET statement_timeout = '5000ms')
 *  6. 500-row result set cap
 *  7. Credential redaction in error messages
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../services/auditService');

// Blocklist of administrative, destructive, secret-access, and session-altering commands
// Evaluated ONLY against SQL structural tokens outside string literals and comments
const PROHIBITED_STRUCTURAL_PATTERNS = [
  { pattern: /\bDROP\b/i, name: 'DROP' },
  { pattern: /\bTRUNCATE\b/i, name: 'TRUNCATE' },
  { pattern: /\bALTER\b/i, name: 'ALTER' },
  { pattern: /\bCREATE\b/i, name: 'CREATE' },
  { pattern: /\bINSERT\b/i, name: 'INSERT' },
  { pattern: /\bUPDATE\b/i, name: 'UPDATE' },
  { pattern: /\bDELETE\b/i, name: 'DELETE' },
  { pattern: /\bGRANT\b/i, name: 'GRANT' },
  { pattern: /\bREVOKE\b/i, name: 'REVOKE' },
  { pattern: /\bSET\s+CLUSTER\b/i, name: 'SET CLUSTER' },
  { pattern: /\bpg_shadow\b/i, name: 'pg_shadow' },
  { pattern: /\bpg_authid\b/i, name: 'pg_authid' },
  { pattern: /\bsystem\.users\b/i, name: 'system.users' },
  { pattern: /\bcrdb_internal\.node_build_info\b/i, name: 'node_build_info' },
  { pattern: /\bpg_terminate_backend\b/i, name: 'pg_terminate_backend' },
  { pattern: /\bpg_cancel_backend\b/i, name: 'pg_cancel_backend' },
  { pattern: /\bpg_read_file\b/i, name: 'pg_read_file' },
  { pattern: /\bpg_write_file\b/i, name: 'pg_write_file' }
];

/**
 * Strips comments (-- line comments and /* block comments *\/)
 */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
}

/**
 * Splits SQL statements by semicolon while respecting single quotes and dollar quotes
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    // Handle single quote string literal ('...')
    if (!inDollar && char === "'") {
      if (inString && nextChar === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += char;
      continue;
    }

    // Handle dollar-quoted string literal ($$...$$ or $tag$...$tag$)
    if (!inString && char === '$') {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
          current += tag;
          i += tag.length - 1;
          continue;
        } else if (sql.slice(i, i + dollarTag.length) === dollarTag) {
          inDollar = false;
          current += dollarTag;
          i += dollarTag.length - 1;
          dollarTag = '';
          continue;
        }
      }
    }

    // Semicolon outside of any string literal
    if (!inString && !inDollar && char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Masks string literals to empty strings so keywords inside data literals (e.g. 'UPDATE')
 * are not falsely flagged as prohibited structural commands.
 */
function maskStringLiterals(sql) {
  let result = '';
  let inString = false;
  let inDollar = false;
  let dollarTag = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';

    if (!inDollar && char === "'") {
      if (inString && nextChar === "'") {
        i++;
        continue;
      }
      inString = !inString;
      if (!inString) result += "''";
      continue;
    }

    if (!inString && char === '$') {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        if (!inDollar) {
          inDollar = true;
          dollarTag = tag;
          i += tag.length - 1;
          continue;
        } else if (sql.slice(i, i + dollarTag.length) === dollarTag) {
          inDollar = false;
          result += "''";
          i += dollarTag.length - 1;
          dollarTag = '';
          continue;
        }
      }
    }

    if (!inString && !inDollar) {
      result += char;
    }
  }

  return result;
}

/**
 * Validate query against strict read-only security policy
 */
function validateQuerySafety(queryStr) {
  if (!queryStr || typeof queryStr !== 'string') {
    return { valid: false, reason: 'Query string must be provided.' };
  }

  const stripped = stripComments(queryStr);
  if (stripped.length === 0) {
    return { valid: false, reason: 'Empty query or query contains only comments.' };
  }

  // Prevent multiple statements (semicolon chaining outside quotes)
  const statements = splitStatements(stripped);

  if (statements.length > 1) {
    return {
      valid: false,
      reason: 'Multiple statements are forbidden. Only single statements may be executed in workbench mode.'
    };
  }

  const singleQuery = statements[0];

  // Enforce permitted read-only command roots: SELECT, WITH, SHOW, EXPLAIN, TABLE
  const isReadOnly = /^\s*(SELECT|WITH|SHOW|EXPLAIN|TABLE)\b/i.test(singleQuery);
  if (!isReadOnly) {
    return {
      valid: false,
      reason: 'Execution rejected: Only read-only queries (SELECT, WITH, SHOW, EXPLAIN, TABLE) are permitted in the Workbench sandbox.'
    };
  }

  // Mask string literals to evaluate structural tokens without false positives
  const maskedQuery = maskStringLiterals(singleQuery);

  // Check structural tokens for prohibited operations
  for (const item of PROHIBITED_STRUCTURAL_PATTERNS) {
    if (item.pattern.test(maskedQuery)) {
      return {
        valid: false,
        reason: `Disallowed operation detected: Pattern matches restricted expression (${item.name}). Data modification and system administration commands are strictly forbidden.`
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
      allowedOperations: ['SELECT', 'WITH (read-only)', 'SHOW', 'EXPLAIN', 'TABLE'],
      prohibitedCommands: ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'USER MANAGEMENT'],
      description: 'Guarded read-only execution sandbox enforcing database-level read-only transactions, 5000ms timeouts, and 500-row caps.'
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

    // 2. Open strictly READ ONLY transaction (CockroachDB engine-level write protection)
    await client.query("BEGIN TRANSACTION READ ONLY;");

    // 3. Execute query
    const result = await client.query(validation.cleanedQuery);
    const duration = Date.now() - startTime;

    // 4. Commit read-only transaction
    await client.query("COMMIT;");

    // 5. Apply maxRowLimit (500 rows)
    const maxRowLimit = 500;
    const isTruncated = result.rows && result.rows.length > maxRowLimit;
    const finalRows = isTruncated ? result.rows.slice(0, maxRowLimit) : (result.rows || []);

    // 6. Audit execution
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
    // Roll back read-only transaction on error
    await client.query("ROLLBACK;").catch(() => {});
    const duration = Date.now() - startTime;

    let safeMessage = err.message || 'Query execution failed.';
    // Scrub database credentials if any leaked in error string
    safeMessage = safeMessage.replace(/(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@/gi, '$1$2:****@');

    res.status(400).json({
      success: false,
      error: safeMessage,
      message: safeMessage,
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
