const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getStudentMe, getStudentBadges, patchStudentProfile, setWeeklyGoal } = require('../controllers/student.controller');

const router = Router();

router.get('/me', authenticate, requireRole('STUDENT'), getStudentMe);
router.patch('/me', authenticate, requireRole('STUDENT'), patchStudentProfile);
router.patch('/me/goal', authenticate, requireRole('STUDENT'), setWeeklyGoal);
router.get('/me/badges', authenticate, requireRole('STUDENT'), getStudentBadges);

module.exports = router;
