import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Bags() {
  const { supabase } = useAuth();
  const [data, setData] = useState({ bags: [], total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [page, setPage] = useState(1);
  const [selectedBag, setSelectedBag] = useState(null);

  useEffect(() => {
    async function load() {
      let q = supabase.from('bags').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.search) q = q.or(`barcode.ilike.%${filters.search}%,hospital_name.ilike.%${filters.search}%`);
      
      const from = (page - 1) * 25;
      q = q.range(from, from + 24);

      const { data: bags, count } = await q;
      
      if (bags) {
        setData({ 
          bags: bags.map(b => ({
            ...b,
            hospitalName: b.hospital_name,
            createdAt: b.created_at,
            gpsLat: b.gps_lat,
            gpsLng: b.gps_lng,
            scanHistory: []
          })), 
          total: count || 0 
        });
      }
    }
    load();
  }, [filters, page, supabase]);

  const handleSelectBag = async (bag) => {
    setSelectedBag(bag);
    const { data: logs } = await supabase.from('audit_logs').select('*').eq('entity_id', bag.id).order('created_at', { ascending: true });
    if (logs) {
      setSelectedBag(prev => prev?.id === bag.id ? { ...prev, scanHistory: logs.map(l => ({ action: l.action, timestamp: l.created_at })) } : prev);
    }
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🏷️ Bag Tracker</h2>
        <span className="badge badge-active">{data.total} total bags</span>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Search by barcode or hospital..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
            <option value="">All</option>
            <option value="created">Created</option>
            <option value="collected">Collected</option>
            <option value="received">Received</option>
            <option value="in_batch">In Batch</option>
            <option value="treated">Treated</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={filters.category} onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}>
            <option value="">All</option>
            <option value="Yellow">Yellow</option>
            <option value="Red">Red</option>
            <option value="Blue">Blue</option>
            <option value="White">White</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Barcode</th><th>Hospital</th><th>Category</th><th>Weight</th><th>Status</th><th>Created</th><th>Details</th></tr></thead>
            <tbody>
              {data.bags.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.barcode}</td>
                  <td>{b.hospitalName}</td>
                  <td><span className={`badge badge-${b.category}`}>{b.category}</span></td>
                  <td>{b.weight} kg</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => handleSelectBag(b)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(data.total / 25)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page * 25 >= data.total}>Next →</button>
          </div>
        </div>
      </div>

      {selectedBag && (
        <div className="modal-overlay" onClick={() => setSelectedBag(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bag Details — {selectedBag.barcode}</h2>
              <button className="modal-close" onClick={() => setSelectedBag(null)}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="form-row">
                <div><span className="form-label">Hospital</span><div>{selectedBag.hospitalName}</div></div>
                <div><span className="form-label">Category</span><div><span className={`badge badge-${selectedBag.category}`}>{selectedBag.category}</span></div></div>
              </div>
              <div className="form-row">
                <div><span className="form-label">Weight</span><div>{selectedBag.weight} kg</div></div>
                <div><span className="form-label">Status</span><div><span className={`badge badge-${selectedBag.status}`}>{selectedBag.status.replace('_', ' ')}</span></div></div>
              </div>
              <div><span className="form-label">GPS</span><div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedBag.gpsLat?.toFixed(6)}, {selectedBag.gpsLng?.toFixed(6)}</div></div>
              <div>
                <span className="form-label">Scan History</span>
                <div className="timeline" style={{ marginTop: 8 }}>
                  {selectedBag.scanHistory?.map((s, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-item-action">{s.action.replace('_', ' ').toUpperCase()}</div>
                      <div className="timeline-item-time">{new Date(s.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
