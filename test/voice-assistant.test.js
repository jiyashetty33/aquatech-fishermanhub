const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_MODE = 'memory';
const { detectIntentFromAI } = require('../server/services/aiService');
const { startServer } = require('../server/server');

const requiredExamples = [
  ['I caught 30 kilos of mackerel today.', 'RECORD_CATCH', 'Mackerel', 30],
  ['Today we got around thirty kilos of mackerel.', 'RECORD_CATCH', 'Mackerel', 30],
  ['I want to sell 20 kilos of my mackerel directly at 350 rupees per kilo.', 'CREATE_DIRECT_SALE', 'Mackerel', 20],
  ['How much is mackerel selling for?', 'VIEW_MARKET_PRICE', 'Mackerel', null],
  ['Show me my earnings.', 'VIEW_EARNINGS', null, null],
  ['My boat is coming back.', 'UPDATE_VESSEL_STATUS', null, null]
];

test('natural language voice commands return structured intents', async () => {
  for (const [text, intent, species, quantity] of requiredExamples) {
    const result = await detectIntentFromAI(text);
    assert.equal(result.intent, intent, text);
    if (species) assert.equal(result.parameters.species, species, text);
    if (quantity) assert.equal(result.parameters.quantity, quantity, text);
  }

  const auction = await detectIntentFromAI('Put 20 kilos up for auction starting at 300 rupees per kilo.', { species: 'Mackerel' });
  assert.equal(auction.intent, 'CREATE_AUCTION');
  assert.equal(auction.parameters.species, 'Mackerel');
  assert.equal(auction.parameters.price, 300);
});

test('short fish information records a catch while incomplete details ask for clarification', async () => {
  const quantityOnly = await detectIntentFromAI('30 kilos of mackerel.');
  assert.equal(quantityOnly.intent, 'RECORD_CATCH');
  assert.equal(quantityOnly.parameters.species, 'Mackerel');
  assert.equal(quantityOnly.parameters.quantity, 30);
  assert.deepEqual(quantityOnly.missingFields, []);

  const qualityOnly = await detectIntentFromAI('Good quality mackerel.');
  assert.equal(qualityOnly.intent, 'CLARIFICATION_REQUIRED');
  assert.equal(qualityOnly.parameters.species, 'Mackerel');
  assert.deepEqual(qualityOnly.missingFields, ['quantity', 'action']);

  const saleWithoutType = await detectIntentFromAI('20 kilos of mackerel for sale.');
  assert.equal(saleWithoutType.intent, 'CLARIFICATION_REQUIRED');
  assert.deepEqual(saleWithoutType.missingFields, ['action']);
});

test('voice commerce APIs persist catch then auction listing in the running app', async () => {
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const jsonHeaders = { 'Content-Type': 'application/json' };
  const loginResponse = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email: 'fisher1@demo.local', password: 'fisher123' })
  });
  const login = await loginResponse.json();
  const headers = { ...jsonHeaders, Authorization: `Bearer ${login.token}` };

  const catchResponse = await fetch(`${base}/api/catches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fishSpecies: 'Mackerel', quantity: 30, vesselId: 1 })
  });
  assert.equal(catchResponse.status, 201);

  const auctionResponse = await fetch(`${base}/api/auctions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fishSpecies: 'Mackerel', quantity: 20, startingPrice: 300 })
  });
  assert.equal(auctionResponse.status, 201);

  const listings = await (await fetch(`${base}/api/listings`, { headers })).json();
  assert.ok(listings.some((listing) => listing.fishSpecies === 'Mackerel' && listing.quantity === 20 && listing.saleType === 'AUCTION'));

  const available = await (await fetch(`${base}/api/fisherman/available-catches`, { headers })).json();
  assert.ok(available.some((entry) => entry.fishSpecies === 'Mackerel' && entry.availableQuantity === 10));
  await new Promise((resolve) => server.close(resolve));
});
