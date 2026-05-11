const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { deleteReward } = require('../controllers/reward.controller');

const router = Router();

router.delete('/:rewardId', authenticate, requireRole('TEACHER'), deleteReward);

module.exports = router;
