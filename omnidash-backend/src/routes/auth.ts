import { Router } from 'express';
import { AuthController } from '@/controllers/auth';
import { validate, authSchemas } from '@/middleware/validation';
import { authenticateToken } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const authController = new AuthController();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register', 
  authRateLimit,
  validate(authSchemas.register),
  authController.register.bind(authController)
);

router.post('/login',
  authRateLimit,
  validate(authSchemas.login),
  authController.login.bind(authController)
);

router.post('/forgot-password',
  passwordResetRateLimit,
  validate(authSchemas.forgotPassword),
  authController.forgotPassword.bind(authController)
);

router.post('/reset-password',
  authRateLimit,
  validate(authSchemas.resetPassword),
  authController.resetPassword.bind(authController)
);

// Protected routes
router.post('/logout',
  authenticateToken,
  authController.logout.bind(authController)
);

router.get('/me',
  authenticateToken,
  authController.me.bind(authController)
);

router.post('/refresh',
  authenticateToken,
  authController.refreshToken.bind(authController)
);

export default router;