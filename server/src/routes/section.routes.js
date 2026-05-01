const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getSectionQuestions, createQuestion, updateQuestion } = require('../controllers/question.controller');
const { completeSection } = require('../controllers/section.controller');

const router = Router();

router.get('/:sectionId/questions', authenticate, requireRole('TEACHER'), getSectionQuestions);
router.post('/:sectionId/questions', authenticate, requireRole('TEACHER'), createQuestion);
router.patch('/:sectionId/questions/:questionId', authenticate, requireRole('TEACHER'), updateQuestion);
router.post('/:sectionId/complete', authenticate, requireRole('STUDENT'), completeSection);

module.exports = router;
