import { Router } from 'express';
import db from '../data/seed.js';

const router = Router();

router.get('/waste-summary', (req, res) => {
  let bags = [...db.bags];
  if (req.query.from) bags = bags.filter(b => new Date(b.createdAt) >= new Date(req.query.from));
  if (req.query.to) bags = bags.filter(b => new Date(b.createdAt) <= new Date(req.query.to));
  if (req.query.district) {
    const districtHospitals = db.hospitals.filter(h => h.district === req.query.district).map(h => h.id);
    bags = bags.filter(b => districtHospitals.includes(b.hospitalId));
  }
  if (req.query.hospitalType) {
    const typeHospitals = db.hospitals.filter(h => h.type === req.query.hospitalType).map(h => h.id);
    bags = bags.filter(b => typeHospitals.includes(b.hospitalId));
  }
  if (req.query.hospitalId) bags = bags.filter(b => b.hospitalId === req.query.hospitalId);
  if (req.query.category) bags = bags.filter(b => b.category === req.query.category);

  const byCategory = {};
  const byMonth = {};
  const byDistrict = {};
  const byHospital = {};
  let totalWeight = 0;

  bags.forEach(b => {
    const cat = b.category;
    byCategory[cat] = byCategory[cat] || { count: 0, weight: 0 };
    byCategory[cat].count++;
    byCategory[cat].weight += b.weight;

    const month = b.createdAt.slice(0, 7);
    byMonth[month] = byMonth[month] || { count: 0, weight: 0 };
    byMonth[month].count++;
    byMonth[month].weight += b.weight;

    const hospital = db.hospitals.find(h => h.id === b.hospitalId);
    if (hospital) {
      byDistrict[hospital.district] = byDistrict[hospital.district] || { count: 0, weight: 0 };
      byDistrict[hospital.district].count++;
      byDistrict[hospital.district].weight += b.weight;

      byHospital[hospital.name] = byHospital[hospital.name] || { count: 0, weight: 0 };
      byHospital[hospital.name].count++;
      byHospital[hospital.name].weight += b.weight;
    }
    totalWeight += b.weight;
  });

  // Format weights
  Object.values(byCategory).forEach(v => v.weight = parseFloat(v.weight.toFixed(2)));
  Object.values(byMonth).forEach(v => v.weight = parseFloat(v.weight.toFixed(2)));
  Object.values(byDistrict).forEach(v => v.weight = parseFloat(v.weight.toFixed(2)));
  Object.values(byHospital).forEach(v => v.weight = parseFloat(v.weight.toFixed(2)));

  res.json({
    totalBags: bags.length,
    totalWeight: parseFloat(totalWeight.toFixed(2)),
    byCategory,
    byMonth,
    byDistrict,
    byHospital
  });
});

router.get('/collection-trends', (req, res) => {
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayBags = db.bags.filter(b => b.createdAt.slice(0, 10) === dateStr);
    last30.push({
      date: dateStr,
      bags: dayBags.length,
      weight: parseFloat(dayBags.reduce((s, b) => s + b.weight, 0).toFixed(2))
    });
  }
  res.json(last30);
});

router.get('/treatment-stats', (req, res) => {
  const byType = {};
  db.batches.filter(b => b.status === 'treated').forEach(b => {
    byType[b.treatmentType] = byType[b.treatmentType] || { count: 0, bags: 0, weight: 0 };
    byType[b.treatmentType].count++;
    byType[b.treatmentType].bags += b.bagCount;
    byType[b.treatmentType].weight += b.totalWeight;
  });
  Object.values(byType).forEach(v => v.weight = parseFloat(v.weight.toFixed(2)));
  res.json({
    totalBatches: db.batches.length,
    treatedBatches: db.batches.filter(b => b.status === 'treated').length,
    pendingBatches: db.batches.filter(b => b.status === 'pending').length,
    byType
  });
});

export default router;
