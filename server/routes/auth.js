import { Router } from 'express';
import db from '../data/seed.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken(user);
  db.addAudit(user.id, 'USER_LOGIN', 'user', user.id, `Login from ${req.ip}`);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
});

router.get('/me', authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
});

export default router;
