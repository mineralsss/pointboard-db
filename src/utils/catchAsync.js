module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("Unhandled error in request:", error);
    res.status(500).json({
      success: false,
      errorType: 'server_error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  });
};
