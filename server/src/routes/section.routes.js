const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getSectionQuestions, createQuestion, updateQuestion } = require('../controllers/question.controller');

const router = Router();

router.get('/:sectionId/questions', authenticate, requireRole('TEACHER'), getSectionQuestions);
router.post('/:sectionId/questions', authenticate, requireRole('TEACHER'), createQuestion);
router.patch('/:sectionId/questions/:questionId', authenticate, requireRole('TEACHER'), updateQuestion);

module.exports = router;
