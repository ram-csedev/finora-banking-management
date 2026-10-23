const express = require('express');
const router = express.Router();
const bankingService = require('../services/bankingService');

/**
 * POST /api/banking/deposit
 * Deposit funds into an account
 */
router.post('/deposit', async (req, res, next) => {
  try {
    const { acc_id, amount, mode, description, emp_id } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await bankingService.processDeposit({
      acc_id,
      amount,
      mode,
      description,
      emp_id,
      ipAddress
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/banking/withdraw
 * Withdraw funds from an account
 */
router.post('/withdraw', async (req, res, next) => {
  try {
    const { acc_id, amount, mode, description, emp_id } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await bankingService.processWithdrawal({
      acc_id,
      amount,
      mode,
      description,
      emp_id,
      ipAddress
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/banking/transfer
 * Inter-account atomic transfer with linked transactions
 */
router.post('/transfer', async (req, res, next) => {
  try {
    const { from_acc, to_acc, amount, mode, description, emp_id } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await bankingService.processTransfer({
      from_acc,
      to_acc,
      amount,
      mode,
      description,
      emp_id,
      ipAddress
    });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/banking/loan-payment
 * Record loan installment payment
 */
router.post('/loan-payment', async (req, res, next) => {
  try {
    const { l_id, amount, principal_amount, interest_amount, payment_mode, remarks, emp_id } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const result = await bankingService.processLoanPayment({
      l_id,
      amount,
      principal_amount,
      interest_amount,
      payment_mode,
      remarks,
      emp_id,
      ipAddress
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
