const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getChapterSections, createSection, swapSections } = require('../controllers/chapter.controller');

const router = Router();

router.get('/:chapterId/sections', authenticate, requireRole('TEACHER'), getChapterSections);
router.post('/:chapterId/sections', authenticate, requireRole('TEACHER'), createSection);
router.patch('/:chapterId/sections/swap', authenticate, requireRole('TEACHER'), swapSections);

module.exports = router;
