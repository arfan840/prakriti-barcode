import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';
import bwipjs from 'bwip-js';

const router = Router();

router.get('/', (req, res) => {
  let result = [...db.bags];
  if (req.query.status) result = result.filter(b => b.status === req.query.status);
  if (req.query.category) result = result.filter(b => b.category === req.query.category);
  if (req.query.hospitalId) result = result.filter(b => b.hospitalId === req.query.hospitalId);
  if (req.query.from) result = result.filter(b => new Date(b.createdAt) >= new Date(req.query.from));
  if (req.query.to) result = result.filter(b => new Date(b.createdAt) <= new Date(req.query.to));
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    result = result.filter(b => b.barcode.toLowerCase().includes(s) || b.hospitalName?.toLowerCase().includes(s));
  }
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const start = (page - 1) * limit;
  res.json({ total: result.length, page, bags: result.slice(start, start + limit) });
});

router.get('/stats', (req, res) => {
  const total = db.bags.length;
  const byStatus = {};
  const byCategory = {};
  let totalWeight = 0;
  db.bags.forEach(b => {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    byCategory[b.category] = (byCategory[b.category] || 0) + 1;
    totalWeight += b.weight;
  });
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBags = db.bags.filter(b => b.createdAt.slice(0, 10) === todayStr).length;
  res.json({ total, todayBags, totalWeight: parseFloat(totalWeight.toFixed(2)), byStatus, byCategory });
});

router.get('/barcode-image/:barcode', async (req, res) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: req.params.barcode,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

router.get('/:id', (req, res) => {
  const bag = db.bags.find(b => b.id === req.params.id);
  if (!bag) return res.status(404).json({ error: 'Bag not found' });
  res.json(bag);
});

router.post('/', (req, res) => {
  const id = uuidv4();
  const barcode = `BMW${Date.now().toString().slice(-8)}`;
  const hospital = db.hospitals.find(h => h.id === req.body.hospitalId);
  const bag = {
    id, barcode,
    hospitalId: req.body.hospitalId,
    hospitalName: hospital?.name || 'Unknown',
    category: req.body.category,
    weight: parseFloat(req.body.weight) || 0,
    createdAt: new Date().toISOString(),
    collectedAt: null, collectedBy: null,
    receivedAt: null, receivedBy: null,
    status: 'created',
    gpsLat: req.body.gpsLat || null,
    gpsLng: req.body.gpsLng || null,
    scanHistory: [{ action: 'created', timestamp: new Date().toISOString(), userId: req.user?.id }]
  };
  db.bags.push(bag);
  res.status(201).json(bag);
});

router.post('/:id/collect', (req, res) => {
  const bag = db.bags.find(b => b.id === req.params.id);
  if (!bag) return res.status(404).json({ error: 'Bag not found' });
  bag.status = 'collected';
  bag.collectedAt = new Date().toISOString();
  bag.collectedBy = req.user?.id || req.body.driverId;
  bag.weight = req.body.weight || bag.weight;
  if (req.body.gpsLat) { bag.gpsLat = req.body.gpsLat; bag.gpsLng = req.body.gpsLng; }
  bag.scanHistory.push({ action: 'collected', timestamp: bag.collectedAt, userId: bag.collectedBy });
  res.json(bag);
});

router.post('/:id/receive', (req, res) => {
  const bag = db.bags.find(b => b.id === req.params.id);
  if (!bag) return res.status(404).json({ error: 'Bag not found' });
  bag.status = 'received';
  bag.receivedAt = new Date().toISOString();
  bag.receivedBy = req.user?.id || req.body.operatorId;
  bag.scanHistory.push({ action: 'received', timestamp: bag.receivedAt, userId: bag.receivedBy });
  res.json(bag);
});

router.post('/scan', (req, res) => {
  const { barcode } = req.body;
  const bag = db.bags.find(b => b.barcode === barcode);
  if (!bag) return res.status(404).json({ error: 'Bag not found', barcode });
  res.json(bag);
});

export default router;
