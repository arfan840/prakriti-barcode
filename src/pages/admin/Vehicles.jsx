import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Vehicles() {
  const { supabase, user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { number: '', type: 'Van', driver_id: '', status: 'active' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase.from('vehicles').select('*, profiles(name)').order('number'),
      supabase.from('profiles').select('id, name').eq('role', 'driver'),
    ]);
    if (v) setVehicles(v);
    if (d) setDrivers(d);
  };

  useEffect(() => { load(); }, [supabase]);

  const openCreate = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (v) => {
    setForm({ number: v.number, type: v.type, driver_id: v.driver_id || '', status: v.status });
    setEditing(v);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, driver_id: form.driver_id || null };
      if (editing) {
        await supabase.from('vehicles').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('vehicles').insert(payload);
      }
      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: editing ? 'VEHICLE_UPDATED' : 'VEHICLE_CREATED', entity: 'VEHICLE', details: `Vehicle: ${form.number}` }).then();
      await load();
      setShowModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🚛 Vehicle Management</h2>
        <button className="btn btn-primary" onClick={openCreate}>➕ Add Vehicle</button>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr>
              <th>Vehicle Number</th><th>Type</th><th>Assigned Driver</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{v.number}</td>
                  <td>{v.type}</td>
                  <td>{v.profiles?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td><span className={`badge ${v.status === 'active' ? 'badge-active' : 'badge-created'}`}>{v.status}</span></td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}>Edit</button></td>
                </tr>
              ))}
              {vehicles.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No vehicles yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Vehicle Number *</label>
                <input className="form-input" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value.toUpperCase() }))} required placeholder="e.g., JH05AE1234" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {['Van', 'Truck', 'Tempo', 'Auto', 'Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Driver</label>
                <select className="form-select" value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
