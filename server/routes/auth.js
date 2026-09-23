const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

function getUserByEmail(store, email) {
  return store.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (process.env.DB_MODE !== 'memory') {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.email, u.password_hash AS passwordHash, u.full_name AS fullName,
                u.phone, u.preferred_language AS language, u.is_active AS isActive, r.name AS role
           FROM users u JOIN roles r ON r.id = u.role_id
          WHERE LOWER(u.email) = LOWER(?) LIMIT 1`,
        [email]
      );
      const user = rows[0];
      if (!user || !user.isActive || !bcrypt.compareSync(String(password), user.passwordHash)) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
      const safeUser = { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, language: user.language, isActive: user.isActive };
      const token = jwt.sign(safeUser, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
      return res.json({ token, user: safeUser });
    } catch (error) {
      console.error('Database login failed:', error);
      return res.status(503).json({ message: 'Login service is temporarily unavailable.' });
    }
  }

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

router.get('/me', authenticateToken, async (req, res) => {
  if (process.env.DB_MODE !== 'memory') {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.email, u.full_name AS fullName, u.phone,
                u.preferred_language AS language, u.is_active AS isActive, r.name AS role
           FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1`,
        [req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ message: 'User not found.' });
      return res.json(rows[0]);
    } catch (error) {
      console.error('Database user lookup failed:', error);
      return res.status(503).json({ message: 'User service is temporarily unavailable.' });
    }
  }

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
