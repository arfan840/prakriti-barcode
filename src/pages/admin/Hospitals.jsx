import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Hospitals() {
  const { supabase, user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const emptyForm = {
    name: '', hcf_code: '', type: 'General', hospital_type: 'bedded', bedded: true,
    beds: '', district: '', state: 'JH', address: '', pincode: '', contact: '',
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from('hospitals').select('*').order('name');
    if (data) setHospitals(data);
  };

  useEffect(() => { load(); }, [supabase]);

  const openCreate = () => {
    const nextCode = `HCF${String(hospitals.length + 1).padStart(4, '0')}`;
    setForm({ ...emptyForm, hcf_code: nextCode });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (h) => {
    setForm({
      name: h.name || '', hcf_code: h.hcf_code || '', type: h.type || 'General',
      hospital_type: h.hospital_type || 'bedded', bedded: h.bedded !== false,
      beds: h.beds || '', district: h.district || '', state: h.state || 'JH',
      address: h.address || '', pincode: h.pincode || '', contact: h.contact || '',
    });
    setEditing(h);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        bedded: form.hospital_type === 'bedded',
        beds: form.beds ? Number(form.beds) : null,
      };
      if (editing) {
        await supabase.from('hospitals').update(payload).eq('id', editing.id);
        supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'HCF_UPDATED', entity: 'HOSPITAL', entity_id: editing.id, details: `Updated HCF: ${form.name}` }).then();
      } else {
        await supabase.from('hospitals').insert(payload);
        supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'HCF_CREATED', entity: 'HOSPITAL', details: `Created HCF: ${form.name}` }).then();
      }
      await load();
      setShowModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = hospitals.filter(h =>
    !search || h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.district?.toLowerCase().includes(search.toLowerCase()) ||
    h.hcf_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🏥 Healthcare Facilities (HCFs)</h2>
        <button className="btn btn-primary" onClick={openCreate}>➕ Add HCF</button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Name, district, HCF code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="stat-mini"><span className="stat-mini-label">Total</span><span className="stat-mini-val">{hospitals.length}</span></div>
          <div className="stat-mini"><span className="stat-mini-label">Bedded</span><span className="stat-mini-val">{hospitals.filter(h => h.bedded).length}</span></div>
          <div className="stat-mini"><span className="stat-mini-label">Non-Bedded</span><span className="stat-mini-val">{hospitals.filter(h => !h.bedded).length}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr>
              <th>HCF Code</th><th>Name</th><th>Type</th><th>Bedded</th><th>District</th><th>Beds</th><th>Contact</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(h => (
                <tr key={h.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-purple)' }}>{h.hcf_code || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                  <td><span className="badge badge-active" style={{ fontSize: '0.7rem' }}>{h.type}</span></td>
                  <td><span className={`badge ${h.bedded ? 'badge-collected' : 'badge-created'}`} style={{ fontSize: '0.7rem' }}>{h.bedded ? 'Bedded' : 'Non-Bedded'}</span></td>
                  <td>{h.district}</td>
                  <td>{h.beds || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{h.contact}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(h)}>Edit</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No HCFs found. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit HCF' : 'Add Healthcare Facility'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Facility Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g., District General Hospital" />
                </div>
                <div className="form-group">
                  <label className="form-label">HCF Code *</label>
                  <input className="form-input" value={form.hcf_code} onChange={e => setForm(f => ({ ...f, hcf_code: e.target.value.toUpperCase() }))} required placeholder="e.g., HCF0001" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Facility Type *</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {['General', 'Private', 'Clinic', 'PHC', 'CHC', 'Lab', 'Nursing Home', 'Dental', 'Eye Hospital', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bedded Type *</label>
                  <select className="form-select" value={form.hospital_type} onChange={e => setForm(f => ({ ...f, hospital_type: e.target.value }))}>
                    <option value="bedded">Bedded</option>
                    <option value="non_bedded">Non-Bedded</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Number of Beds</label>
                  <input className="form-input" type="number" value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">District *</label>
                  <input className="form-input" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} required placeholder="e.g., Dhanbad" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="JH" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="826001" maxLength={6} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required placeholder="Full address" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number *</label>
                <input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} required placeholder="Phone number" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update HCF' : 'Add HCF'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
