const express = require('express');
const router = express.Router();
const metadataService = require('../services/metadataService');

/**
 * GET /api/metadata/tables
 * List all application tables and views with row counts and column totals
 */
router.get('/tables', async (req, res, next) => {
  try {
    const tables = await metadataService.getTables();
    res.json({ success: true, count: tables.length, data: tables });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metadata/columns/:table
 * Detailed column metadata for a given table or view
 */
router.get('/columns/:table', async (req, res, next) => {
  try {
    const columns = await metadataService.getColumns(req.params.table);
    res.json({ success: true, table: req.params.table, count: columns.length, data: columns });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metadata/indexes/:table
 * Index definitions for a table
 */
router.get('/indexes/:table', async (req, res, next) => {
  try {
    const indexes = await metadataService.getIndexes(req.params.table);
    res.json({ success: true, table: req.params.table, count: indexes.length, data: indexes });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metadata/constraints/:table
 * Constraints (PK, FK, CHECK, UNIQUE) for a table
 */
router.get('/constraints/:table', async (req, res, next) => {
  try {
    const constraints = await metadataService.getConstraints(req.params.table);
    res.json({ success: true, table: req.params.table, count: constraints.length, data: constraints });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metadata/relationships
 * Foreign key relationships representing ER diagram edges
 */
router.get('/relationships', async (req, res, next) => {
  try {
    const rels = await metadataService.getRelationships();
    res.json({ success: true, count: rels.length, data: rels });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/metadata/schema
 * Complete schema graph (nodes & edges) for ER diagram and DB Explorer
 */
router.get('/schema', async (req, res, next) => {
  try {
    const fullSchema = await metadataService.getFullSchema();
    res.json({ success: true, data: fullSchema });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
