const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { updateRedemption } = require('../controllers/reward.controller');

const router = Router();

router.patch('/:redemptionId', authenticate, requireRole('TEACHER'), updateRedemption);

module.exports = router;
