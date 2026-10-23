/**
 * Finora DA3 - Deletion & Lifecycle Management Routes
 * Handles live dependency previews, atomic deletions, and state transitions
 */
const express = require('express');
const router = express.Router();
const deletionService = require('../services/deletionService');

/**
 * Handle Deletion Preview
 */
async function handlePreview(req, res, next) {
  try {
    const { entity, id, subId } = req.params;
    const preview = await deletionService.getDeletePreview(entity, id, subId);
    res.json({
      success: true,
      data: preview
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Deletion Confirmation
 */
async function handleConfirmDelete(req, res, next) {
  try {
    const { entity, id, subId } = req.params;
    const { empId } = req.body || {};
    const ipAddress = req.ip || req.headers['x-forwarded-for'];

    const result = await deletionService.confirmPermanentDelete(entity, id, subId, {
      empId,
      ipAddress
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Lifecycle Action
 */
async function handleLifecycleAction(req, res, next) {
  try {
    const { entity, id } = req.params;
    const { action, reason, empId } = req.body || {};
    const ipAddress = req.ip || req.headers['x-forwarded-for'];

    const result = await deletionService.executeLifecycleAction(entity, id, action, {
      empId,
      ipAddress,
      reason
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// Universal /api/entities/:entity routes (with and without composite subId)
// ----------------------------------------------------------------------------
router.get('/entities/:entity/:id/delete-preview', handlePreview);
router.get('/entities/:entity/:id/:subId/delete-preview', handlePreview);
router.post('/entities/:entity/:id/delete-confirm', handleConfirmDelete);
router.post('/entities/:entity/:id/:subId/delete-confirm', handleConfirmDelete);
router.post('/entities/:entity/:id/lifecycle-action', handleLifecycleAction);
router.post('/entities/:entity/:id/:subId/lifecycle-action', handleLifecycleAction);

// ----------------------------------------------------------------------------
// Specific Entity Routes (/api/:entity/:id/...) - supporting both plural and singular
// ----------------------------------------------------------------------------
const ENTITY_ROUTES = [
  'customers', 'customer',
  'accounts', 'account',
  'creditcards', 'creditcard', 'credit-cards', 'credit_card',
  'loans', 'loan',
  'employees', 'employee',
  'branches', 'branch',
  'nominees', 'nominee',
  'beneficiaries', 'beneficiary',
  // Immutable financial records (Strict 403 Forbidden guards)
  'transactions', 'transaction',
  'loan-payments', 'loan_payments', 'loan_payment',
  'audit-logs', 'audit_logs', 'audit_log'
];

for (const entity of ENTITY_ROUTES) {
  router.get(`/${entity}/:id/delete-preview`, (req, res, next) => {
    req.params.entity = entity;
    return handlePreview(req, res, next);
  });
  router.post(`/${entity}/:id/delete-confirm`, (req, res, next) => {
    req.params.entity = entity;
    return handleConfirmDelete(req, res, next);
  });
  router.post(`/${entity}/:id/lifecycle-action`, (req, res, next) => {
    req.params.entity = entity;
    return handleLifecycleAction(req, res, next);
  });
}

// Sub-resources with composite keys (customer-phone, account-holder)
const COMPOSITE_ROUTES = [
  'customer-phones', 'customer_phone', 'customer_phones', 'customerphones',
  'account-holders', 'account_holder', 'account_holders', 'accountholders'
];

for (const entity of COMPOSITE_ROUTES) {
  router.get(`/${entity}/:id/:subId/delete-preview`, (req, res, next) => {
    req.params.entity = entity;
    return handlePreview(req, res, next);
  });
  router.post(`/${entity}/:id/:subId/delete-confirm`, (req, res, next) => {
    req.params.entity = entity;
    return handleConfirmDelete(req, res, next);
  });
  router.post(`/${entity}/:id/:subId/lifecycle-action`, (req, res, next) => {
    req.params.entity = entity;
    return handleLifecycleAction(req, res, next);
  });
}

// Nested sub-resource convenience routes (/customers/:id/phones/:subId, /accounts/:id/holders/:subId)
router.get(['/customers/:id/phones/:subId/delete-preview', '/customers/:id/phone/:subId/delete-preview'], (req, res, next) => {
  req.params.entity = 'customer_phone';
  return handlePreview(req, res, next);
});
router.post(['/customers/:id/phones/:subId/delete-confirm', '/customers/:id/phone/:subId/delete-confirm'], (req, res, next) => {
  req.params.entity = 'customer_phone';
  return handleConfirmDelete(req, res, next);
});

router.get(['/accounts/:id/holders/:subId/delete-preview', '/accounts/:id/holder/:subId/delete-preview'], (req, res, next) => {
  req.params.entity = 'account_holder';
  return handlePreview(req, res, next);
});
router.post(['/accounts/:id/holders/:subId/delete-confirm', '/accounts/:id/holder/:subId/delete-confirm'], (req, res, next) => {
  req.params.entity = 'account_holder';
  return handleConfirmDelete(req, res, next);
});

module.exports = router;
