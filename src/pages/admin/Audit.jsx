import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Audit() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState({ logs: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page, limit: 30 });
    if (search) params.set('search', search);
    apiFetch(`/audit?${params}`).then(r => r.json()).then(setData);
  };
  useEffect(load, [page, search, apiFetch]);

  const actionIcon = (action) => {
    if (action.includes('LOGIN')) return '🔑';
    if (action.includes('BAG')) return '🏷️';
    if (action.includes('BATCH')) return '📦';
    if (action.includes('ROUTE')) return '🗺️';
    if (action.includes('DISCREPANCY')) return '⚠️';
    if (action.includes('TREATMENT')) return '♻️';
    return '📝';
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🔒 Audit Logs</h2>
        <span className="badge badge-closed" style={{ fontSize: '0.75rem' }}>🔒 Immutable — No deletion allowed</span>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 2 }}>
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Search actions, users, details..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th></th><th>Action</th><th>User</th><th>Entity</th><th>Details</th><th>Timestamp</th></tr></thead>
            <tbody>
              {data.logs.map(l => (
                <tr key={l.id}>
                  <td style={{ width: 32 }}>{actionIcon(l.action)}</td>
                  <td><span className="badge badge-active" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{l.action}</span></td>
                  <td style={{ fontWeight: 500 }}>{l.userName}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{l.entity}</td>
                  <td style={{ maxWidth: 200, fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{data.total} entries | Page {page}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page * 30 >= data.total}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
