const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * Dashboard Summary View (Aggregates)
 */
router.get('/summary', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dashboard_summary;');
    res.json({
      success: true,
      data: result.rows[0] || {}
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Customer Dashboard View
 */
router.get('/customers', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const result = await db.query('SELECT * FROM customer_dashboard LIMIT $1;', [limit]);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Transaction Dashboard View
 */
router.get('/transactions', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const result = await db.query('SELECT * FROM transaction_dashboard LIMIT $1;', [limit]);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Loan Dashboard View
 */
router.get('/loans', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const result = await db.query('SELECT * FROM loan_dashboard LIMIT $1;', [limit]);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Credit Card Dashboard View
 */
router.get('/creditcards', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const result = await db.query('SELECT * FROM creditcard_dashboard LIMIT $1;', [limit]);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
