const { Router } = require('express');
const { startWorkSession, endWorkSession } = require('../controllers/study.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.post('/start', authenticate, requireRole('STUDENT'), startWorkSession);
router.post('/end', authenticate, requireRole('STUDENT'), endWorkSession);

module.exports = router;
