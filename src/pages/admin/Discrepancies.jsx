import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Discrepancies() {
  const { supabase, user } = useAuth();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [resolveId, setResolveId] = useState(null);
  const [resolution, setResolution] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function load() {
      let q = supabase.from('discrepancies').select('*').order('created_at', { ascending: false });
      if (statusFilter) q = q.eq('status', statusFilter);
      const { data } = await q;
      if (data) {
        setDiscrepancies(data.map(d => ({ ...d, createdAt: d.created_at })));
      }
    }
    load();
  }, [statusFilter, refresh, supabase]);

  const handleResolve = async () => {
    await supabase.from('discrepancies')
      .update({ 
        status: 'resolved', 
        resolution, 
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id 
      })
      .eq('id', resolveId);
      
    setResolveId(null);
    setResolution('');
    setRefresh(r => r + 1);
  };

  const openCount = discrepancies.filter(d => d.status === 'open').length;
  const resolvedCount = discrepancies.filter(d => d.status === 'resolved').length;

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>⚠️ Discrepancy Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-open">{openCount} open</span>
          <span className="badge badge-resolved">{resolvedCount} resolved</span>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 300 }}>
        <button className={`tab ${statusFilter === '' ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
        <button className={`tab ${statusFilter === 'open' ? 'active' : ''}`} onClick={() => setStatusFilter('open')}>Open</button>
        <button className={`tab ${statusFilter === 'resolved' ? 'active' : ''}`} onClick={() => setStatusFilter('resolved')}>Resolved</button>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Barcode</th><th>Type</th><th>Description</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {discrepancies.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.barcode}</td>
                  <td><span className={`badge ${d.type === 'MISSING_AT_PLANT' ? 'badge-open' : d.type === 'WEIGHT_MISMATCH' ? 'badge-pending' : 'badge-in-transit'}`}>{d.type.replace(/_/g, ' ')}</span></td>
                  <td style={{ maxWidth: 300, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.description}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td>
                    {d.status === 'open' ? (
                      <button className="btn btn-success btn-sm" onClick={() => { setResolveId(d.id); setResolution(''); }}>Resolve</button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.resolution}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {discrepancies.length === 0 && <div className="empty-state"><div className="empty-state-icon">✅</div><p className="empty-state-text">No discrepancies found</p></div>}
      </div>

      {resolveId && (
        <div className="modal-overlay" onClick={() => setResolveId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Resolve Discrepancy</h2>
              <button className="modal-close" onClick={() => setResolveId(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Resolution Notes</label>
              <textarea className="form-input" rows={4} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe how the discrepancy was resolved..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResolveId(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleResolve} disabled={!resolution.trim()}>Mark Resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
