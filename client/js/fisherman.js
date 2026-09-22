document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userLabel = document.getElementById('userLabel');
  if (userLabel && user.fullName) userLabel.textContent = `Welcome, ${user.fullName}`;

  const languageSelect = document.getElementById('languageSelect');
  languageSelect.addEventListener('change', () => {
    localStorage.setItem('language', languageSelect.value);
  });

  document.getElementById('voiceBtn').addEventListener('click', () => voiceAssistant.start());
  document.getElementById('listenBtn').addEventListener('click', () => {
    voiceAssistant.speak('Your vessel is ready. Please speak a command.');
  });

  document.getElementById('statusDeparted').addEventListener('click', async () => {
    try {
      const result = await request('/vessels/1/status', { method: 'PUT', token, body: JSON.stringify({ status: 'DEPARTED' }) });
      document.getElementById('statusResult').textContent = result.message;
      voiceAssistant.speak('Your vessel status is now Departed.');
    } catch (error) {
      document.getElementById('statusResult').textContent = error.message;
    }
  });

  document.getElementById('catchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      fishSpecies: document.getElementById('catchFish').value,
      quantity: document.getElementById('catchQuantity').value,
      catchLocation: document.getElementById('catchLocation').value,
      vesselId: 1,
      fishingTripId: 1
    };

    try {
      const result = await request('/catches', { method: 'POST', token, body: JSON.stringify(payload) });
      document.getElementById('voiceResponse').textContent = `Catch saved: ${result.fishSpecies}`;
    } catch (error) {
      document.getElementById('voiceResponse').textContent = error.message;
    }
  });

  document.getElementById('listingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      fishSpecies: document.getElementById('listingFish').value,
      quantity: document.getElementById('listingQuantity').value,
      price: document.getElementById('listingPrice').value,
      saleType: document.getElementById('listingType').value,
      quality: 'A'
    };

    try {
      const result = await request('/listings', { method: 'POST', token, body: JSON.stringify(payload) });
      document.getElementById('voiceResponse').textContent = `Listing created: ${result.fishSpecies}`;
    } catch (error) {
      document.getElementById('voiceResponse').textContent = error.message;
    }
  });

  try {
    const dashboard = await request('/fisherman/dashboard', { method: 'GET', token });
    const vessel = dashboard.vessel || { name: 'Unknown Vessel', status: 'AT_HARBOR' };
    document.getElementById('vesselInfo').innerHTML = `<p>${vessel.name}</p><p>Status: ${vessel.status}</p>`;
    document.getElementById('tripInfo').innerHTML = `<p>Trip count: ${dashboard.trips.length}</p>`;

    const earnings = await request('/fisherman/earnings', { method: 'GET', token });
    document.getElementById('earningsInfo').innerHTML = `<p>Total sales: ₹${earnings.totalSales || 0}</p>`;

    const prices = await request('/prices', { method: 'GET', token });
    document.getElementById('priceList').innerHTML = prices.map((p) => `<p>${p.fishSpecies}: ₹${p.recentPrice}/kg</p>`).join('');

    const notifications = await request('/notifications', { method: 'GET', token });
    document.getElementById('notificationsList').innerHTML = notifications.map((n) => `<p>${n.title}: ${n.message}</p>`).join('');

    const orders = await request('/orders', { method: 'GET', token });
    document.getElementById('ordersList').innerHTML = orders.map((o) => `<p>Order #${o.id}: ₹${o.totalAmount}</p>`).join('');
  } catch (error) {
    document.getElementById('voiceResponse').textContent = error.message;
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});
