const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getTeacherCourses, createCourse, cloneCourse, requestJoin, approveJoin, getPendingJoinRequests } = require('../controllers/course.controller');
const { getCourseChapters, createChapter, swapChapters } = require('../controllers/chapter.controller');
const { exportStudentsCsv } = require('../controllers/export.controller');
const { getStudentCourses, getStudentCourseProgress, getStudentCourseChapters } = require('../controllers/student.controller');

const router = Router();

function byRole(teacherFn, studentFn) {
  return (req, res) => {
    if (req.user.role === 'TEACHER') return teacherFn(req, res);
    if (req.user.role === 'STUDENT') return studentFn(req, res);
    return res.status(403).json({ error: 'Forbidden' });
  };
}

router.get('/export', authenticate, requireRole('TEACHER'), exportStudentsCsv);
router.get('/', authenticate, byRole(getTeacherCourses, getStudentCourses));
router.post('/', authenticate, requireRole('TEACHER'), createCourse);
router.post('/:courseId/clone', authenticate, requireRole('TEACHER'), cloneCourse);
router.post('/:courseId/join-requests', authenticate, requireRole('STUDENT'), requestJoin);
router.get('/:courseId/join-requests', authenticate, requireRole('TEACHER'), getPendingJoinRequests);
router.get('/:courseId/progress', authenticate, requireRole('STUDENT'), getStudentCourseProgress);
router.get('/:courseId/chapters', authenticate, byRole(getCourseChapters, getStudentCourseChapters));
router.post('/:courseId/chapters', authenticate, requireRole('TEACHER'), createChapter);
router.patch('/:courseId/chapters/swap', authenticate, requireRole('TEACHER'), swapChapters);
router.post('/:courseId/join-requests/:requestId/approve', authenticate, requireRole('TEACHER'), approveJoin);

module.exports = router;
