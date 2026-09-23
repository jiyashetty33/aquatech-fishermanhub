let currentFishermanDashboard = null;

async function loadFishermanDashboard() {
  const token = localStorage.getItem('jwtToken');
  if (!token) return;

  try {
    const dashboard = await request('/fisherman/dashboard', { method: 'GET', token });
    currentFishermanDashboard = dashboard;
    const vessel = dashboard.vessel || { name: 'Unknown Vessel', status: 'AT_HARBOR' };
    document.getElementById('vesselInfo').innerHTML = `<p>${vessel.name}</p><p>Status: ${vessel.status}</p>`;
    document.getElementById('tripInfo').innerHTML = `<p>Trip count: ${dashboard.trips.length}</p>`;
    populateCatchSpecies();
    populateListingSpecies(dashboard.availableCatches || []);

    const earnings = await request('/fisherman/earnings', { method: 'GET', token });
    document.getElementById('earningsInfo').innerHTML = `<p>Total sales: ₹${earnings.totalSales || 0}</p>`;

    const prices = await request('/prices', { method: 'GET', token });
    document.getElementById('priceList').innerHTML = prices.map((p) => `<p>${p.fishSpecies}: ₹${p.recentPrice}/kg</p>`).join('');

    const notifications = await request('/notifications', { method: 'GET', token });
    document.getElementById('notificationsList').innerHTML = notifications.map((n) => `<p>${n.title}: ${n.message}</p>`).join('');

    const orders = await request('/orders', { method: 'GET', token });
    const orderItems = Array.isArray(orders) ? orders : orders.items || [];
    document.getElementById('ordersList').innerHTML = orderItems.length
      ? orderItems.map((o) => `
          <div class="order-item">
            <p>ORDER #${o.id}</p>
            <p>${o.fishSpecies || 'Fish'} · ${Number(o.quantity || 0)} kg</p>
            <p>Status: ${o.status || o.itemStatus || 'PENDING'}</p>
            <p>Pickup/Collection: ${o.collectionStatus || o.itemStatus || 'PENDING'}</p>
            <p>Date: ${new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
          </div>
        `).join('')
      : '<p>No orders yet.</p>';
    return dashboard;
  } catch (error) {
    const responseBox = document.getElementById('voiceResponse');
    if (responseBox) {
      responseBox.textContent = 'Unable to load dashboard.';
    }
    return null;
  }
}

function populateCatchSpecies() {
  const select = document.getElementById('catchSpecies');
  if (!select) return;
  select.innerHTML = '<option value="">Select fish species</option>';
  FISH_SPECIES.forEach((species) => {
    select.insertAdjacentHTML('beforeend', `<option value="${species}">${species}</option>`);
  });
}

function populateListingSpecies(availableCatches) {
  const select = document.getElementById('listingSpecies');
  if (!select) return;
  select.innerHTML = '<option value="">Select fish from your catch</option>';
  availableCatches.forEach((catchItem) => {
    const quantity = Number(catchItem.availableQuantity);
    select.insertAdjacentHTML('beforeend', `<option value="${catchItem.fishSpecies}" data-available="${quantity}">${catchItem.fishSpecies} - ${quantity} kg available</option>`);
  });
  updateListingAvailability();
}

function updateListingAvailability() {
  const select = document.getElementById('listingSpecies');
  const available = document.getElementById('listingAvailable');
  if (!select || !available) return;
  const option = select.options[select.selectedIndex];
  available.textContent = option && option.dataset.available ? `Available: ${option.dataset.available} kg` : '';
}

window.refreshFishermanDashboard = loadFishermanDashboard;

function showFishermanMessage(message) {
  const catchBox = document.getElementById('catchResult');
  if (catchBox) catchBox.textContent = message;
}

function showStatusMessage(message) {
  const statusBox = document.getElementById('statusResult');
  if (statusBox) statusBox.textContent = message;
}

async function updateMyVesselStatus(status) {
  const token = localStorage.getItem('jwtToken');
  const vesselId = currentFishermanDashboard?.vessel?.id;
  if (!vesselId) {
    showStatusMessage('Your assigned vessel could not be found.');
    return;
  }

  const buttons = [
    document.getElementById('statusDeparted'),
    document.getElementById('statusReturning'),
    document.getElementById('statusDocked')
  ].filter(Boolean);
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const result = await request(`/vessels/${vesselId}/status`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ status, source: 'FISHERMAN' })
    });
    showStatusMessage(result.message || 'Vessel status updated.');
    voiceAssistant.speak(`Your vessel status is now ${status.replace(/_/g, ' ').toLowerCase()}.`);
    await loadFishermanDashboard();
  } catch (error) {
    console.error('Vessel status update failed:', error);
    showStatusMessage('Unable to update vessel status. Please try again.');
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

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

  const voiceButton = document.getElementById('voiceBtn');
  const listenButton = document.getElementById('listenBtn');
  if (voiceButton) voiceButton.addEventListener('click', () => voiceAssistant.start());
  if (listenButton) listenButton.addEventListener('click', () => {
    voiceAssistant.speak('Your vessel is ready. Please speak a command.');
  });

  document.getElementById('statusDeparted').addEventListener('click', () => updateMyVesselStatus('DEPARTED'));
  document.getElementById('statusReturning').addEventListener('click', () => updateMyVesselStatus('RETURNING'));
  document.getElementById('statusDocked').addEventListener('click', () => updateMyVesselStatus('DOCKED'));

  document.getElementById('catchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const species = document.getElementById('catchSpecies').value;
    if (!species) {
      showFishermanMessage('Please select a fish species.');
      return;
    }
    const payload = {
      fishSpecies: species,
      quantity: document.getElementById('catchQuantity').value,
      catchLocation: document.getElementById('catchLocation').value,
      vesselId: currentFishermanDashboard?.vessel?.id
    };

    try {
      const result = await request('/catches', { method: 'POST', token, body: JSON.stringify(payload) });
      showFishermanMessage(`Catch saved: ${result.fishSpecies}`);
      await loadFishermanDashboard();
    } catch (error) {
      showFishermanMessage('Unable to save the catch. Please check the details and try again.');
    }
  });

  document.getElementById('listingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const speciesSelect = document.getElementById('listingSpecies');
    const selectedOption = speciesSelect.options[speciesSelect.selectedIndex];
    const species = speciesSelect.value;
    const requestedQuantity = Number(document.getElementById('listingQuantity').value);
    const availableQuantity = Number(selectedOption?.dataset.available || 0);
    if (!species) {
      showFishermanMessage('Please select a fish species from your catch.');
      return;
    }
    if (requestedQuantity > availableQuantity) {
      showFishermanMessage(`You only have ${availableQuantity} kg of ${species} available.`);
      return;
    }
    const payload = {
      fishSpecies: species,
      quantity: requestedQuantity,
      price: document.getElementById('listingPrice').value,
      saleType: document.getElementById('listingType').value,
      quality: 'A'
    };

    try {
      const result = await request('/listings', { method: 'POST', token, body: JSON.stringify(payload) });
      showFishermanMessage(`Listing created: ${result.fishSpecies}`);
      await loadFishermanDashboard();
    } catch (error) {
      showFishermanMessage('Unable to create the listing. Please check the available quantity and try again.');
    }
  });

  document.getElementById('listingSpecies').addEventListener('change', updateListingAvailability);

  await loadFishermanDashboard();

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});
