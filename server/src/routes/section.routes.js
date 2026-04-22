const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createQuestion } = require('../controllers/question.controller');

const router = Router();

router.post('/:sectionId/questions', authenticate, requireRole('TEACHER'), createQuestion);

module.exports = router;
