const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getStudentBadges } = require('../controllers/student.controller');

const router = Router();

router.get('/me/badges', authenticate, requireRole('STUDENT'), getStudentBadges);

module.exports = router;
