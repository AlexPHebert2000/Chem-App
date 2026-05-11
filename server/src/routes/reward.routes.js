const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { deleteReward, redeemReward } = require('../controllers/reward.controller');

const router = Router();

router.post('/:rewardId/redeem', authenticate, requireRole('STUDENT'), redeemReward);
router.delete('/:rewardId', authenticate, requireRole('TEACHER'), deleteReward);

module.exports = router;
