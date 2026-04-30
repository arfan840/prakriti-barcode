import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PlantDashboard() {
  const { apiFetch } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [stats, setStats] = useState(null);
  const [reconSummary, setReconSummary] = useState(null);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/routes?status=active').then(r => r.json()),
      apiFetch('/bags/stats').then(r => r.json()),
      apiFetch('/reconciliation/summary').then(r => r.json()),
      apiFetch('/batches').then(r => r.json()),
    ]).then(([r, s, rc, b]) => { setRoutes(r); setStats(s); setReconSummary(rc); setBatches(b); });
  }, [apiFetch]);

  if (!stats) return <div className="loading-spinner" />;

  const pendingBags = stats.byStatus?.received || 0;
  const statusData = Object.entries(stats.byStatus || {}).map(([name, count]) => ({ name: name.replace('_', ' '), count }));

  return (
    <div className="slide-up">
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.1)' }}>🚛</div>
          <div className="stat-card-value">{routes.length}</div>
          <div className="stat-card-label">Active Routes</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>📦</div>
          <div className="stat-card-value">{pendingBags}</div>
          <div className="stat-card-label">Bags Pending Processing</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#ef4444' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>⚠️</div>
          <div className="stat-card-value">{reconSummary?.open || 0}</div>
          <div className="stat-card-label">Open Discrepancies</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>♻️</div>
          <div className="stat-card-value">{batches.filter(b => b.status === 'pending').length}</div>
          <div className="stat-card-label">Batches Pending Treatment</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-title">📊 Bag Status Overview</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">🚛 Incoming Vehicles</div>
          {routes.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚛</div><p className="empty-state-text">No active routes incoming</p></div>
          ) : (
            routes.map(r => (
              <div key={r.id} className="route-card">
                <div className="route-card-header">
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.driverName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.vehicleNumber}</div>
                  </div>
                  <span className="badge badge-active">Active</span>
                </div>
                <div className="route-card-sites">
                  {r.siteNames?.slice(0, 4).map((s, i) => <span key={i} className="route-card-site">{s}</span>)}
                  {(r.siteNames?.length || 0) > 4 && <span className="route-card-site">+{r.siteNames.length - 4} more</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
