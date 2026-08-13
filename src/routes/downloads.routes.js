const { Router } = require('express');
const downloadsController = require('../controllers/downloads.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission.middleware');

const router = Router();

router.post('/:fileId', authenticate, downloadsController.requestDownload);
router.get('/my', authenticate, downloadsController.getMyDownloads);
router.get('/:id/receipt', authenticate, downloadsController.getReceipt);

module.exports = router;
