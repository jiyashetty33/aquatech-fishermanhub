const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { processVoiceCommand } = require('../services/aiService');

const router = express.Router();

router.post('/command', authenticateToken, async (req, res) => {
  const { text, language = 'en' } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ intent: 'UNKNOWN', message: 'No speech text provided.' });
  }

  try {
    req.app.locals.voiceContexts = req.app.locals.voiceContexts || {};
    const context = req.app.locals.voiceContexts[req.user.id] || {};
    const parsed = await processVoiceCommand(text, { ...context, language });
    if (parsed.intent && parsed.intent !== 'UNKNOWN') context.lastIntent = parsed.intent;
    if (parsed.parameters?.species) context.species = parsed.parameters.species;
    if (parsed.parameters?.quantity) context.quantity = parsed.parameters.quantity;
    if (parsed.parameters?.listingQuantity) context.listingQuantity = parsed.parameters.listingQuantity;
    if (parsed.parameters?.price) context.price = parsed.parameters.price;
    if (parsed.parameters?.quality) context.quality = parsed.parameters.quality;
    req.app.locals.voiceContexts[req.user.id] = context;
    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({ intent: 'UNKNOWN', message: 'AI service unavailable.' });
  }
});

module.exports = router;
