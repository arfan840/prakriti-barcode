import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  let result = [...db.hospitals];
  if (req.query.district) result = result.filter(h => h.district === req.query.district);
  if (req.query.type) result = result.filter(h => h.type === req.query.type);
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    result = result.filter(h => h.name.toLowerCase().includes(s) || h.district.toLowerCase().includes(s));
  }
  res.json(result);
});

router.get('/districts', (req, res) => {
  const districts = [...new Set(db.hospitals.map(h => h.district))].sort();
  res.json(districts);
});

router.get('/:id', (req, res) => {
  const h = db.hospitals.find(h => h.id === req.params.id);
  if (!h) return res.status(404).json({ error: 'Hospital not found' });
  res.json(h);
});

router.post('/', (req, res) => {
  const hospital = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  db.hospitals.push(hospital);
  res.status(201).json(hospital);
});

router.put('/:id', (req, res) => {
  const idx = db.hospitals.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Hospital not found' });
  db.hospitals[idx] = { ...db.hospitals[idx], ...req.body };
  res.json(db.hospitals[idx]);
});

export default router;
