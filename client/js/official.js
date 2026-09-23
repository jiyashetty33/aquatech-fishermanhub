document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const adminSection = document.getElementById('adminOrderSection');

  const refreshDashboard = async () => {
    try {
      const dashboard = await request('/official/dashboard', { method: 'GET', token });
      document.getElementById('totalVessels').textContent = dashboard.summary.totalVessels;
      document.getElementById('atHarbor').textContent = dashboard.summary.atHarbor;
      document.getElementById('departed').textContent = dashboard.summary.departed;
      document.getElementById('fishing').textContent = dashboard.summary.fishing;
      document.getElementById('returning').textContent = dashboard.summary.returning;
      document.getElementById('anchored').textContent = dashboard.summary.anchored;
      document.getElementById('arrived').textContent = dashboard.summary.arrived;
      document.getElementById('docked').textContent = dashboard.summary.docked;
      document.getElementById('lastUpdatedLabel').textContent = `Last updated: ${new Date(dashboard.lastUpdated).toLocaleTimeString()}`;

      const rows = dashboard.vessels.map((v) => `
        <tr>
          <td>${v.id}</td>
          <td>${v.name}</td>
          <td>${v.fisherman}</td>
          <td>${v.status}</td>
          <td>${v.departureTime || '-'}</td>
          <td>${v.expectedReturn || '-'}</td>
          <td>${v.lastUpdated || '-'}</td>
        </tr>
      `).join('');
      document.getElementById('officialVesselTable').innerHTML = rows;

      document.getElementById('officialTrips').innerHTML = dashboard.fishingTrips.map((trip) => `
        <div class="card"><strong>${trip.vessel}</strong><p>${trip.status}</p><p>Departure: ${trip.departure}</p></div>
      `).join('');

      document.getElementById('portActivity').innerHTML = `<p>Arrivals: ${dashboard.activity.arrivals}</p><p>Departures: ${dashboard.activity.departures}</p><p>Occupancy: ${dashboard.activity.harborOccupancy}</p>`;
      document.getElementById('alertsList').innerHTML = dashboard.alerts.map((alert) => `<p>${alert.title}: ${alert.message}</p>`).join('');

      if (currentUser.role === 'ADMIN' && adminSection) {
        try {
          const orders = await request('/orders', { method: 'GET', token });
          const orderRows = Array.isArray(orders) ? orders : (orders.items || []);
          document.getElementById('adminOrderTable').innerHTML = orderRows.map((order) => `
            <tr>
              <td>#${order.id}</td>
              <td>${order.fishSpecies || 'Fish'}</td>
              <td>${Number(order.quantity || 0)} kg</td>
              <td>${order.fishermanId || '-'}</td>
              <td>${order.status || order.itemStatus || 'PENDING'}</td>
              <td>${new Date(order.createdAt || Date.now()).toLocaleDateString()}</td>
              <td>${order.collectionStatus || order.itemStatus || 'PENDING'}</td>
            </tr>
          `).join('') || '<tr><td colspan="7">No orders found.</td></tr>';
          adminSection.style.display = 'block';
        } catch (error) {
          console.error('Admin orders failed:', error);
          adminSection.style.display = 'none';
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  refreshDashboard();
  setInterval(refreshDashboard, 10000);

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });
});
