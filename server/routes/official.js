const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/roles');

const router = express.Router();

router.get('/dashboard', authenticateToken, authorizeRole('PORT_OFFICIAL', 'ADMIN'), (req, res) => {
  const data = req.app.locals.data;

  const totalVessels = data.vessels.length;
  const byStatus = data.vessels.reduce((acc, vessel) => {
    acc[vessel.status] = (acc[vessel.status] || 0) + 1;
    return acc;
  }, {});

  const dashboard = {
    lastUpdated: new Date().toISOString(),
    summary: {
      totalVessels,
      atHarbor: byStatus.AT_HARBOR || 0,
      departed: byStatus.DEPARTED || 0,
      fishing: byStatus.FISHING || 0,
      returning: byStatus.RETURNING || 0,
      anchored: byStatus.ANCHORED || 0,
      arrived: byStatus.ARRIVED || 0,
      docked: byStatus.DOCKED || 0,
      activeTrips: data.fishingTrips.filter((trip) => trip.status === 'ACTIVE').length
    },
    vessels: data.vessels.map((vessel) => ({
      id: vessel.id,
      name: vessel.name,
      fisherman: vessel.fishermanName,
      status: vessel.status,
      departureTime: vessel.departureTime,
      expectedReturn: vessel.expectedReturn,
      lastUpdated: vessel.lastUpdated
    })),
    fishingTrips: data.fishingTrips.map((trip) => ({
      id: trip.id,
      vessel: trip.vesselName,
      departure: trip.departureTime,
      status: trip.status,
      expectedReturn: trip.expectedReturn,
      actualReturn: trip.actualReturn
    })),
    alerts: data.alerts,
    activity: {
      arrivals: 3,
      departures: 5,
      harborOccupancy: '72%',
      warnings: ['Harbor waterway congestion near Bunder jetty', 'Strong wind advisory for small craft']
    },
    operationalStats: {
      vesselActivity: 'Normal',
      fishingTripStatus: 'Monitoring',
      arrivalDepartureStats: {
        arrivals: 14,
        departures: 11
      }
    }
  };

  return res.json(dashboard);
});

module.exports = router;
