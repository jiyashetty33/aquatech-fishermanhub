const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { processVoiceCommand } = require('../services/aiService');

const router = express.Router();

router.post('/command', authenticateToken, async (req, res) => {
  const { text } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ intent: 'UNKNOWN', message: 'No speech text provided.' });
  }

  try {
    const parsed = await processVoiceCommand(text);
    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({ intent: 'UNKNOWN', message: 'AI service unavailable.' });
  }
});

module.exports = router;
