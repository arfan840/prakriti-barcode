import db from '../data/seed.js';

export function auditMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (req.method !== 'GET' && res.statusCode < 400 && req.user) {
      const action = `${req.method} ${req.originalUrl}`;
      db.addAudit(req.user.id, action, req.originalUrl.split('/')[2] || 'system', body?.id || 'N/A', JSON.stringify(req.body || {}).slice(0, 200));
    }
    return originalJson(body);
  };
  next();
}
