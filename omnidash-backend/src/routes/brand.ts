import { Router } from 'express';
import { BrandController } from '@/controllers/brand';
import { validate, brandSchemas } from '@/middleware/validation';
import { authenticateToken, requireBrandAccess } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();
const brandController = new BrandController();

// Rate limiting for brand operations
const brandRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many brand requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and authentication to all brand routes
router.use(brandRateLimit);
router.use(authenticateToken);

// Brand CRUD operations
router.post('/',
  validate(brandSchemas.create),
  brandController.create.bind(brandController)
);

router.get('/',
  brandController.list.bind(brandController)
);

router.get('/:brandId',
  validate(brandSchemas.get),
  requireBrandAccess('viewer'),
  brandController.get.bind(brandController)
);

router.put('/:brandId',
  validate(brandSchemas.update),
  requireBrandAccess('admin'),
  brandController.update.bind(brandController)
);

router.delete('/:brandId',
  validate(brandSchemas.get),
  requireBrandAccess('owner'),
  brandController.delete.bind(brandController)
);

// Member management
router.post('/:brandId/members',
  validate(brandSchemas.addMember),
  requireBrandAccess('admin'),
  brandController.addMember.bind(brandController)
);

router.delete('/:brandId/members/:memberId',
  requireBrandAccess('admin'),
  brandController.removeMember.bind(brandController)
);

router.put('/:brandId/members/:memberId',
  requireBrandAccess('owner'),
  brandController.updateMemberRole.bind(brandController)
);

export default router;