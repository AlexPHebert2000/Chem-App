const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getTeacherCourses, createCourse, cloneCourse, requestJoin, approveJoin, getPendingJoinRequests, createCourseClass, getCourseClasses, patchCourseClass, requestJoinClass, getPendingClassJoinRequests, approveJoinClass, enrollByCode, getClassStudents, getClassChapterStats, getChapterClassStats } = require('../controllers/course.controller');
const { getCourseChapters, createChapter, swapChapters } = require('../controllers/chapter.controller');
const { exportStudentsCsv } = require('../controllers/export.controller');
const { getStudentCourses, getStudentCourseProgress, getStudentCourseChapters, getCourseLeaderboard, getCourseClassLeaderboard } = require('../controllers/student.controller');
const { createReward, getCourseRewards, getStudentCourseRewards, getCourseRedemptions } = require('../controllers/reward.controller');

const router = Router();

function byRole(teacherFn, studentFn) {
  return (req, res) => {
    if (req.user.role === 'TEACHER') return teacherFn(req, res);
    if (req.user.role === 'STUDENT') return studentFn(req, res);
    return res.status(403).json({ error: 'Forbidden' });
  };
}

router.get('/export', authenticate, requireRole('TEACHER'), exportStudentsCsv);
router.post('/enroll-by-code', authenticate, requireRole('STUDENT'), enrollByCode);
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
router.post('/:courseId/rewards', authenticate, requireRole('TEACHER'), createReward);
router.get('/:courseId/rewards', authenticate, byRole(getCourseRewards, getStudentCourseRewards));
router.get('/:courseId/redemptions', authenticate, requireRole('TEACHER'), getCourseRedemptions);
router.get('/:courseId/leaderboard', authenticate, getCourseLeaderboard);
router.post('/:courseId/classes', authenticate, requireRole('TEACHER'), createCourseClass);
router.get('/:courseId/classes', authenticate, requireRole('TEACHER'), getCourseClasses);
router.patch('/:courseId/classes/:classId', authenticate, requireRole('TEACHER'), patchCourseClass);
router.post('/:courseId/classes/:classId/join-requests', authenticate, requireRole('STUDENT'), requestJoinClass);
router.get('/:courseId/classes/:classId/join-requests', authenticate, requireRole('TEACHER'), getPendingClassJoinRequests);
router.post('/:courseId/classes/:classId/join-requests/:requestId/approve', authenticate, requireRole('TEACHER'), approveJoinClass);
router.get('/:courseId/classes/:classId/leaderboard', authenticate, getCourseClassLeaderboard);
router.get('/:courseId/classes/:classId/students', authenticate, requireRole('TEACHER'), getClassStudents);
router.get('/:courseId/classes/:classId/stats', authenticate, requireRole('TEACHER'), getClassChapterStats);
router.get('/:courseId/classes/:classId/chapters/:chapterId/stats', authenticate, requireRole('TEACHER'), getChapterClassStats);

module.exports = router;
