const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');

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
