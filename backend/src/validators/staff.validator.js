/**
 * Staff/User Management Validators
 * Input validation for staff user management operations
 */

import { body, param, query } from 'express-validator';

/**
 * Validator for GET /staff/users
 */
export const getUsersValidator = [
  query('role')
    .optional()
    .isIn(['admin', 'staff', 'user'])
    .withMessage('Role must be admin, staff, or user'),
  query('banned')
    .optional()
    .isBoolean()
    .withMessage('Banned must be a boolean'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search must be between 1 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validator for PUT /staff/users/:username/ban
 */
export const banUserValidator = [
  param('username')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .trim(),
  body('reason')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  body('duration')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1})
    .withMessage('Duration must be between 1 and 365 days')
];

/**
 * Validator for PUT /staff/users/:username/unban
 */
export const unbanUserValidator = [
  param('username')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .trim()
];

/**
 * Validator for PUT /staff/users/:username/warn
 */
export const warnUserValidator = [
  param('username')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .trim(),
  body('reason')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  body('duration')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1, max: 90 })
    .withMessage('Duration must be between 1 and 90 days')
];

/**
 * Validator for PUT /staff/users/:username/clear-warnings
 */
export const clearWarningsValidator = [
  param('username')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .trim()
];

export default {
  getUsersValidator,
  banUserValidator,
  unbanUserValidator,
  warnUserValidator,
  clearWarningsValidator
};
