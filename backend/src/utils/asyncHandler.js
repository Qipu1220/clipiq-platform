/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */

/**
 * Wrapper for async route handlers
 * Catches any errors and passes them to next() for error middleware
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
