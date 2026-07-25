const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const {
  getTeacherQuestions,
  createQuestion,
  getOneQuestion,
  updateQuestion,
  attemptQuestion,
  previewDynamicQuestion,
  deleteQuestion,
} = require('../controllers/question.controller');

const router = Router();

router.get('/',                      authenticate, requireRole('TEACHER'), getTeacherQuestions);
router.post('/',                     authenticate, requireRole('TEACHER'), createQuestion);
router.delete('/:questionId',        authenticate, requireRole('TEACHER'), deleteQuestion);
router.get('/:questionId',           authenticate, requireRole('TEACHER'), getOneQuestion);
router.patch('/:questionId',         authenticate, requireRole('TEACHER'), updateQuestion);
router.post('/:questionId/attempt',  authenticate, requireRole('STUDENT'), attemptQuestion);
router.get('/:questionId/preview',   authenticate, requireRole('TEACHER'), previewDynamicQuestion);

module.exports = router;
