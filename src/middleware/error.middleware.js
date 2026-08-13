const logger = require('../utils/logger');
const env = require('../config/environment');
const { sendError } = require('../utils/response');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

const notFoundHandler = (req, res) => {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND');
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  if (err.code === 'P2002') {
    return sendError(res, 'Resource already exists', 409, 'CONFLICT');
  }

  if (err.code === 'P2025') {
    return sendError(res, 'Resource not found', 404, 'NOT_FOUND');
  }

  if (err.message?.includes('File type')) {
    return sendError(res, err.message, 400, 'INVALID_FILE');
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: env.isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  const message = env.isProduction ? 'Internal server error' : err.message;
  sendError(res, message, 500, 'INTERNAL_ERROR');
};

module.exports = { AppError, notFoundHandler, errorHandler };
