const { Router } = require('express');
const changelogController = require('../controllers/changelog.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createChangelogReleaseSchema } = require('../validators/content.validator');

const router = Router();

router.get('/', optionalAuth, changelogController.list);
router.get('/:version', optionalAuth, changelogController.getByVersion);
router.post('/', authenticate, requirePermission('CHANGELOG_CREATE'), validate(createChangelogReleaseSchema), changelogController.create);
router.patch('/:id', authenticate, requirePermission('CHANGELOG_EDIT'), changelogController.update);
router.delete('/:id', authenticate, requirePermission('CHANGELOG_DELETE'), changelogController.remove);

module.exports = router;
