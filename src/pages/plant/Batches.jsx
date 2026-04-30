import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Batches() {
  const { apiFetch } = useAuth();
  const [batches, setBatches] = useState([]);
  const [availableBags, setAvailableBags] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBags, setSelectedBags] = useState([]);

  const load = () => {
    apiFetch('/batches').then(r => r.json()).then(setBatches);
    apiFetch('/bags?status=received&limit=100').then(r => r.json()).then(d => setAvailableBags(d.bags || []));
  };
  useEffect(load, [apiFetch]);

  const handleCreate = async () => {
    if (selectedBags.length === 0) return;
    await apiFetch('/batches', { method: 'POST', body: JSON.stringify({ bags: selectedBags }) });
    setShowCreate(false);
    setSelectedBags([]);
    load();
  };

  const toggleBag = (id) => {
    setSelectedBags(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📦 Batch Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Batch</button>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Bags</th><th>Weight</th><th>Categories</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td>{b.bagCount}</td>
                  <td>{b.totalWeight} kg</td>
                  <td>{b.categories?.map(c => <span key={c} className={`badge badge-${c}`} style={{ marginRight: 4 }}>{c}</span>)}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {batches.length === 0 && <div className="empty-state"><div className="empty-state-icon">📦</div><p className="empty-state-text">No batches created yet</p></div>}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Create New Batch</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Select received bags to add to this batch ({selectedBags.length} selected)</p>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {availableBags.length === 0 ? (
                <div className="empty-state"><p className="empty-state-text">No received bags available</p></div>
              ) : (
                availableBags.map(bag => (
                  <label key={bag.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: selectedBags.includes(bag.id) ? 'var(--bg-hover)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4 }}>
                    <input type="checkbox" checked={selectedBags.includes(bag.id)} onChange={() => toggleBag(bag.id)} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 120 }}>{bag.barcode}</span>
                    <span className={`badge badge-${bag.category}`}>{bag.category}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>{bag.weight} kg</span>
                  </label>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={selectedBags.length === 0}>Create Batch ({selectedBags.length} bags)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
