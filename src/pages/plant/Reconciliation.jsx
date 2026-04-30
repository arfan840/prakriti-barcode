import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Reconciliation() {
  const { apiFetch } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/routes?status=closed').then(r => r.json()).then(setRoutes);
  }, [apiFetch]);

  const runReconciliation = async (routeId) => {
    setLoading(true);
    setSelectedRoute(routeId);
    try {
      const res = await apiFetch(`/reconciliation/run/${routeId}`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch { setResult(null); }
    setLoading(false);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🔄 Reconciliation</h2>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>Select Route to Reconcile</div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Driver</th><th>Vehicle</th><th>Date</th><th>Sites</th><th>Action</th></tr></thead>
            <tbody>
              {routes.slice(0, 10).map(r => (
                <tr key={r.id} style={{ background: selectedRoute === r.id ? 'var(--bg-hover)' : undefined }}>
                  <td style={{ fontWeight: 600 }}>{r.driverName}</td>
                  <td>{r.vehicleNumber}</td>
                  <td style={{ fontSize: '0.85rem' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.siteNames?.length || 0} sites</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => runReconciliation(r.id)} disabled={loading}>Run Check</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className="loading-spinner" />}

      {result && (
        <div className="card slide-up">
          <div className="card-title" style={{ marginBottom: 20 }}>Reconciliation Results</div>
          <div className="recon-summary">
            <div className="recon-stat">
              <div className="recon-stat-value" style={{ color: 'var(--accent-info)' }}>{result.collected}</div>
              <div className="recon-stat-label">Collected</div>
            </div>
            <div className="recon-stat">
              <div className="recon-stat-value" style={{ color: 'var(--accent-primary)' }}>{result.received}</div>
              <div className="recon-stat-label">Received</div>
            </div>
            <div className="recon-stat">
              <div className="recon-stat-value" style={{ color: 'var(--accent-success)' }}>{result.matched}</div>
              <div className="recon-stat-label">Matched</div>
            </div>
            <div className="recon-stat">
              <div className="recon-stat-value" style={{ color: result.missingAtPlant > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{result.missingAtPlant}</div>
              <div className="recon-stat-label">Missing at Plant</div>
            </div>
            <div className="recon-stat">
              <div className="recon-stat-value" style={{ color: result.unexpectedAtPlant > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>{result.unexpectedAtPlant}</div>
              <div className="recon-stat-label">Unexpected</div>
            </div>
          </div>

          {result.newDiscrepancies > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-danger)', marginBottom: 8 }}>⚠️ {result.newDiscrepancies} new discrepancies flagged</div>
              {result.discrepancies?.map(d => (
                <div key={d.id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '4px 0' }}>
                  • {d.barcode} — {d.type.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}

          {result.missingAtPlant === 0 && result.unexpectedAtPlant === 0 && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-success)' }}>All bags reconciled successfully</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
