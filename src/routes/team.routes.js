const { Router } = require('express');
const teamController = require('../controllers/team.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createTeamMemberSchema } = require('../validators/company.validator');

const router = Router();

router.get('/', teamController.list);
router.get('/admin/all', authenticate, requirePermission('TEAM_VIEW'), teamController.listAll);
router.post('/', authenticate, requirePermission('TEAM_CREATE'), validate(createTeamMemberSchema), teamController.create);
router.patch('/:id', authenticate, requirePermission('TEAM_EDIT'), teamController.update);
router.delete('/:id', authenticate, requirePermission('TEAM_DELETE'), teamController.remove);

module.exports = router;
