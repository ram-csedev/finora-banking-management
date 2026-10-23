/**
 * Centralized API Error Handling Middleware
 */

class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

function errorHandler(err, req, res, next) {
  // Operational application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details || null
    });
  }

  // Database / CockroachDB constraint errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Duplicate record / Unique constraint violation.',
          detail: err.detail || 'A record with this identifier or unique property already exists.',
          constraint: err.constraint
        });

      case '23503': // Foreign key violation
        return res.status(409).json({
          success: false,
          error: 'Referential integrity violation.',
          detail: err.detail || 'The operation violates foreign-key constraints (record is referenced or parent does not exist).',
          constraint: err.constraint
        });

      case '23514': // Check constraint violation
        return res.status(400).json({
          success: false,
          error: 'Check constraint violation.',
          detail: err.detail || 'One or more values violate database integrity rules (e.g., negative balance or invalid type).',
          constraint: err.constraint
        });

      case '22P02': // Invalid text representation (e.g. non-numeric ID)
        return res.status(400).json({
          success: false,
          error: 'Invalid input format or data type.',
          detail: err.message
        });

      case '40001': // Serialization failure
        return res.status(503).json({
          success: false,
          error: 'Concurrency conflict (CockroachDB serializable retry limit exceeded). Please retry your request.',
          code: 'SERIALIZATION_FAILURE'
        });

      default:
        break;
    }
  }

  // Generic fallback error
  console.error('[Unhandled API Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
}

module.exports = {
  AppError,
  errorHandler
};
