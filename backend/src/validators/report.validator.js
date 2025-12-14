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

/**
 * Validator for reporting a user
 */
export const reportUserValidator = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isString()
    .withMessage('Username must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isIn(['spam', 'harassment', 'hate', 'violence', 'nudity', 'impersonation', 'fake_account', 'other'])
    .withMessage('Invalid report reason'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

/**
 * Validator for getting user reports (with filters)
 */
export const getUserReportsValidator = [
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
 * Validator for resolving a user report
 */
export const resolveUserReportValidator = [
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

/**
 * Validator for reporting a comment
 */
export const reportCommentValidator = [
  body('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isUUID()
    .withMessage('Comment ID must be a valid UUID'),
  
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isString()
    .withMessage('Reason must be a string')
    .custom((value) => {
      const validReasons = ['spam', 'harassment', 'hate_speech', 'violence_threat', 'sexual_content', 'misinformation', 'impersonation', 'off_topic', 'other'];
      const reasonType = value.split(':')[0].trim();
      if (!validReasons.includes(reasonType)) {
        throw new Error('Invalid report reason');
      }
      return true;
    })
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

/**
 * Validator for getting comment reports (with filters)
 */
export const getCommentReportsValidator = [
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
 * Validator for resolving a comment report
 */
export const resolveCommentReportValidator = [
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
  resolveVideoReportValidator,
  reportUserValidator,
  getUserReportsValidator,
  resolveUserReportValidator,
  reportCommentValidator,
  getCommentReportsValidator,
  resolveCommentReportValidator
};
