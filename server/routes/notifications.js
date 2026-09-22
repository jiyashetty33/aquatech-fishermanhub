const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('FISHERMAN', 'PORT_OFFICIAL', 'ADMIN', 'BUYER'), (req, res) => {
  return res.json(req.app.locals.data.notifications.filter((n) => n.userId === req.user.id));
});

module.exports = router;
