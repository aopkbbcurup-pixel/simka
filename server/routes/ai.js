const express = require('express');
const router = express.Router();
const AIController = require('../controllers/aiController');

// @route   POST api/ai/chat
// @desc    Process chat message
// @access  Private
router.post('/chat', AIController.processMessage);

module.exports = router;
