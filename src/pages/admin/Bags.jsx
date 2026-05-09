import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generateBagIds } from '../../lib/bagId';
import QRLabel from '../../components/QRLabel';
import PrintLabelButton, { printLabels } from '../../components/PrintLabel';

export default function Bags() {
  const { supabase, user } = useAuth();
  const [data, setData] = useState({ bags: [], total: 0 });
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [page, setPage] = useState(1);
  const [selectedBag, setSelectedBag] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newBags, setNewBags] = useState([]); // just-created bags for preview
  const [form, setForm] = useState({ hospital_id: '', category: 'Yellow', quantity: 1 });
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    supabase.from('hospitals').select('id, name, hcf_code, district, state').order('name').then(({ data }) => {
      if (data) setHospitals(data);
    });
  }, [supabase]);

  useEffect(() => {
    async function load() {
      let q = supabase.from('bags').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category) q = q.eq('category', filters.category);
      if (filters.search) q = q.or(`barcode.ilike.%${filters.search}%,hospital_name.ilike.%${filters.search}%`);
      const from = (page - 1) * 25;
      q = q.range(from, from + 24);
      const { data: bags, count } = await q;
      if (bags) setData({ bags, total: count || 0 });
    }
    load();
  }, [filters, page, supabase]);

  const handleSelectBag = async (bag) => {
    const { data: logs } = await supabase.from('audit_logs').select('*').eq('entity_id', bag.id).order('created_at', { ascending: true });
    setSelectedBag({ ...bag, scanHistory: logs?.map(l => ({ action: l.action, timestamp: l.created_at })) || [] });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const hospital = hospitals.find(h => h.id === form.hospital_id);
      if (!hospital) throw new Error('Please select a hospital');
      const qty = Math.min(Math.max(1, Number(form.quantity)), 50);

      const bagIds = await generateBagIds(supabase, hospital, form.category, qty);
      const rows = bagIds.map(bid => ({
        barcode: bid,
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        hcf_code: hospital.hcf_code,
        district: hospital.district,
        state: hospital.state || 'JH',
        category: form.category,
        status: 'created',
      }));

      const { data: inserted, error } = await supabase.from('bags').insert(rows).select();
      if (error) throw error;

      // Audit log
      supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'BAGS_CREATED', entity: 'BAG', details: `Created ${qty} ${form.category} bags for ${hospital.name}`
      }).then();

      setNewBags(inserted || rows);
      setData(d => ({ ...d, total: d.total + qty })); // optimistic
    } catch (err) {
      alert(err.message || 'Failed to create bags');
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedBagsForPrint = data.bags.filter(b => selectedIds.has(b.id));

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🏷️ Bag Tracker</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && (
            <PrintLabelButton bags={selectedBagsForPrint} label={`🖨️ Print ${selectedIds.size} Labels`} className="btn btn-secondary" />
          )}
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setNewBags([]); }}>
            ➕ Create Bags
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Barcode or hospital..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
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
            {['Yellow','Red','Blue','White'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr>
              <th><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(data.bags.map(b => b.id)) : new Set())} /></th>
              <th>Bag ID / Barcode</th><th>Hospital</th><th>Category</th><th>Weight</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.bags.map(b => (
                <tr key={b.id}>
                  <td><input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} /></td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.78rem' }}>{b.barcode}</td>
                  <td>{b.hospital_name}</td>
                  <td><span className={`badge badge-${b.category}`}>{b.category}</span></td>
                  <td>{b.weight ? `${b.weight} kg` : '—'}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleSelectBag(b)}>View</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => printLabels([b])}>🖨️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {selectedIds.size > 0 ? `${selectedIds.size} selected · ` : ''}{data.total} total bags · Page {page} of {Math.ceil(data.total / 25) || 1}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page * 25 >= data.total}>Next →</button>
          </div>
        </div>
      </div>

      {/* Create Bags Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setNewBags([]); }}>
          <div className="modal-content" style={{ maxWidth: 700, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Create Waste Bags</h2>
              <button className="modal-close" onClick={() => { setShowCreate(false); setNewBags([]); }}>×</button>
            </div>

            {newBags.length === 0 ? (
              <form onSubmit={handleCreate}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Healthcare Facility *</label>
                    <select className="form-select" value={form.hospital_id} onChange={e => setForm(f => ({ ...f, hospital_id: e.target.value }))} required>
                      <option value="">Select HCF...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({h.hcf_code || 'No code'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Waste Category *</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {['Yellow','Red','Blue','White'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity (1–50) *</label>
                  <input className="form-input" type="number" min={1} max={50} value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ℹ️ Each bag gets a unique ID: <code>JH-DST-HCF0001-Y-20250509-000001</code>. QR codes will be generated automatically.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={creating}>
                    {creating ? 'Generating...' : `Generate ${form.quantity} Bag${form.quantity > 1 ? 's' : ''}`}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✅ {newBags.length} bags created!</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <PrintLabelButton bags={newBags} label="🖨️ Print All Labels" className="btn btn-primary" />
                    <button className="btn btn-secondary" onClick={() => setNewBags([])}>Create More</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxHeight: 400, overflowY: 'auto', padding: 4 }}>
                  {newBags.map(b => (
                    <div key={b.barcode} style={{ position: 'relative' }}>
                      <QRLabel bag={b} size={120} compact={true} />
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: 4, fontSize: '0.7rem' }}
                        onClick={() => printLabels([b])}
                      >🖨️ Print</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Bag Modal */}
      {selectedBag && (
        <div className="modal-overlay" onClick={() => setSelectedBag(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bag Details</h2>
              <button className="modal-close" onClick={() => setSelectedBag(null)}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 12 }}>
                <div className="form-row">
                  <div><span className="form-label">Hospital</span><div>{selectedBag.hospital_name}</div></div>
                  <div><span className="form-label">Category</span><div><span className={`badge badge-${selectedBag.category}`}>{selectedBag.category}</span></div></div>
                </div>
                <div className="form-row">
                  <div><span className="form-label">Weight</span><div>{selectedBag.weight ? `${selectedBag.weight} kg` : '—'}</div></div>
                  <div><span className="form-label">Status</span><div><span className={`badge badge-${selectedBag.status}`}>{selectedBag.status.replace('_', ' ')}</span></div></div>
                </div>
                <div><span className="form-label">Bag ID</span><div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{selectedBag.barcode}</div></div>
                <div><span className="form-label">GPS</span><div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedBag.gps_lat ? `${selectedBag.gps_lat?.toFixed(6)}, ${selectedBag.gps_lng?.toFixed(6)}` : '—'}</div></div>
                <div>
                  <span className="form-label">Scan History</span>
                  <div className="timeline" style={{ marginTop: 8 }}>
                    {selectedBag.scanHistory?.length ? selectedBag.scanHistory.map((s, i) => (
                      <div key={i} className="timeline-item">
                        <div className="timeline-item-action">{s.action.replace(/_/g, ' ').toUpperCase()}</div>
                        <div className="timeline-item-time">{new Date(s.timestamp).toLocaleString('en-IN')}</div>
                      </div>
                    )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No scan events yet</p>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <QRLabel bag={selectedBag} size={160} />
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => printLabels([selectedBag])}>🖨️ Print Label</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
