/**
 * Maintenance Mode Middleware
 * Checks if system is in maintenance mode and blocks non-admin access
 */

import { SystemSettings } from '../models/SystemSettings.js';
import ApiError from '../utils/apiError.js';

/**
 * Check if system is in maintenance mode
 * - If maintenance mode is ON, only admin users can access
 * - Regular users and staff will receive 503 Service Unavailable
 * - Bypass certain public routes (login, health check)
 */
export async function checkMaintenanceMode(req, res, next) {
  try {
    // Skip maintenance check for public routes
    const publicRoutes = [
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/health'
    ];

    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Get maintenance mode status from database
    const maintenanceMode = await SystemSettings.getMaintenanceMode();
    
    if (!maintenanceMode) {
      // System is not in maintenance mode, proceed normally
      return next();
    }

    // System is in maintenance mode
    // Check if user is authenticated and is admin
    if (req.user && req.user.role === 'admin') {
      // Admin can access during maintenance
      return next();
    }

    // Block access for non-admin users
    throw new ApiError(
      503,
      'System is currently under maintenance. Please try again later.',
      'MAINTENANCE_MODE'
    );
  } catch (error) {
    // If it's already an ApiError, pass it through
    if (error.statusCode) {
      return next(error);
    }
    
    // For database errors, log and allow access (fail-open)
    console.error('Error checking maintenance mode:', error);
    return next();
  }
}

/**
 * Check if service maintenance mode is enabled
 * - If service maintenance is ON, regular users cannot access
 * - Admin and staff can still access
 */
export async function checkServiceMaintenanceMode(req, res, next) {
  try {
    // Skip maintenance check for public routes
    const publicRoutes = [
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/health'
    ];

    if (publicRoutes.includes(req.path)) {
      return next();
    }

    // Get service maintenance mode status
    const serviceMaintenanceMode = await SystemSettings.getServiceMaintenanceMode();
    
    if (!serviceMaintenanceMode) {
      return next();
    }

    // Service maintenance is enabled
    // Check if user is admin or staff
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
      return next();
    }

    // Block access for regular users
    throw new ApiError(
      503,
      'Service is currently under maintenance. Please try again later.',
      'SERVICE_MAINTENANCE_MODE'
    );
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }
    
    console.error('Error checking service maintenance mode:', error);
    return next();
  }
}
