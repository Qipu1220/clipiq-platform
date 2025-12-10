/**
 * Report Validators
 * Validates report-related request data
 */

import { body, param, query } from 'express-validator';

/**
 * Validator for reporting a video
 */
export const reportVideoValidator = [
  body('videoId')
    .notEmpty()
    .withMessage('Video ID is required')
    .isUUID()
    .withMessage('Video ID must be a valid UUID'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isIn(['spam', 'harassment', 'hate', 'violence', 'nudity', 'copyright', 'misleading', 'other'])
    .withMessage('Invalid report reason'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

/**
 * Validator for getting video reports (with filters)
 */
export const getVideoReportsValidator = [
  query('status')
    .optional()
    .isIn(['pending', 'reviewed', 'resolved'])
    .withMessage('Status must be one of: pending, reviewed, resolved'),
  
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
 * Validator for getting a single report by ID
 */
export const getReportByIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Report ID is required')
    .isUUID()
    .withMessage('Report ID must be a valid UUID')
];

/**
 * Validator for resolving a video report
 */
export const resolveVideoReportValidator = [
  param('id')
    .notEmpty()
    .withMessage('Report ID is required')
    .isUUID()
    .withMessage('Report ID must be a valid UUID'),
  
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['dismiss', 'warn_user', 'ban_user', 'delete_content'])
    .withMessage('Invalid action'),
  
  body('note')
    .optional()
    .isString()
    .withMessage('Note must be a string')
    .isLength({ max: 1000 })
    .withMessage('Note must not exceed 1000 characters')
];

export default {
  reportVideoValidator,
  getVideoReportsValidator,
  getReportByIdValidator,
  resolveVideoReportValidator
};
