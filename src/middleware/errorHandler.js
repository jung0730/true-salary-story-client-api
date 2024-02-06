function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server error';

  // can add more information to the response if needed
  const errorResponse = {
    statusCode,
    message,
  };

  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
