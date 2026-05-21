const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getChapterSections, createSection, swapSections, patchChapter } = require('../controllers/chapter.controller');
const { exportChapterCsv } = require('../controllers/export.controller');

const router = Router();

router.get('/:chapterId/sections', authenticate, requireRole('TEACHER'), getChapterSections);
router.get('/:chapterId/export', authenticate, requireRole('TEACHER'), exportChapterCsv);
router.post('/:chapterId/sections', authenticate, requireRole('TEACHER'), createSection);
router.patch('/:chapterId/sections/swap', authenticate, requireRole('TEACHER'), swapSections);
router.patch('/:courseId/chapters/:chapterId', authenticate, requireRole('TEACHER'), patchChapter);

module.exports = router;
