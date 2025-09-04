import { Router } from 'express';
import { SocialController } from '@/controllers/social';
import { validate, socialAccountSchemas } from '@/middleware/validation';
import { authenticateToken, requireBrandAccess } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const socialController = new SocialController();

// Rate limiting for social media operations
const socialRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many social media requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and authentication to all routes
router.use(socialRateLimit);
router.use(authenticateToken);

// Social account management
router.post('/accounts',
  validate(socialAccountSchemas.create),
  requireBrandAccess('admin'),
  socialController.connectAccount.bind(socialController)
);

router.get('/brands/:brandId/accounts',
  requireBrandAccess('viewer'),
  socialController.listAccounts.bind(socialController)
);

router.get('/accounts/:accountId',
  socialController.getAccount.bind(socialController)
);

router.put('/accounts/:accountId',
  validate(socialAccountSchemas.update),
  socialController.updateAccount.bind(socialController)
);

router.delete('/accounts/:accountId',
  socialController.disconnectAccount.bind(socialController)
);

router.post('/accounts/:accountId/refresh',
  socialController.refreshAccountStats.bind(socialController)
);

router.get('/accounts/:accountId/insights',
  socialController.getAccountInsights.bind(socialController)
);

export default router;