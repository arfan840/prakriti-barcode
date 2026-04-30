import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Hospitals() {
  const { apiFetch } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filters, setFilters] = useState({ district: '', type: '', search: '' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Bedded', beds: '', district: '', address: '', contact: '' });
  const [editId, setEditId] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (filters.district) params.set('district', filters.district);
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    apiFetch(`/hospitals?${params}`).then(r => r.json()).then(setHospitals);
    apiFetch('/hospitals/districts').then(r => r.json()).then(setDistricts);
  };
  useEffect(load, [filters, apiFetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (editId) {
      await apiFetch(`/hospitals/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await apiFetch('/hospitals', { method: 'POST', body: JSON.stringify(form) });
    }
    setShowModal(false);
    setEditId(null);
    setForm({ name: '', type: 'Bedded', beds: '', district: '', address: '', contact: '' });
    load();
  };

  const handleEdit = (h) => {
    setForm({ name: h.name, type: h.type, beds: h.beds, district: h.district, address: h.address, contact: h.contact });
    setEditId(h.id);
    setShowModal(true);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🏥 Hospital Registry</h2>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '', type: 'Bedded', beds: '', district: '', address: '', contact: '' }); setShowModal(true); }}>+ Add Hospital</button>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Search hospitals..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">District</label>
          <select className="form-select" value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option>
            <option value="Bedded">Bedded</option>
            <option value="Non-Bedded">Non-Bedded</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Beds</th><th>District</th><th>Contact</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {hospitals.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                  <td><span className={`badge badge-${h.type === 'Bedded' ? 'active' : 'closed'}`}>{h.type}</span></td>
                  <td>{h.beds}</td>
                  <td>{h.district}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.contact}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => handleEdit(h)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hospitals.length === 0 && <div className="empty-state"><div className="empty-state-icon">🏥</div><p className="empty-state-text">No hospitals found</p></div>}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Edit Hospital' : 'Add Hospital'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>Bedded</option><option>Non-Bedded</option></select></div>
                <div className="form-group"><label className="form-label">Beds</label><input type="number" className="form-input" value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">District</label><input className="form-input" required value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Contact</label><input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
