import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  let result = [...db.routes];
  if (req.query.driverId) result = result.filter(r => r.driverId === req.query.driverId);
  if (req.query.status) result = result.filter(r => r.status === req.query.status);
  if (req.query.date) result = result.filter(r => r.date.slice(0, 10) === req.query.date);
  result.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(result);
});

router.get('/:id', (req, res) => {
  const route = db.routes.find(r => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});

router.post('/', (req, res) => {
  const route = {
    id: uuidv4(),
    driverId: req.body.driverId,
    driverName: db.users.find(u => u.id === req.body.driverId)?.name || 'Unknown',
    date: new Date().toISOString(),
    vehicleNumber: req.body.vehicleNumber,
    sites: req.body.sites || [],
    siteNames: (req.body.sites || []).map(sid => db.hospitals.find(h => h.id === sid)?.name || 'Unknown'),
    status: 'active'
  };
  db.routes.push(route);
  res.status(201).json(route);
});

router.post('/:id/close', (req, res) => {
  const route = db.routes.find(r => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  route.status = 'closed';
  res.json(route);
});

// ── Manifests ──
router.get('/:id/manifests', (req, res) => {
  const manifests = db.manifests.filter(m => m.routeId === req.params.id);
  res.json(manifests);
});

router.post('/:id/manifests', (req, res) => {
  const manifest = {
    id: uuidv4(),
    routeId: req.params.id,
    hospitalId: req.body.hospitalId,
    bags: req.body.bags || [],
    closedAt: new Date().toISOString()
  };
  db.manifests.push(manifest);
  res.status(201).json(manifest);
});

// ── Driver check-in ──
router.post('/:id/checkin', (req, res) => {
  const route = db.routes.find(r => r.id === req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  const checkin = {
    routeId: route.id,
    hospitalId: req.body.hospitalId,
    gpsLat: req.body.gpsLat,
    gpsLng: req.body.gpsLng,
    timestamp: new Date().toISOString()
  };
  db.addAudit(req.user?.id || 'system', 'DRIVER_CHECKIN', 'route', route.id, JSON.stringify(checkin));
  res.json({ success: true, checkin });
});

export default router;
