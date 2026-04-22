const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createCourse, requestJoin, approveJoin } = require('../controllers/course.controller');

const router = Router();

router.post('/', authenticate, requireRole('TEACHER'), createCourse);
router.post('/:courseId/join-requests', authenticate, requireRole('STUDENT'), requestJoin);
router.post('/:courseId/join-requests/:requestId/approve', authenticate, requireRole('TEACHER'), approveJoin);

module.exports = router;
