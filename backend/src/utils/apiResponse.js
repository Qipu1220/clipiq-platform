/**
 * Standardized API Response Format
 * Consistent response structure for all API endpoints
 */

/**
 * Success response format - sends response directly
 */
export const successResponse = (res, data, message = 'Success') => {
  return res.status(200).json({
    success: true,
    data,
    message
  });
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
