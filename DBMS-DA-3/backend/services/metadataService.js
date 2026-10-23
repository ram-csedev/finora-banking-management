/**
 * Metadata and Database Explorer Service
 * Introspects CockroachDB information_schema and pg_catalog to produce
 * rich schema metadata, constraints, indexes, views, and ER diagram nodes/edges.
 */
const db = require('../config/db');

/**
 * Get all base tables and analytical views with row counts and column totals
 */
async function getTables() {
  const sql = `
    SELECT
      t.table_name,
      t.table_type,
      (
        SELECT count(*)::int
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name
      ) AS column_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type IN ('BASE TABLE', 'VIEW')
    ORDER BY t.table_type ASC, t.table_name ASC;
  `;
  const res = await db.query(sql);

  // Fetch row counts and view definitions
  const tables = [];
  for (const row of res.rows) {
    let rowCount = 0;
    let isExactCount = false;
    let viewDefinition = null;

    try {
      const countRes = await db.query(`SELECT count(*)::int AS count FROM "${row.table_name}"`);
      rowCount = countRes.rows[0].count;
      isExactCount = true;
    } catch (e) {
      rowCount = 0;
      isExactCount = false;
    }

    if (row.table_type === 'VIEW') {
      try {
        const vRes = await db.query(
          `SELECT view_definition FROM information_schema.views WHERE table_schema = 'public' AND table_name = $1`,
          [row.table_name]
        );
        if (vRes.rows.length > 0) {
          viewDefinition = vRes.rows[0].view_definition;
        }
      } catch (ve) {
        viewDefinition = null;
      }
    }

    tables.push({
      tableName: row.table_name,
      tableType: row.table_type,
      columnCount: row.column_count,
      rowCount,
      isExactCount,
      viewDefinition
    });
  }

  return tables;
}

/**
 * Get columns for a specific table or view
 */
async function getColumns(tableName) {
  const sql = `
    SELECT
      c.column_name,
      c.ordinal_position,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      CASE
        WHEN pk.column_name IS NOT NULL THEN true
        ELSE false
      END AS is_primary_key,
      CASE
        WHEN fk.column_name IS NOT NULL THEN true
        ELSE false
      END AS is_foreign_key,
      fk.foreign_table_name,
      fk.foreign_column_name
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.column_name = pk.column_name
    LEFT JOIN (
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
    ) fk ON c.column_name = fk.column_name
    WHERE c.table_schema = 'public' AND c.table_name = $1
    ORDER BY c.ordinal_position;
  `;

  const res = await db.query(sql, [tableName.toLowerCase()]);
  return res.rows;
}

/**
 * Get indexes for a specific table
 */
async function getIndexes(tableName) {
  const sql = `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    ORDER BY indexname;
  `;
  const res = await db.query(sql, [tableName.toLowerCase()]);
  return res.rows;
}

/**
 * Get constraints for a specific table
 */
async function getConstraints(tableName) {
  const sql = `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column,
      cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    LEFT JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name AND tc.table_schema = cc.constraint_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = $1
    ORDER BY tc.constraint_type, tc.constraint_name;
  `;
  const res = await db.query(sql, [tableName.toLowerCase()]);
  return res.rows;
}

/**
 * Get all foreign key relationships (graph edges for ER diagram)
 */
async function getRelationships() {
  const sql = `
    SELECT
      tc.constraint_name,
      tc.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name;
  `;
  const res = await db.query(sql);
  return res.rows;
}

/**
 * Get complete schema graph (tables, columns, PKs, FKs, relationships)
 */
async function getFullSchema() {
  const [tables, relationships] = await Promise.all([
    getTables(),
    getRelationships()
  ]);

  const schemaTables = await Promise.all(
    tables.map(async (t) => {
      const [columns, indexes, constraints] = await Promise.all([
        getColumns(t.tableName).catch(() => []),
        getIndexes(t.tableName).catch(() => []),
        getConstraints(t.tableName).catch(() => [])
      ]);
      return {
        ...t,
        columns,
        indexes,
        constraints
      };
    })
  );

  return {
    database: 'finora_da3',
    engine: 'CockroachDB CCL v26.2.7',
    totalTables: tables.filter(t => t.tableType === 'BASE TABLE').length,
    totalViews: tables.filter(t => t.tableType === 'VIEW').length,
    totalRelationships: relationships.length,
    tables: schemaTables,
    relationships
  };
}

module.exports = {
  getTables,
  getColumns,
  getIndexes,
  getConstraints,
  getRelationships,
  getFullSchema
};
