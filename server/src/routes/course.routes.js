const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createCourse, requestJoin, approveJoin, getPendingJoinRequests } = require('../controllers/course.controller');
const { createChapter, swapChapters } = require('../controllers/chapter.controller');

const router = Router();

router.post('/', authenticate, requireRole('TEACHER'), createCourse);
router.post('/:courseId/join-requests', authenticate, requireRole('STUDENT'), requestJoin);
router.get('/:courseId/join-requests', authenticate, requireRole('TEACHER'), getPendingJoinRequests);
router.post('/:courseId/chapters', authenticate, requireRole('TEACHER'), createChapter);
router.patch('/:courseId/chapters/swap', authenticate, requireRole('TEACHER'), swapChapters);
router.post('/:courseId/join-requests/:requestId/approve', authenticate, requireRole('TEACHER'), approveJoin);

module.exports = router;
