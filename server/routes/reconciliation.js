import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Run reconciliation for a route
router.post('/run/:routeId', (req, res) => {
  const route = db.routes.find(r => r.id === req.params.routeId);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  // Bags collected on this route
  const collectedBags = db.bags.filter(b => b.collectedBy && route.sites.includes(b.hospitalId) && b.collectedAt);
  const collectedIds = new Set(collectedBags.map(b => b.id));
  
  // Bags received at plant from this route's manifests
  const routeManifests = db.manifests.filter(m => m.routeId === route.id);
  const manifestBagIds = new Set(routeManifests.flatMap(m => m.bags));
  
  const receivedBags = db.bags.filter(b => manifestBagIds.has(b.id) && b.receivedAt);
  const receivedIds = new Set(receivedBags.map(b => b.id));

  const missingAtPlant = collectedBags.filter(b => !receivedIds.has(b.id));
  const unexpectedAtPlant = receivedBags.filter(b => !collectedIds.has(b.id));

  // Auto-create discrepancies
  const newDiscrepancies = [];
  missingAtPlant.forEach(bag => {
    if (!db.discrepancies.find(d => d.bagId === bag.id && d.type === 'MISSING_AT_PLANT' && d.status === 'open')) {
      const disc = {
        id: uuidv4(), bagId: bag.id, barcode: bag.barcode,
        type: 'MISSING_AT_PLANT',
        description: `Bag ${bag.barcode} collected but not received at plant`,
        routeId: route.id,
        createdAt: new Date().toISOString(),
        resolvedAt: null, resolvedBy: null, resolution: null, status: 'open'
      };
      db.discrepancies.push(disc);
      newDiscrepancies.push(disc);
    }
  });
  unexpectedAtPlant.forEach(bag => {
    if (!db.discrepancies.find(d => d.bagId === bag.id && d.type === 'UNEXPECTED_AT_PLANT' && d.status === 'open')) {
      const disc = {
        id: uuidv4(), bagId: bag.id, barcode: bag.barcode,
        type: 'UNEXPECTED_AT_PLANT',
        description: `Bag ${bag.barcode} received at plant but not on any manifest`,
        routeId: route.id,
        createdAt: new Date().toISOString(),
        resolvedAt: null, resolvedBy: null, resolution: null, status: 'open'
      };
      db.discrepancies.push(disc);
      newDiscrepancies.push(disc);
    }
  });

  res.json({
    routeId: route.id,
    collected: collectedBags.length,
    received: receivedBags.length,
    matched: collectedBags.filter(b => receivedIds.has(b.id)).length,
    missingAtPlant: missingAtPlant.length,
    unexpectedAtPlant: unexpectedAtPlant.length,
    newDiscrepancies: newDiscrepancies.length,
    discrepancies: newDiscrepancies
  });
});

// Get all discrepancies
router.get('/discrepancies', (req, res) => {
  let result = [...db.discrepancies];
  if (req.query.status) result = result.filter(d => d.status === req.query.status);
  if (req.query.type) result = result.filter(d => d.type === req.query.type);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

// Resolve discrepancy
router.post('/discrepancies/:id/resolve', (req, res) => {
  const disc = db.discrepancies.find(d => d.id === req.params.id);
  if (!disc) return res.status(404).json({ error: 'Discrepancy not found' });
  disc.resolvedAt = new Date().toISOString();
  disc.resolvedBy = req.user?.id || 'system';
  disc.resolution = req.body.resolution;
  disc.status = 'resolved';
  db.addAudit(req.user?.id || 'system', 'DISCREPANCY_RESOLVED', 'discrepancy', disc.id, disc.resolution);
  res.json(disc);
});

// Dashboard summary
router.get('/summary', (req, res) => {
  const open = db.discrepancies.filter(d => d.status === 'open').length;
  const resolved = db.discrepancies.filter(d => d.status === 'resolved').length;
  const byType = {};
  db.discrepancies.forEach(d => { byType[d.type] = (byType[d.type] || 0) + 1; });
  res.json({ total: db.discrepancies.length, open, resolved, byType });
});

export default router;
