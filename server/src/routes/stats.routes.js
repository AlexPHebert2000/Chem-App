const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getWeeklyStats, getQuestionStats, getSuggestedReviews } = require('../controllers/stats.controller');

const router = Router();

router.get('/weekly',                authenticate, requireRole('STUDENT'), getWeeklyStats);
router.get('/questions/:questionId', authenticate, requireRole('TEACHER'), getQuestionStats);
router.get('/reviews',               authenticate, requireRole('STUDENT'), getSuggestedReviews);

module.exports = router;
