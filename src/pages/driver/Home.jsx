import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function DriverHome() {
  const { apiFetch, user } = useAuth();
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    apiFetch(`/routes?driverId=${user.id}`).then(r => r.json()).then(setRoutes);
  }, [apiFetch, user.id]);

  const activeRoutes = routes.filter(r => r.status === 'active');
  const closedRoutes = routes.filter(r => r.status === 'closed');

  return (
    <div className="slide-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>👋 Hello, {user.name}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Today's Collection Routes</p>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-card-value">{activeRoutes.length}</div>
          <div className="stat-card-label">Active Routes</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-card-value">{closedRoutes.length}</div>
          <div className="stat-card-label">Completed</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
        <Link to="/driver/checkin" className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>📍 GPS Check-in</Link>
        <Link to="/driver/scan" className="btn btn-primary btn-lg" style={{ justifyContent: 'center', background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>📱 Scan Barcode</Link>
        <Link to="/driver/weigh" className="btn btn-primary btn-lg" style={{ justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>⚖️ Weigh Bag</Link>
      </div>

      {activeRoutes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>🟢 Active Routes</h3>
          {activeRoutes.map(r => (
            <div key={r.id} className="route-card">
              <div className="route-card-header">
                <div>
                  <div style={{ fontWeight: 600 }}>{r.vehicleNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</div>
                </div>
                <span className="badge badge-active">Active</span>
              </div>
              <div className="route-card-sites">
                {r.siteNames?.map((s, i) => <span key={i} className="route-card-site">{s}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {closedRoutes.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12, fontSize: '1rem', color: 'var(--text-muted)' }}>✅ Completed Routes</h3>
          {closedRoutes.slice(0, 5).map(r => (
            <div key={r.id} className="route-card" style={{ opacity: 0.7 }}>
              <div className="route-card-header">
                <div>
                  <div style={{ fontWeight: 600 }}>{r.vehicleNumber}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</div>
                </div>
                <span className="badge badge-closed">Closed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
