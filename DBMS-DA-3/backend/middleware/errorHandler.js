/**
 * Finora DA3 — Centralized API Error Handling Middleware
 *
 * Provides safe, actionable, field-specific error messages for:
 *  - 23514: CHECK constraint violations (all 31 business checks mapped)
 *  - 23505: UNIQUE constraint violations (mapped by constraint and parsed key)
 *  - 23503: Foreign-key constraint violations (all 23 FKs mapped)
 *  - 23502: NOT NULL violations (extracts column name and field)
 *  - 22P02: Invalid data types / input formats
 *  - 22001: String length truncation
 *  - 22003: Numeric value out of range
 *  - 40001: Serialization failure / concurrency conflict
 *  - Operational AppError instances with stable machine codes
 */

class AppError extends Error {
  constructor(message, statusCode = 400, details = null, code = null, field = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.field = field;
    this.name = 'AppError';
  }
}

// ----------------------------------------------------------------------------
// Catalog of all 31 CockroachDB Business Check Constraints
// ----------------------------------------------------------------------------
const CHECK_CONSTRAINT_CATALOG = {
  // --- ACCOUNT ---
  chk_account_balance: {
    table: 'account',
    field: 'balance',
    code: 'INVALID_ACCOUNT_BALANCE',
    message: 'This operation would result in a negative account balance. Enter a valid non-negative amount or review the transaction.'
  },
  chk_account_status: {
    table: 'account',
    field: 'status',
    code: 'INVALID_ACCOUNT_STATUS',
    message: 'Invalid account status. Select Active, Dormant, Frozen, or Closed.'
  },
  chk_account_type: {
    table: 'account',
    field: 'acc_type',
    code: 'INVALID_ACCOUNT_TYPE',
    message: 'Invalid account type. Select Savings, Current, Salary, or Fixed Deposit.'
  },

  // --- ACCOUNT HOLDER ---
  chk_ownership_role: {
    table: 'account_holder',
    field: 'ownership_role',
    code: 'INVALID_OWNERSHIP_ROLE',
    message: 'Invalid ownership role. Select Primary, Joint, Secondary, or Guardian.'
  },
  chk_share_percentage: {
    table: 'account_holder',
    field: 'share_percentage',
    code: 'INVALID_SHARE_PERCENTAGE',
    message: 'Invalid ownership share percentage. Enter a value between 0% and 100%.'
  },

  // --- AUDIT LOG ---
  chk_audit_actor_type: {
    table: 'audit_log',
    field: 'actor_type',
    code: 'INVALID_ACTOR_TYPE',
    message: 'Invalid audit actor type. Permitted actor types: Employee, Customer, System, or Admin.'
  },

  // --- BRANCH ---
  chk_branch_status: {
    table: 'branch',
    field: 'status',
    code: 'INVALID_BRANCH_STATUS',
    message: 'Invalid branch status. Select Active, Inactive, or Closed.'
  },

  // --- CREDIT CARD ---
  chk_creditcard_limit: {
    table: 'creditcard',
    field: 'card_limit',
    code: 'INVALID_CARD_LIMIT',
    message: 'Invalid credit limit. Enter a credit card limit greater than zero.'
  },
  chk_creditcard_status: {
    table: 'creditcard',
    field: 'status',
    code: 'INVALID_CARD_STATUS',
    message: 'Invalid credit card status. Select Active, Blocked, Expired, or Cancelled.'
  },
  chk_creditcard_type: {
    table: 'creditcard',
    field: 'type',
    code: 'INVALID_CARD_TYPE',
    message: 'Invalid credit card network. Select Visa, Mastercard, RuPay, or American Express.'
  },

  // --- CUSTOMER ---
  chk_customer_status: {
    table: 'customer',
    field: 'status',
    code: 'INVALID_CUSTOMER_STATUS',
    message: 'Invalid customer status. Select Active, Inactive, or Suspended.'
  },

  // --- CUSTOMER PHONE ---
  chk_phone_type: {
    table: 'customer_phone',
    field: 'phone_type',
    code: 'INVALID_PHONE_TYPE',
    message: 'Invalid phone type. Select Mobile, Home, Work, or Other.'
  },

  // --- EMPLOYEE ---
  check_salary: {
    table: 'employee',
    field: 'salary',
    code: 'INVALID_EMPLOYEE_SALARY',
    message: 'Salary cannot be negative. Enter a valid non-negative compensation amount.'
  },
  chk_employee_status: {
    table: 'employee',
    field: 'status',
    code: 'INVALID_EMPLOYEE_STATUS',
    message: 'Invalid employee status. Select Active, Inactive, Suspended, On Leave, or Terminated.'
  },

  // --- LOAN ---
  chk_loan_amount: {
    table: 'loan',
    field: 'amount',
    code: 'INVALID_LOAN_AMOUNT',
    message: 'Invalid loan amount. Enter an amount greater than zero.'
  },
  chk_loan_interest: {
    table: 'loan',
    field: 'interest',
    code: 'INVALID_LOAN_INTEREST',
    message: 'Invalid interest rate. Enter a non-negative interest rate within the permitted range.'
  },
  chk_loan_status: {
    table: 'loan',
    field: 'status',
    code: 'INVALID_LOAN_STATUS',
    message: 'Invalid loan status. Select Pending, Approved, Active, Paid Off, Defaulted, or Rejected.'
  },
  chk_loan_term: {
    table: 'loan',
    field: 'term',
    code: 'INVALID_LOAN_TERM',
    message: 'Invalid loan tenure. Enter a repayment term duration greater than zero months.'
  },
  chk_loan_type: {
    table: 'loan',
    field: 'l_type',
    code: 'INVALID_LOAN_CATEGORY',
    message: 'Invalid loan category. Select Home, Car, Personal, Education, or Business Loan.'
  },

  // --- LOAN PAYMENT ---
  chk_interest_amount: {
    table: 'loan_payment',
    field: 'interest_amount',
    code: 'INVALID_INTEREST_COMPONENT',
    message: 'Interest component cannot be negative. Enter an amount greater than or equal to zero.'
  },
  chk_payment_amount: {
    table: 'loan_payment',
    field: 'amount',
    code: 'INVALID_PAYMENT_AMOUNT',
    message: 'Repayment installment amount must be greater than zero.'
  },
  chk_payment_components: {
    table: 'loan_payment',
    field: 'amount',
    code: 'INVALID_PAYMENT_COMPONENTS',
    message: 'Component mismatch: Total payment amount must exactly equal principal plus interest components.'
  },
  chk_payment_mode: {
    table: 'loan_payment',
    field: 'payment_mode',
    code: 'INVALID_LOAN_PAYMENT_MODE',
    message: 'Invalid payment mode for loan installment. Select Online, Auto Debit, Cash, or Cheque.'
  },
  chk_payment_status: {
    table: 'loan_payment',
    field: 'status',
    code: 'INVALID_PAYMENT_STATUS',
    message: 'Invalid payment status. Select Success, Pending, Failed, or Reversed.'
  },
  chk_principal_amount: {
    table: 'loan_payment',
    field: 'principal_amount',
    code: 'INVALID_PRINCIPAL_COMPONENT',
    message: 'Principal component cannot be negative. Enter an amount greater than or equal to zero.'
  },

  // --- RESPONSIBLE FOR ---
  chk_responsible_role: {
    table: 'responsible_for',
    field: 'role_type',
    code: 'INVALID_ROLE_TYPE',
    message: 'Invalid operational responsibility role. Select Branch Manager, Loan Officer, Teller Supervisor, Operational Supervisor, or Audit Officer.'
  },
  chk_responsible_status: {
    table: 'responsible_for',
    field: 'status',
    code: 'INVALID_ASSIGNMENT_STATUS',
    message: 'Invalid duty assignment status. Select Active, Completed, or Revoked.'
  },

  // --- TRANSACTION ---
  chk_transaction_amount: {
    table: 'transaction',
    field: 'amount',
    code: 'INVALID_TRANSACTION_AMOUNT',
    message: 'Invalid transaction amount. Enter an amount greater than zero.'
  },
  chk_transaction_mode: {
    table: 'transaction',
    field: 'mode',
    code: 'INVALID_TRANSACTION_MODE',
    message: 'Invalid transaction channel. Select Online, ATM, Cash, Branch, UPI, NEFT, or RTGS.'
  },
  chk_transaction_status: {
    table: 'transaction',
    field: 'status',
    code: 'INVALID_TRANSACTION_STATUS',
    message: 'Invalid transaction status. Select Success, Pending, Failed, or Reversed.'
  },
  chk_transaction_type: {
    table: 'transaction',
    field: 'type',
    code: 'INVALID_TRANSACTION_TYPE',
    message: 'Invalid transaction type. Select Deposit, Withdrawal, Transfer, Interest, or Fee.'
  }
};

// ----------------------------------------------------------------------------
// Catalog of Unique Constraints & Primary Keys
// ----------------------------------------------------------------------------
const UNIQUE_CONSTRAINT_CATALOG = {
  uq_customer_pan: {
    table: 'customer',
    field: 'pan',
    code: 'DUPLICATE_PAN',
    message: 'A customer profile with this Permanent Account Number (PAN) already exists. Use a different PAN.'
  },
  uq_branch_ifsc: {
    table: 'branch',
    field: 'ifsc',
    code: 'DUPLICATE_IFSC',
    message: 'A branch with this IFSC code already exists. Enter a unique IFSC code.'
  },
  uq_customer_beneficiary: {
    table: 'beneficiary',
    field: 'destination_account_num',
    code: 'DUPLICATE_BENEFICIARY',
    message: 'This customer has already registered a beneficiary with this destination account number and IFSC.'
  },
  creditcard_pkey: {
    table: 'creditcard',
    field: 'pno',
    code: 'DUPLICATE_CARD_NUMBER',
    message: 'A credit card with this 16-digit card number already exists. Enter a unique card number.'
  },
  account_holder_pkey: {
    table: 'account_holder',
    field: 'cid',
    code: 'DUPLICATE_ACCOUNT_HOLDER',
    message: 'This customer is already registered as an owner on this account.'
  },
  customer_phone_pkey: {
    table: 'customer_phone',
    field: 'phone',
    code: 'DUPLICATE_CUSTOMER_PHONE',
    message: 'This phone number is already registered for this customer.'
  }
};

// ----------------------------------------------------------------------------
// Catalog of Foreign Key Constraints
// ----------------------------------------------------------------------------
const FOREIGN_KEY_CATALOG = {
  fk_account_branch: {
    table: 'account',
    field: 'b_id',
    code: 'INVALID_BRANCH_REFERENCE',
    message: 'The selected home branch does not exist. Choose an active branch from the directory.'
  },
  fk_holder_account: {
    table: 'account_holder',
    field: 'acc_id',
    code: 'INVALID_ACCOUNT_REFERENCE',
    message: 'Referenced account does not exist. Verify the account ID before assigning account holders.'
  },
  fk_holder_customer: {
    table: 'account_holder',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer does not exist. Select an active customer profile to assign as an account owner.'
  },
  fk_audit_employee: {
    table: 'audit_log',
    field: 'emp_id',
    code: 'INVALID_EMPLOYEE_REFERENCE',
    message: 'Referenced staff member does not exist in the employee directory.'
  },
  fk_beneficiary_customer: {
    table: 'beneficiary',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer does not exist. Cannot register beneficiary for an unknown customer profile.'
  },
  fk_beneficiary_internal_acc: {
    table: 'beneficiary',
    field: 'internal_acc_id',
    code: 'INVALID_INTERNAL_ACCOUNT_REFERENCE',
    message: 'The specified internal destination account does not exist in Finora.'
  },
  fk_creditcard_customer: {
    table: 'creditcard',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer does not exist. Select an active customer profile to issue this credit card.'
  },
  fk_customer_employee: {
    table: 'customer',
    field: 'emp_id',
    code: 'INVALID_EMPLOYEE_REFERENCE',
    message: 'The assigned relationship officer does not exist. Select a valid staff member.'
  },
  fk_customer_phone: {
    table: 'customer_phone',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer profile does not exist.'
  },
  fk_employee_branch: {
    table: 'employee',
    field: 'b_id',
    code: 'INVALID_BRANCH_REFERENCE',
    message: 'The assigned branch does not exist. Select an active branch to domicile this employee.'
  },
  fk_loan_customer: {
    table: 'loan',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer does not exist. Select an active customer profile to originate this loan.'
  },
  fk_loan_employee: {
    table: 'loan',
    field: 'assigned_emp_id',
    code: 'INVALID_EMPLOYEE_REFERENCE',
    message: 'The assigned loan officer does not exist. Select a valid staff member.'
  },
  fk_payment_loan: {
    table: 'loan_payment',
    field: 'l_id',
    code: 'INVALID_LOAN_REFERENCE',
    message: 'The referenced loan facility does not exist. Verify the loan ID before posting payments.'
  },
  fk_nominee_account: {
    table: 'nominee',
    field: 'acc_id',
    code: 'INVALID_ACCOUNT_REFERENCE',
    message: 'Referenced account does not exist. Nominees can only be designated for valid accounts.'
  },
  fk_nominee_customer: {
    table: 'nominee',
    field: 'cid',
    code: 'INVALID_CUSTOMER_REFERENCE',
    message: 'Referenced customer profile does not exist.'
  },
  fk_responsible_branch: {
    table: 'responsible_for',
    field: 'b_id',
    code: 'INVALID_BRANCH_REFERENCE',
    message: 'Referenced branch does not exist. Duty assignments require a valid branch.'
  },
  fk_responsible_employee: {
    table: 'responsible_for',
    field: 'emp_id',
    code: 'INVALID_EMPLOYEE_REFERENCE',
    message: 'Referenced employee does not exist. Select an active employee to assign this duty.'
  },
  fk_responsible_loan: {
    table: 'responsible_for',
    field: 'l_id',
    code: 'INVALID_LOAN_REFERENCE',
    message: 'Referenced loan facility does not exist.'
  },
  fk_responsible_transaction: {
    table: 'responsible_for',
    field: 't_id',
    code: 'INVALID_TRANSACTION_REFERENCE',
    message: 'Referenced transaction record does not exist.'
  },
  fk_transaction_account: {
    table: 'transaction',
    field: 'acc_id',
    code: 'INVALID_ACCOUNT_REFERENCE',
    message: 'Referenced account does not exist. Transactions must be posted against a valid account.'
  },
  fk_transaction_employee: {
    table: 'transaction',
    field: 'processed_by_emp_id',
    code: 'INVALID_EMPLOYEE_REFERENCE',
    message: 'Referenced teller employee does not exist in staff directory.'
  },
  fk_transaction_related_acc: {
    table: 'transaction',
    field: 'related_acc_id',
    code: 'INVALID_RELATED_ACCOUNT_REFERENCE',
    message: 'Destination transfer account does not exist. Check the destination account number.'
  },
  fk_transaction_related_trans: {
    table: 'transaction',
    field: 'related_trans_id',
    code: 'INVALID_RELATED_TRANSACTION_REFERENCE',
    message: 'Referenced counterpart transaction does not exist.'
  }
};

/**
 * Main Centralized Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // 1. Application-level operational errors (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
      code: err.code || 'VALIDATION_ERROR',
      field: err.field || null,
      details: err.details || null
    });
  }

  // 2. CockroachDB / PostgreSQL Driver Errors
  if (err && err.code) {
    const sqlCode = String(err.code);

    switch (sqlCode) {
      // ----------------------------------------------------------------------
      // CHECK Constraint Violation (23514)
      // ----------------------------------------------------------------------
      case '23514': {
        const cName = err.constraint ? String(err.constraint).toLowerCase() : '';
        const checkEntry = CHECK_CONSTRAINT_CATALOG[cName];

        if (checkEntry) {
          return res.status(400).json({
            success: false,
            error: checkEntry.message,
            message: checkEntry.message,
            code: checkEntry.code,
            field: checkEntry.field,
            constraint: cName,
            table: checkEntry.table
          });
        }

        // Heuristic fallback matching from raw error message
        const msg = String(err.message || '');
        let detectedField = null;
        let detectedMessage = 'One or more values violate database integrity rules. Review your input and try again.';
        let detectedCode = 'CHECK_CONSTRAINT_VIOLATION';

        if (msg.includes('l_type')) {
          detectedField = 'l_type';
          detectedCode = 'INVALID_LOAN_CATEGORY';
          detectedMessage = CHECK_CONSTRAINT_CATALOG.chk_loan_type.message;
        } else if (msg.includes('balance')) {
          detectedField = 'balance';
          detectedCode = 'INVALID_ACCOUNT_BALANCE';
          detectedMessage = CHECK_CONSTRAINT_CATALOG.chk_account_balance.message;
        } else if (msg.includes('salary')) {
          detectedField = 'salary';
          detectedCode = 'INVALID_EMPLOYEE_SALARY';
          detectedMessage = CHECK_CONSTRAINT_CATALOG.check_salary.message;
        } else if (msg.includes('payment_mode')) {
          detectedField = 'payment_mode';
          detectedCode = 'INVALID_LOAN_PAYMENT_MODE';
          detectedMessage = CHECK_CONSTRAINT_CATALOG.chk_payment_mode.message;
        } else if (msg.includes('amount')) {
          detectedField = 'amount';
          detectedCode = 'INVALID_AMOUNT';
          detectedMessage = 'The entered amount violates database constraints. Enter an amount greater than zero.';
        }

        return res.status(400).json({
          success: false,
          error: detectedMessage,
          message: detectedMessage,
          code: detectedCode,
          field: detectedField,
          constraint: err.constraint || null
        });
      }

      // ----------------------------------------------------------------------
      // UNIQUE Constraint Violation (23505)
      // ----------------------------------------------------------------------
      case '23505': {
        const cName = err.constraint ? String(err.constraint).toLowerCase() : '';
        const uqEntry = UNIQUE_CONSTRAINT_CATALOG[cName];

        if (uqEntry) {
          return res.status(409).json({
            success: false,
            error: uqEntry.message,
            message: uqEntry.message,
            code: uqEntry.code,
            field: uqEntry.field,
            constraint: cName,
            table: uqEntry.table
          });
        }

        // Parse key details from err.detail (e.g. "Key (pan)=(ABCDE1234F) already exists.")
        const detailMatch = String(err.detail || '').match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/i);
        const colName = detailMatch ? detailMatch[1] : null;
        const colVal = detailMatch ? detailMatch[2] : null;

        const userMsg = colName
          ? `A record with this ${colName.toUpperCase()} ('${colVal}') already exists. Use a different value.`
          : 'A record with this identifier or unique property already exists. Use a different value.';

        return res.status(409).json({
          success: false,
          error: userMsg,
          message: userMsg,
          code: 'DUPLICATE_RECORD',
          field: colName,
          constraint: err.constraint || null
        });
      }

      // ----------------------------------------------------------------------
      // FOREIGN KEY Violation (23503)
      // ----------------------------------------------------------------------
      case '23503': {
        const cName = err.constraint ? String(err.constraint).toLowerCase() : '';
        const fkEntry = FOREIGN_KEY_CATALOG[cName];

        if (fkEntry) {
          // If the operation is deleting a record that is still referenced by children,
          // return 409 Conflict. If inserting/updating child pointing to missing parent, 400.
          const isReferencingParent = String(err.message || '').includes('is not present in table');
          const statusCode = isReferencingParent ? 400 : 409;

          return res.status(statusCode).json({
            success: false,
            error: fkEntry.message,
            message: fkEntry.message,
            code: fkEntry.code,
            field: fkEntry.field,
            constraint: cName,
            table: fkEntry.table
          });
        }

        // Parse foreign key details from err.detail
        const detailText = String(err.detail || '');
        let userMsg = 'This record references a related record that does not exist or cannot be used.';
        let fieldName = null;

        const refMatch = detailText.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/i);
        if (refMatch) {
          fieldName = refMatch[1];
          const val = refMatch[2];
          const targetTable = refMatch[3];
          userMsg = `Referenced ${targetTable} (ID: ${val}) does not exist. Select an active ${targetTable} record.`;
        }

        return res.status(409).json({
          success: false,
          error: userMsg,
          message: userMsg,
          code: 'FOREIGN_KEY_VIOLATION',
          field: fieldName,
          constraint: err.constraint || null
        });
      }

      // ----------------------------------------------------------------------
      // NOT NULL Violation (23502)
      // ----------------------------------------------------------------------
      case '23502': {
        // CockroachDB format: 'null value in column "term" violates not-null constraint'
        const match = String(err.message || '').match(/null value in column "([^"]+)"/i);
        const col = match ? match[1] : err.column || 'field';

        const userMsg = `A required field '${col}' is missing. Complete all mandatory fields and try again.`;

        return res.status(400).json({
          success: false,
          error: userMsg,
          message: userMsg,
          code: 'MISSING_REQUIRED_FIELD',
          field: col
        });
      }

      // ----------------------------------------------------------------------
      // Invalid Input Format / Data Type (22P02)
      // ----------------------------------------------------------------------
      case '22P02': {
        return res.status(400).json({
          success: false,
          error: 'Invalid input format or data type. Ensure numbers, IDs, and dates are formatted correctly.',
          message: 'Invalid input format or data type. Ensure numbers, IDs, and dates are formatted correctly.',
          code: 'INVALID_INPUT_FORMAT',
          field: null
        });
      }

      // ----------------------------------------------------------------------
      // String Length Exceeded / Truncation (22001)
      // ----------------------------------------------------------------------
      case '22001': {
        return res.status(400).json({
          success: false,
          error: 'Value too long. The entered text exceeds the maximum permitted length for this field.',
          message: 'Value too long. The entered text exceeds the maximum permitted length for this field.',
          code: 'VALUE_TOO_LONG',
          field: null
        });
      }

      // ----------------------------------------------------------------------
      // Numeric Value Out of Range (22003)
      // ----------------------------------------------------------------------
      case '22003': {
        return res.status(400).json({
          success: false,
          error: 'The entered numeric value is out of the allowable range for this field.',
          message: 'The entered numeric value is out of the allowable range for this field.',
          code: 'NUMERIC_OUT_OF_RANGE',
          field: null
        });
      }

      // ----------------------------------------------------------------------
      // CockroachDB Serialization Failure (40001)
      // ----------------------------------------------------------------------
      case '40001': {
        return res.status(503).json({
          success: false,
          error: 'Concurrency conflict (CockroachDB serializable retry limit exceeded). Please retry your request.',
          message: 'Concurrency conflict (CockroachDB serializable retry limit exceeded). Please retry your request.',
          code: 'SERIALIZATION_FAILURE',
          field: null
        });
      }

      default:
        break;
    }
  }

  // 3. Fallback for unhandled / unexpected server errors
  // Technical details are logged on server, but secrets and SQL statements are never sent to client
  console.error('[Unhandled API Error]:', err.stack || err);

  return res.status(500).json({
    success: false,
    error: 'An internal server error occurred while processing the request.',
    message: 'An internal server error occurred while processing the request.',
    code: 'INTERNAL_SERVER_ERROR',
    field: null
  });
}

module.exports = {
  AppError,
  errorHandler,
  CHECK_CONSTRAINT_CATALOG,
  UNIQUE_CONSTRAINT_CATALOG,
  FOREIGN_KEY_CATALOG
};
