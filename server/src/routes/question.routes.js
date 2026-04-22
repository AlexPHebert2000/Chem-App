const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { attemptQuestion } = require('../controllers/question.controller');

const router = Router();

router.post('/:questionId/attempt', authenticate, requireRole('STUDENT'), attemptQuestion);

module.exports = router;
