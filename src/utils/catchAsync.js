module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("Unhandled error in request:", error);
    
    // Handle APIError instances
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode || 'UNKNOWN_ERROR',
        errorType: error.errorType || 'general_error'
      });
    }
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      
      // Extract validation error messages
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
      
      return res.status(400).json({
        success: false,
        errorType: 'validation_error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      errorType: 'server_error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    });
  });
};
