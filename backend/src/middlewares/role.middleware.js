/**
 * Role-based Access Control Middleware
 * Restricts access to routes based on user roles (admin, staff, user)
 */

import ApiError from '../utils/apiError.js';

/**
 * Middleware to require specific role(s)
 * @param {string|string[]} allowedRoles - Single role or array of roles
 */
export const requireRole = (allowedRoles) => {
  // Convert to array if single role provided
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions. This action requires ' + roles.join(' or ') + ' role.');
    }
    
    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is staff or admin
 */
export const requireStaffOrAdmin = requireRole(['admin', 'staff']);

export default {
  requireRole,
  requireAdmin,
  requireStaffOrAdmin
};
