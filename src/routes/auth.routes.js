const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const {
  registerSchema, loginSchema, refreshSchema, verifyEmailSchema,
  resendVerificationSchema, forgotPasswordSchema, resetPasswordSchema,
} = require('../validators/auth.validator');
const {
  authLimiter, registerLimiter, passwordResetLimiter,
} = require('../middleware/rateLimit.middleware');

const router = Router();

// Informative GET handlers for browser discovery
router.get('/login', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FH Development Authentication Service',
    description: 'Submit a POST request to this endpoint with JSON body { email, password } to authenticate.',
    method: 'POST',
    endpoint: '/api/v1/auth/login',
    frontendLogin: 'https://fh-development.xyz/auth/login.html'
  });
});

router.get('/register', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FH Development Registration Service',
    description: 'Submit a POST request to this endpoint with JSON body { username, email, password } to create an account.',
    method: 'POST',
    endpoint: '/api/v1/auth/register',
    frontendRegister: 'https://fh-development.xyz/auth/register.html'
  });
});

router.get('/forgot-password', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FH Development Password Reset Service',
    description: 'Submit a POST request with JSON body { email } to receive a password reset token.',
    method: 'POST',
    endpoint: '/api/v1/auth/forgot-password'
  });
});

// Authentication endpoints
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', validate(refreshSchema), authController.logout);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.get('/me', authenticate, authController.me);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', authLimiter, validate(resendVerificationSchema), authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

module.exports = router;
