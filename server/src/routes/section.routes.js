const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getSectionQuestions, updateQuestion } = require('../controllers/question.controller');
const { completeSection, addQuestionToSection, removeQuestionFromSection } = require('../controllers/section.controller');
const { getStudentSectionQuestions } = require('../controllers/student.controller');
const { exportSectionCsv } = require('../controllers/export.controller');

const router = Router();

function byRole(teacherFn, studentFn) {
  return (req, res) => {
    if (req.user.role === 'TEACHER') return teacherFn(req, res);
    if (req.user.role === 'STUDENT') return studentFn(req, res);
    return res.status(403).json({ error: 'Forbidden' });
  };
}

router.get('/:sectionId/questions',                        authenticate, byRole(getSectionQuestions, getStudentSectionQuestions));
router.get('/:sectionId/export',                           authenticate, requireRole('TEACHER'), exportSectionCsv);
router.post('/:sectionId/questions/:questionId',           authenticate, requireRole('TEACHER'), addQuestionToSection);
router.delete('/:sectionId/questions/:questionId',         authenticate, requireRole('TEACHER'), removeQuestionFromSection);
router.patch('/:sectionId/questions/:questionId',          authenticate, requireRole('TEACHER'), updateQuestion);
router.post('/:sectionId/complete',                        authenticate, requireRole('STUDENT'), completeSection);

module.exports = router;
