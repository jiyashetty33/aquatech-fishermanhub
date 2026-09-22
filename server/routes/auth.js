const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function getUserByEmail(store, email) {
  return store.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const store = req.app.locals.data;
  const user = getUserByEmail(store, email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const validPassword = bcrypt.compareSync(String(password), user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    language: user.language,
    isActive: user.isActive
  };

  const token = jwt.sign(safeUser, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
  return res.json({ token, user: safeUser });
});

router.get('/me', authenticateToken, (req, res) => {
  const store = req.app.locals.data;
  const user = store.users.find((entry) => entry.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    language: user.language
  });
});

module.exports = router;
