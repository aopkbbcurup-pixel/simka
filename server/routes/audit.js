const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Get logs - Admin only
router.get('/', authenticateToken, authorize(['admin']), auditController.getLogs);

module.exports = router;
