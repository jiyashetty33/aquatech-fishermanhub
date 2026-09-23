const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');
const db = require('../db');

const router = express.Router();

function normalizeOrderEntry(order) {
  return {
    id: order.id,
    buyerId: order.buyerId ?? order.buyer_id,
    fishermanId: order.fishermanId ?? order.fisherman_id,
    fishSpecies: order.fishSpecies || order.fish_species || 'Fish',
    quantity: Number(order.quantity || 0),
    totalAmount: Number(order.totalAmount ?? order.total_amount ?? 0),
    status: order.status || 'PENDING',
    itemStatus: order.itemStatus || order.item_status || order.status || 'PENDING',
    createdAt: order.createdAt || order.created_at || new Date().toISOString(),
    collectionStatus: order.collectionStatus || order.itemStatus || order.item_status || order.status || 'PENDING'
  };
}

router.get('/', authenticateToken, authorizeRole('BUYER', 'FISHERMAN', 'ADMIN'), async (req, res) => {
  const data = req.app.locals.data;

  if (process.env.DB_MODE !== 'memory') {
    try {
      let query = `
        SELECT o.id, o.buyer_id AS buyerId, o.fisherman_id AS fishermanId,
               o.total_amount AS totalAmount, o.status, o.created_at AS createdAt,
               oi.fish_species AS fishSpecies, oi.quantity,
               oi.status AS itemStatus
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id`;
      const params = [];

      if (req.user.role === 'BUYER') {
        const [buyerRows] = await db.query('SELECT id FROM buyers WHERE user_id = ? LIMIT 1', [req.user.id]);
        const buyerId = buyerRows[0]?.id;
        if (!buyerId) return res.json([]);
        query += ' WHERE o.buyer_id = ?';
        params.push(buyerId);
      } else if (req.user.role === 'FISHERMAN') {
        const [fishermanRows] = await db.query('SELECT id FROM fishermen WHERE user_id = ? LIMIT 1', [req.user.id]);
        const fishermanId = fishermanRows[0]?.id;
        if (!fishermanId) return res.json([]);
        query += ' WHERE o.fisherman_id = ?';
        params.push(fishermanId);
      }

      query += ' ORDER BY o.created_at DESC';
      const [rows] = await db.query(query, params);
      return res.json(rows.map(normalizeOrderEntry));
    } catch (error) {
      console.error('Order lookup failed:', error);
      return res.status(503).json({ message: 'Orders are temporarily unavailable.' });
    }
  }

  if (req.user.role === 'ADMIN') {
    return res.json(data.orders.map(normalizeOrderEntry));
  }

  const buyerProfile = data.buyers.find((entry) => entry.userId === req.user.id);
  const fishermanProfile = data.fishermen.find((entry) => entry.userId === req.user.id);

  const filtered = data.orders.filter((order) => {
    if (req.user.role === 'BUYER') {
      return String(order.buyerId) === String(req.user.id) || String(order.buyerId) === String(buyerProfile?.id || '');
    }
    if (req.user.role === 'FISHERMAN') {
      return String(order.fishermanId) === String(fishermanProfile?.id || '') || String(order.fishermanId) === String(req.user.id);
    }
    return true;
  });

  return res.json(filtered.map(normalizeOrderEntry));
});

router.post('/', authenticateToken, authorizeRole('BUYER', 'ADMIN'), (req, res) => {
  const { fishermanId, totalAmount, fishSpecies, quantity } = req.body || {};
  const order = {
    id: Date.now(),
    buyerId: req.user.id,
    fishermanId: Number(fishermanId),
    totalAmount: Number(totalAmount || 0),
    status: 'PAID',
    createdAt: new Date().toISOString()
  };

  req.app.locals.data.orders.push(order);
  req.app.locals.data.transactions.push({
    id: Date.now() + 1,
    buyerId: req.user.id,
    fishermanId: Number(fishermanId),
    orderId: order.id,
    amount: Number(totalAmount || 0),
    type: 'SALE',
    status: 'PAID',
    createdAt: new Date().toISOString()
  });

  return res.status(201).json(order);
});

module.exports = router;
