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
