import { Router } from 'express';
import db from '../data/seed.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  let result = db.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, createdAt: u.createdAt }));
  if (req.query.role) result = result.filter(u => u.role === req.query.role);
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    result = result.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }
  res.json(result);
});

router.post('/', (req, res) => {
  const user = {
    id: uuidv4(),
    name: req.body.name,
    email: req.body.email,
    password: req.body.password || 'password123',
    role: req.body.role,
    phone: req.body.phone,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
});

router.put('/:id', (req, res) => {
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const { password, ...updates } = req.body;
  db.users[idx] = { ...db.users[idx], ...updates };
  if (password) db.users[idx].password = password;
  const u = db.users[idx];
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });
});

export default router;
