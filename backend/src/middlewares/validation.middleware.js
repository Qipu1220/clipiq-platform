/**
 * Request Validation Middleware
 * Validates request data using express-validator
 */

import { validationResult } from 'express-validator';
import ApiError from '../utils/apiError.js';

/**
 * Validation middleware for express-validator
 * Checks validation results and throws error if validation fails
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      type: '/errors/validation-failed',
      title: 'Validation Error',
      status: 400,
      detail: 'Request validation failed',
      errors: errorMessages,
      timestamp: new Date().toISOString()
    });
  }

  next();
};
