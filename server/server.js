const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const { authenticateToken } = require('./middleware/auth');
const { authorizeRole } = require('./middleware/roles');
const authRoutes = require('./routes/auth');
const officialRoutes = require('./routes/official');
const fishermanRoutes = require('./routes/fisherman');
const vesselsRoutes = require('./routes/vessels');
const fishingTripsRoutes = require('./routes/fishingTrips');
const catchesRoutes = require('./routes/catches');
const listingsRoutes = require('./routes/listings');
const auctionsRoutes = require('./routes/auctions');
const ordersRoutes = require('./routes/orders');
const pricesRoutes = require('./routes/prices');
const notificationsRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const fishSpecies = require('./services/fishSpecies');
const db = require('./db');

dotenv.config();

function createDemoData() {
  return {
    fishSpecies,
    users: [
      { id: 1, email: 'admin@demo.local', fullName: 'Admin User', phone: '9000000001', role: 'ADMIN', language: 'en', passwordHash: bcrypt.hashSync('admin123', 10), isActive: true },
      { id: 2, email: 'official1@demo.local', fullName: 'Port Official One', phone: '9000000002', role: 'PORT_OFFICIAL', language: 'en', passwordHash: bcrypt.hashSync('official123', 10), isActive: true },
      { id: 3, email: 'official2@demo.local', fullName: 'Port Official Two', phone: '9000000003', role: 'PORT_OFFICIAL', language: 'en', passwordHash: bcrypt.hashSync('official123', 10), isActive: true },
      { id: 4, email: 'market1@demo.local', fullName: 'Market Operator One', phone: '9000000004', role: 'MARKET_OPERATOR', language: 'en', passwordHash: bcrypt.hashSync('market123', 10), isActive: true },
      { id: 5, email: 'market2@demo.local', fullName: 'Market Operator Two', phone: '9000000005', role: 'MARKET_OPERATOR', language: 'en', passwordHash: bcrypt.hashSync('market123', 10), isActive: true },
      { id: 6, email: 'fisher1@demo.local', fullName: 'Fisherman One', phone: '9000000006', role: 'FISHERMAN', language: 'kn', passwordHash: bcrypt.hashSync('fisher123', 10), isActive: true },
      { id: 7, email: 'fisher2@demo.local', fullName: 'Fisherman Two', phone: '9000000007', role: 'FISHERMAN', language: 'ml', passwordHash: bcrypt.hashSync('fisher123', 10), isActive: true },
      { id: 8, email: 'fisher3@demo.local', fullName: 'Fisherman Three', phone: '9000000008', role: 'FISHERMAN', language: 'en', passwordHash: bcrypt.hashSync('fisher123', 10), isActive: true },
      { id: 9, email: 'fisher4@demo.local', fullName: 'Fisherman Four', phone: '9000000009', role: 'FISHERMAN', language: 'tulu', passwordHash: bcrypt.hashSync('fisher123', 10), isActive: true },
      { id: 10, email: 'fisher5@demo.local', fullName: 'Fisherman Five', phone: '9000000010', role: 'FISHERMAN', language: 'en', passwordHash: bcrypt.hashSync('fisher123', 10), isActive: true },
      { id: 11, email: 'buyer1@demo.local', fullName: 'Buyer One', phone: '9000000011', role: 'BUYER', language: 'en', passwordHash: bcrypt.hashSync('buyer123', 10), isActive: true },
      { id: 12, email: 'buyer2@demo.local', fullName: 'Buyer Two', phone: '9000000012', role: 'BUYER', language: 'en', passwordHash: bcrypt.hashSync('buyer123', 10), isActive: true }
    ],
    fishermen: [
      { id: 1, userId: 6, fishermanId: 'FISH-001', vesselId: 1, status: 'ACTIVE', verified: true },
      { id: 2, userId: 7, fishermanId: 'FISH-002', vesselId: 2, status: 'ACTIVE', verified: true },
      { id: 3, userId: 8, fishermanId: 'FISH-003', vesselId: 3, status: 'ACTIVE', verified: true },
      { id: 4, userId: 9, fishermanId: 'FISH-004', vesselId: 4, status: 'ACTIVE', verified: true },
      { id: 5, userId: 10, fishermanId: 'FISH-005', vesselId: 5, status: 'ACTIVE', verified: true }
    ],
    buyers: [
      { id: 1, userId: 11, buyerId: 'BUY-001' },
      { id: 2, userId: 12, buyerId: 'BUY-002' }
    ],
    vessels: [
      { id: 1, name: 'Blue Horizon', registrationNumber: 'KA-01-MB-1001', fishermanId: 1, fishermanName: 'Fisherman One', vesselType: 'Trawler', status: 'AT_HARBOR', departureTime: null, expectedReturn: null, lastUpdated: '2026-09-22T05:00:00Z' },
      { id: 2, name: 'Sea Pearl', registrationNumber: 'KA-01-MB-1002', fishermanId: 2, fishermanName: 'Fisherman Two', vesselType: 'Gillnetter', status: 'DEPARTED', departureTime: '2026-09-22T05:30:00Z', expectedReturn: '2026-09-22T18:30:00Z', lastUpdated: '2026-09-22T06:00:00Z' },
      { id: 3, name: 'Ocean Grace', registrationNumber: 'KA-01-MB-1003', fishermanId: 3, fishermanName: 'Fisherman Three', vesselType: 'Trawler', status: 'FISHING', departureTime: '2026-09-22T04:00:00Z', expectedReturn: '2026-09-22T17:00:00Z', lastUpdated: '2026-09-22T08:15:00Z' },
      { id: 4, name: 'Harbor Tide', registrationNumber: 'KA-01-MB-1004', fishermanId: 4, fishermanName: 'Fisherman Four', vesselType: 'Longliner', status: 'RETURNING', departureTime: '2026-09-22T06:00:00Z', expectedReturn: '2026-09-22T15:00:00Z', lastUpdated: '2026-09-22T10:30:00Z' },
      { id: 5, name: 'Sunrise Knot', registrationNumber: 'KA-01-MB-1005', fishermanId: 5, fishermanName: 'Fisherman Five', vesselType: 'Purse Seiner', status: 'DOCKED', departureTime: '2026-09-22T08:00:00Z', expectedReturn: '2026-09-22T20:00:00Z', lastUpdated: '2026-09-22T09:00:00Z' }
    ],
    fishingTrips: [
      { id: 1, vesselId: 2, vesselName: 'Sea Pearl', fishermanId: 2, departureTime: '2026-09-22T05:30:00Z', expectedReturn: '2026-09-22T18:30:00Z', actualReturn: null, status: 'ACTIVE' },
      { id: 2, vesselId: 3, vesselName: 'Ocean Grace', fishermanId: 3, departureTime: '2026-09-22T04:00:00Z', expectedReturn: '2026-09-22T17:00:00Z', actualReturn: null, status: 'ACTIVE' },
      { id: 3, vesselId: 4, vesselName: 'Harbor Tide', fishermanId: 4, departureTime: '2026-09-22T06:00:00Z', expectedReturn: '2026-09-22T15:00:00Z', actualReturn: '2026-09-22T14:50:00Z', status: 'COMPLETED' }
    ],
    catches: [
      { id: 1, fishSpecies: 'Mackerel', quantity: 30, unit: 'kg', quality: 'A', catchDate: '2026-09-22T09:00:00Z', catchLocation: 'Mangaluru Coast', vesselId: 3, fishingTripId: 2 },
      { id: 2, fishSpecies: 'Sardine', quantity: 45, unit: 'kg', quality: 'B', catchDate: '2026-09-22T10:00:00Z', catchLocation: 'Mangaluru Coast', vesselId: 2, fishingTripId: 1 },
      { id: 3, fishSpecies: 'Mackerel', quantity: 50, unit: 'kg', quality: 'A', catchDate: '2026-09-22T08:30:00Z', catchLocation: 'Mangaluru Coast', vesselId: 1, fishingTripId: null }
    ],
    listings: [
      { id: 1, fishermanId: 1, fishSpecies: 'Mackerel', quantity: 50, availableQuantity: 50, quality: 'A', price: 300, saleType: 'AUCTION', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: 2, fishermanId: 2, fishSpecies: 'Sardine', quantity: 40, availableQuantity: 40, quality: 'B', price: 180, saleType: 'DIRECT_SALE', status: 'ACTIVE', createdAt: new Date().toISOString() }
    ],
    auctions: [
      { id: 1, listingId: 1, fishermanId: 1, fishSpecies: 'Mackerel', quantity: 50, startingPrice: 300, currentBid: 330, currentBidderId: 11, status: 'ACTIVE', durationMinutes: 120, closesAt: '2026-09-22T20:00:00Z' }
    ],
    bids: [
      { id: 1, auctionId: 1, buyerId: 11, amount: 330, status: 'ACTIVE' }
    ],
    orders: [
      { id: 1, buyerId: 11, fishermanId: 1, totalAmount: 6000, status: 'PAID', createdAt: new Date().toISOString() },
      { id: 2, buyerId: 12, fishermanId: 2, totalAmount: 4500, status: 'PENDING', createdAt: new Date().toISOString() }
    ],
    priceHistory: [
      { fishSpecies: 'Mackerel', recentPrice: 310, averagePrice: 295, recordedDate: '2026-09-22', trend: 'UP' },
      { fishSpecies: 'Sardine', recentPrice: 180, averagePrice: 170, recordedDate: '2026-09-22', trend: 'UP' },
      { fishSpecies: 'Tuna', recentPrice: 420, averagePrice: 405, recordedDate: '2026-09-22', trend: 'UP' }
    ],
    notifications: [
      { id: 1, userId: 6, title: 'New Bid', message: 'A buyer placed a bid on your Mackerel auction.', type: 'AUCTION', isRead: false },
      { id: 2, userId: 2, title: 'Harbor Alert', message: 'Two vessels are nearing the dock.', type: 'PORT', isRead: false },
      { id: 3, userId: 1, title: 'System', message: 'Demo database initialized successfully.', type: 'INFO', isRead: true }
    ],
    alerts: [
      { id: 1, fishermanId: 2, vesselId: 2, title: 'Vessel Returning', message: 'Sea Pearl is returning to the harbor.', type: 'INFO', time: new Date().toISOString() },
      { id: 2, fishermanId: 3, vesselId: 3, title: 'Emergency', message: 'Crew reported engine warning near Mangaluru coast.', type: 'EMERGENCY', time: new Date().toISOString() }
    ],
    vesselStatusHistory: [
      { id: 1, vesselId: 1, oldStatus: 'AT_HARBOR', newStatus: 'AT_HARBOR', updatedBy: 2, timestamp: new Date().toISOString(), source: 'OFFICIAL' }
    ],
    transactions: [
      { id: 1, buyerId: 11, fishermanId: 1, orderId: 1, amount: 6000, type: 'SALE', status: 'PAID' },
      { id: 2, buyerId: 12, fishermanId: 2, orderId: 2, amount: 4500, type: 'SALE', status: 'PENDING' }
    ],
    auditLogs: []
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.locals.data = createDemoData();

app.get('/api/health', async (req, res) => {
  if (process.env.DB_MODE === 'memory') {
    return res.json({ ok: true, server: 'running', database: 'memory-mode' });
  }
  try {
    await db.query('SELECT 1 AS connected');
    return res.json({ ok: true, server: 'running', database: 'connected', databaseName: process.env.DB_NAME });
  } catch (error) {
    console.error('Health database check failed:', error);
    return res.status(503).json({ ok: false, server: 'running', database: 'unavailable', message: 'Database unavailable.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/official', officialRoutes);
app.use('/api/fisherman', fishermanRoutes);
app.use('/api/vessels', vesselsRoutes);
app.use('/api/fishing-trips', fishingTripsRoutes);
app.use('/api/catches', catchesRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/auctions', auctionsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/login.html'));
});

async function startServer(port = Number(process.env.PORT || 3000)) {
  if (process.env.DB_MODE !== 'memory') {
    try {
      await db.query('SELECT 1 AS connected');
    } catch (error) {
      throw new Error(`MySQL connection failed. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME. ${error.message}`);
    }
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

if (require.main === module) {
  startServer().then((server) => {
    const actualPort = server.address().port;
    console.log(`Server running on http://localhost:${actualPort}`);
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer, createDemoData };
