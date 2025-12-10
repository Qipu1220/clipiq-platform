/**
 * Standardized API Response Format
 * Consistent response structure for all API endpoints
 */

/**
 * Success response format
 */
export const successResponse = (data, message = 'Success') => {
  return {
    success: true,
    data,
    message
  };
};

/**
 * Error response format
 */
export const errorResponse = (message, statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    statusCode
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
};

export default {
  successResponse,
  errorResponse
};
