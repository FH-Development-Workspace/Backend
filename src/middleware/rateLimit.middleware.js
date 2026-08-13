const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message = 'Too many requests') =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message, error: { code: 'RATE_LIMIT_EXCEEDED' } },
  });

const authLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many authentication attempts');
const registerLimiter = createLimiter(60 * 60 * 1000, 5, 'Too many registration attempts');
const passwordResetLimiter = createLimiter(60 * 60 * 1000, 5, 'Too many password reset attempts');
const contactLimiter = createLimiter(60 * 60 * 1000, 10, 'Too many contact submissions');
const reviewLimiter = createLimiter(60 * 60 * 1000, 5, 'Too many review submissions');
const supportLimiter = createLimiter(60 * 60 * 1000, 20, 'Too many support requests');
const generalLimiter = createLimiter(15 * 60 * 1000, 200);

module.exports = {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  contactLimiter,
  reviewLimiter,
  supportLimiter,
  generalLimiter,
  createLimiter,
};
