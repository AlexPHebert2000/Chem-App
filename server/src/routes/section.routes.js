const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getSectionQuestions, createQuestion } = require('../controllers/question.controller');

const router = Router();

router.get('/:sectionId/questions', authenticate, requireRole('TEACHER'), getSectionQuestions);
router.post('/:sectionId/questions', authenticate, requireRole('TEACHER'), createQuestion);

module.exports = router;
