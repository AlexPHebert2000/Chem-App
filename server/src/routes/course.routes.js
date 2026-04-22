const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createCourse } = require('../controllers/course.controller');

const router = Router();

router.post('/', authenticate, requireRole('TEACHER'), createCourse);

module.exports = router;
