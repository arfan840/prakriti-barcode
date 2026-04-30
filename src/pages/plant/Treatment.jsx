import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const TREATMENT_TYPES = ['Autoclaving', 'Incineration', 'Chemical Disinfection', 'Microwaving'];

export default function Treatment() {
  const { apiFetch } = useAuth();
  const [batches, setBatches] = useState([]);
  const [treatModal, setTreatModal] = useState(null);
  const [treatmentType, setTreatmentType] = useState('Autoclaving');

  const load = () => {
    apiFetch('/batches').then(r => r.json()).then(setBatches);
  };
  useEffect(load, [apiFetch]);

  const handleTreat = async () => {
    await apiFetch(`/batches/${treatModal}/treat`, { method: 'POST', body: JSON.stringify({ treatmentType }) });
    setTreatModal(null);
    load();
  };

  const pending = batches.filter(b => b.status === 'pending');
  const treated = batches.filter(b => b.status === 'treated');

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>♻️ Treatment Logging</h2>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 16, color: 'var(--accent-warning)' }}>⏳ Pending Treatment ({pending.length})</div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Batch</th><th>Bags</th><th>Weight</th><th>Categories</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                    <td>{b.bagCount}</td>
                    <td>{b.totalWeight} kg</td>
                    <td>{b.categories?.join(', ')}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-success btn-sm" onClick={() => setTreatModal(b.id)}>Log Treatment</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16, color: 'var(--accent-success)' }}>✅ Treated ({treated.length})</div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Bags</th><th>Weight</th><th>Treatment</th><th>Operator</th><th>Treated At</th></tr></thead>
            <tbody>
              {treated.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td>{b.bagCount}</td>
                  <td>{b.totalWeight} kg</td>
                  <td><span className="badge badge-treated">{b.treatmentType}</span></td>
                  <td>{b.operator}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.treatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {treatModal && (
        <div className="modal-overlay" onClick={() => setTreatModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Treatment</h2>
              <button className="modal-close" onClick={() => setTreatModal(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Treatment Type</label>
              <select className="form-select" value={treatmentType} onChange={e => setTreatmentType(e.target.value)}>
                {TREATMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTreatModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleTreat}>✅ Confirm Treatment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
