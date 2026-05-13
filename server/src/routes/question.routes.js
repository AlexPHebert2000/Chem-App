const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { attemptQuestion, previewDynamicQuestion } = require('../controllers/question.controller');

const router = Router();

router.post('/:questionId/attempt',  authenticate, requireRole('STUDENT'), attemptQuestion);
router.get('/:questionId/preview',   authenticate, requireRole('TEACHER'), previewDynamicQuestion);

module.exports = router;
