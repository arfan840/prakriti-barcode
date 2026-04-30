import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';
import { auditMiddleware } from './middleware/audit.js';
import authRoutes from './routes/auth.js';
import hospitalRoutes from './routes/hospitals.js';
import bagRoutes from './routes/bags.js';
import routeRoutes from './routes/routes.js';
import batchRoutes from './routes/batches.js';
import reconciliationRoutes from './routes/reconciliation.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import userRoutes from './routes/users.js';

const app = express();
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/hospitals', authMiddleware, auditMiddleware, hospitalRoutes);
app.use('/api/bags', authMiddleware, auditMiddleware, bagRoutes);
app.use('/api/routes', authMiddleware, auditMiddleware, routeRoutes);
app.use('/api/batches', authMiddleware, auditMiddleware, batchRoutes);
app.use('/api/reconciliation', authMiddleware, auditMiddleware, reconciliationRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/users', authMiddleware, auditMiddleware, userRoutes);

// Serve static frontend in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 BioTrack API server running on port ${PORT}`);
  console.log('📋 Demo credentials:');
  console.log('   Plant Head:    admin@biotrack.in / admin123');
  console.log('   Plant Manager: manager@biotrack.in / manager123');
  console.log('   Driver:        driver1@biotrack.in / driver123');
  console.log('   Regulatory:    authority@biotrack.in / authority123');
});
