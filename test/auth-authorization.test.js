const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');

process.env.DB_MODE = 'memory';
const { app, startServer } = require('../server/server.js');

async function requestJson({ path, method = 'GET', body, token }) {
  const server = await startServer(0);
  const payload = body ? JSON.stringify(body) : null;

  const response = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            const data = raw ? JSON.parse(raw) : {};
            resolve({ status: res.statusCode, data });
          } catch (error) {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

  await new Promise((resolve) => server.close(resolve));
  return response;
}

test('login returns JWT for fisherman and official routes are accessible', async () => {
  const loginRes = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'fisher1@demo.local', password: 'fisher123' }
  });

  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.token, 'jwt token is returned');

  const dashboardRes = await requestJson({
    path: '/api/official/dashboard',
    method: 'GET',
    token: loginRes.data.token
  });

  assert.equal(dashboardRes.status, 403);
});

test('PORT_OFFICIAL cannot retrieve fisherman earnings', async () => {
  const loginRes = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'official1@demo.local', password: 'official123' }
  });

  const res = await requestJson({
    path: '/api/fisherman/earnings',
    method: 'GET',
    token: loginRes.data.token
  });

  assert.equal(res.status, 403);
  assert.match(JSON.stringify(res.data), /Forbidden|insufficient permissions/i);
});

test('fisherman only sees their own orders and admin sees all orders', async () => {
  const fisherLogin = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'fisher1@demo.local', password: 'fisher123' }
  });

  const fishermanOrders = await requestJson({
    path: '/api/orders',
    method: 'GET',
    token: fisherLogin.data.token
  });

  assert.equal(fishermanOrders.status, 200);
  assert.deepEqual(fishermanOrders.data.map((order) => order.fishermanId), [1]);

  const buyerLogin = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'buyer1@demo.local', password: 'buyer123' }
  });

  const buyerOrders = await requestJson({
    path: '/api/orders',
    method: 'GET',
    token: buyerLogin.data.token
  });

  assert.equal(buyerOrders.status, 200);
  assert.deepEqual(buyerOrders.data.map((order) => order.buyerId), [11]);

  const adminLogin = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'admin@demo.local', password: 'admin123' }
  });

  const adminOrders = await requestJson({
    path: '/api/orders',
    method: 'GET',
    token: adminLogin.data.token
  });

  assert.equal(adminOrders.status, 200);
  assert.ok(adminOrders.data.length >= 2);
});

test('fisherman dashboard exposes real catches for the listing dropdown and listing creation uses the catch ownership', async () => {
  const fisherLogin = await requestJson({
    path: '/api/auth/login',
    method: 'POST',
    body: { email: 'fisher1@demo.local', password: 'fisher123' }
  });

  const catches = await requestJson({
    path: '/api/catches',
    method: 'GET',
    token: fisherLogin.data.token
  });

  assert.equal(catches.status, 200);
  assert.ok(Array.isArray(catches.data));
  assert.ok(catches.data.length > 0);

  const dashboard = await requestJson({
    path: '/api/fisherman/dashboard',
    method: 'GET',
    token: fisherLogin.data.token
  });

  assert.equal(dashboard.status, 200);
  assert.ok(Array.isArray(dashboard.data.catches));
  assert.ok(dashboard.data.catches.length > 0);

  const catchId = dashboard.data.catches[0].id;
  const createListing = await requestJson({
    path: '/api/listings',
    method: 'POST',
    token: fisherLogin.data.token,
    body: {
      catchId,
      fishSpecies: dashboard.data.catches[0].fishSpecies,
      quantity: 5,
      price: 220,
      saleType: 'DIRECT_SALE'
    }
  });

  assert.equal(createListing.status, 201);
  assert.equal(createListing.data.fishermanId, 1);
  assert.equal(createListing.data.fishSpecies, dashboard.data.catches[0].fishSpecies);
});
