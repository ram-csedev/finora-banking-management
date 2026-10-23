const express = require('express');
const router = express.Router();
const entityService = require('../services/entityService');

// Map convenience plural & singular routes to canonical entity names
const ALIAS_MAP = {
  branches: 'branch',
  branch: 'branch',
  employees: 'employee',
  employee: 'employee',
  customers: 'customer',
  customer: 'customer',
  accounts: 'account',
  account: 'account',
  nominees: 'nominee',
  nominee: 'nominee',
  creditcards: 'creditcard',
  creditcard: 'creditcard',
  'credit-cards': 'creditcard',
  'credit_card': 'creditcard',
  loans: 'loan',
  loan: 'loan',
  'loan-payments': 'loan_payment',
  'loan_payments': 'loan_payment',
  loan_payment: 'loan_payment',
  beneficiaries: 'beneficiary',
  beneficiary: 'beneficiary',
  transactions: 'transaction',
  transaction: 'transaction',
  'audit-logs': 'audit_log',
  'audit_logs': 'audit_log',
  audit_log: 'audit_log',
  'responsible-for': 'responsible_for',
  'responsible_for': 'responsible_for',
  'customer-phones': 'customer_phone',
  'customer_phones': 'customer_phone',
  customer_phone: 'customer_phone',
  'account-holders': 'account_holder',
  'account_holders': 'account_holder',
  account_holder: 'account_holder'
};

/**
 * Handle listing records
 */
async function handleList(entityName, req, res, next) {
  try {
    const { page, limit, search, sortBy, sortOrder, ...filters } = req.query;
    const result = await entityService.listEntities(entityName, {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      filters
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle single record retrieval
 */
async function handleGetById(entityName, req, res, next) {
  try {
    const record = await entityService.getEntityById(entityName, req.params.id);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle create record
 */
async function handleCreate(entityName, req, res, next) {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const created = await entityService.createEntity(entityName, req.body, { ipAddress });
    res.status(201).json({ success: true, message: `${entityName} created successfully.`, data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle update record (supporting composite subId)
 */
async function handleUpdate(entityName, req, res, next) {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const updated = await entityService.updateEntity(
      entityName,
      req.params.id,
      req.body,
      { subId: req.params.subId, ipAddress }
    );
    res.json({ success: true, message: `${entityName} updated successfully.`, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle delete record (supporting composite subId)
 */
async function handleDelete(entityName, req, res, next) {
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await entityService.deleteEntity(
      entityName,
      req.params.id,
      req.params.subId,
      { ipAddress }
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// Universal /api/entities/:entity routes (with and without composite subId)
// ----------------------------------------------------------------------------
router.get('/entities/:entity', (req, res, next) => handleList(req.params.entity, req, res, next));
router.get('/entities/:entity/:id', (req, res, next) => handleGetById(req.params.entity, req, res, next));
router.post('/entities/:entity', (req, res, next) => handleCreate(req.params.entity, req, res, next));
router.put('/entities/:entity/:id', (req, res, next) => handleUpdate(req.params.entity, req, res, next));
router.put('/entities/:entity/:id/:subId', (req, res, next) => handleUpdate(req.params.entity, req, res, next));
router.delete('/entities/:entity/:id', (req, res, next) => handleDelete(req.params.entity, req, res, next));
router.delete('/entities/:entity/:id/:subId', (req, res, next) => handleDelete(req.params.entity, req, res, next));

// ----------------------------------------------------------------------------
// Specific Entity aliases (/api/customers, /api/loans, /api/branches, etc.)
// ----------------------------------------------------------------------------
for (const [alias, singular] of Object.entries(ALIAS_MAP)) {
  router.get(`/${alias}`, (req, res, next) => handleList(singular, req, res, next));
  router.get(`/${alias}/:id`, (req, res, next) => handleGetById(singular, req, res, next));
  router.post(`/${alias}`, (req, res, next) => handleCreate(singular, req, res, next));
  router.put(`/${alias}/:id`, (req, res, next) => handleUpdate(singular, req, res, next));
  router.put(`/${alias}/:id/:subId`, (req, res, next) => handleUpdate(singular, req, res, next));
  router.delete(`/${alias}/:id`, (req, res, next) => handleDelete(singular, req, res, next));
  router.delete(`/${alias}/:id/:subId`, (req, res, next) => handleDelete(singular, req, res, next));
}

module.exports = router;
