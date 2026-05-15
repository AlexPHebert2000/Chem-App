const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { getAllTags, createOrGetTag } = require('../controllers/tag.controller');

const router = Router();
router.use(authenticate, requireRole('TEACHER'));

router.get('/', getAllTags);
router.post('/', createOrGetTag);

module.exports = router;
