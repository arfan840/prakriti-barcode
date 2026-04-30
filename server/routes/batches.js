import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  let result = [...db.batches];
  if (req.query.status) result = result.filter(b => b.status === req.query.status);
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(result);
});

router.get('/:id', (req, res) => {
  const batch = db.batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
});

router.post('/', (req, res) => {
  const bagIds = req.body.bags || [];
  const batchBags = db.bags.filter(b => bagIds.includes(b.id));
  batchBags.forEach(b => { b.status = 'in_batch'; });
  const batch = {
    id: uuidv4(),
    batchNumber: `BATCH-${String(db.batches.length + 1).padStart(4, '0')}`,
    bags: bagIds,
    bagCount: batchBags.length,
    totalWeight: parseFloat(batchBags.reduce((s, b) => s + b.weight, 0).toFixed(2)),
    categories: [...new Set(batchBags.map(b => b.category))],
    createdAt: new Date().toISOString(),
    treatedAt: null,
    treatmentType: null,
    operator: null,
    status: 'pending',
    certificate: null
  };
  db.batches.push(batch);
  res.status(201).json(batch);
});

router.post('/:id/treat', (req, res) => {
  const batch = db.batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  batch.treatedAt = new Date().toISOString();
  batch.treatmentType = req.body.treatmentType;
  batch.operator = req.user?.name || req.body.operator;
  batch.status = 'treated';
  // Update bag statuses
  batch.bags.forEach(bagId => {
    const bag = db.bags.find(b => b.id === bagId);
    if (bag) bag.status = 'treated';
  });
  // Generate certificate
  batch.certificate = {
    id: uuidv4(),
    generatedAt: new Date().toISOString()
  };
  db.addAudit(req.user?.id || 'system', 'TREATMENT_LOGGED', 'batch', batch.id, `Treatment: ${batch.treatmentType}`);
  res.json(batch);
});

router.get('/:id/certificate', (req, res) => {
  const batch = db.batches.find(b => b.id === req.params.id);
  if (!batch || !batch.certificate) return res.status(404).json({ error: 'Certificate not found' });
  const batchBags = db.bags.filter(b => batch.bags.includes(b.id));
  const hospitals = [...new Set(batchBags.map(b => b.hospitalName))];
  res.json({
    certificateId: batch.certificate.id,
    batchNumber: batch.batchNumber,
    generatedAt: batch.certificate.generatedAt,
    treatmentType: batch.treatmentType,
    operator: batch.operator,
    bagCount: batch.bagCount,
    totalWeight: batch.totalWeight,
    categories: batch.categories,
    hospitals,
    treatedAt: batch.treatedAt
  });
});

export default router;
