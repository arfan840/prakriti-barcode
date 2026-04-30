import { Router } from 'express';
import db from '../data/seed.js';

const router = Router();

router.get('/', (req, res) => {
  let logs = [...db.auditLogs];
  if (req.query.action) logs = logs.filter(l => l.action.includes(req.query.action));
  if (req.query.entity) logs = logs.filter(l => l.entity === req.query.entity);
  if (req.query.userId) logs = logs.filter(l => l.userId === req.query.userId);
  if (req.query.from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(req.query.from));
  if (req.query.to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(req.query.to));
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    logs = logs.filter(l => l.action.toLowerCase().includes(s) || l.userName?.toLowerCase().includes(s) || l.details?.toLowerCase().includes(s));
  }
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const start = (page - 1) * limit;
  // No delete endpoint — logs are immutable
  res.json({ total: logs.length, page, logs: logs.slice(start, start + limit) });
});

export default router;
