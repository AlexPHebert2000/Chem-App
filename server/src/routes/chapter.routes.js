const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { createSection, swapSections } = require('../controllers/chapter.controller');

const router = Router();

router.post('/:chapterId/sections', authenticate, requireRole('TEACHER'), createSection);
router.patch('/:chapterId/sections/swap', authenticate, requireRole('TEACHER'), swapSections);

module.exports = router;
