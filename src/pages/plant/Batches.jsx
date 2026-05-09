import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PlantBatches() {
  const { supabase, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [availBags, setAvailBags] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBags, setSelectedBags] = useState(new Set());
  const [treatmentType, setTreatmentType] = useState('Autoclave');
  const [creating, setCreating] = useState(false);
  const [bagFilter, setBagFilter] = useState('');

  const load = async () => {
    const [{ data: b }, { data: bags }] = await Promise.all([
      supabase.from('batches').select('*').order('created_at', { ascending: false }),
      supabase.from('bags').select('*').eq('status', 'received').order('received_at', { ascending: false }),
    ]);
    if (b) setBatches(b);
    if (bags) setAvailBags(bags);
  };

  useEffect(() => { load(); }, [supabase]);

  const toggleBag = (id) => setSelectedBags(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleCreate = async () => {
    if (!selectedBags.size) return;
    setCreating(true);
    try {
      const bags = availBags.filter(b => selectedBags.has(b.id));
      const totalWeight = bags.reduce((s, b) => s + (b.weight || 0), 0);
      const batchNum = `BATCH-${Date.now()}`;

      const { data: batch, error } = await supabase.from('batches').insert({
        batch_number: batchNum,
        bag_count: bags.length,
        total_weight: Number(totalWeight.toFixed(3)),
        treatment_type: treatmentType,
        operator: user?.name,
        status: 'pending',
      }).select().single();
      if (error) throw error;

      await supabase.from('bags').update({ status: 'in_batch', batch_id: batch.id }).in('id', bags.map(b => b.id));

      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BATCH_CREATED', entity: 'BATCH', entity_id: batch.id, details: `Batch ${batchNum} created with ${bags.length} bags, ${totalWeight.toFixed(3)} kg, treatment: ${treatmentType}` }).then();

      setShowCreate(false);
      setSelectedBags(new Set());
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredBags = availBags.filter(b => !bagFilter || b.category === bagFilter || b.hospital_name?.toLowerCase().includes(bagFilter.toLowerCase()));

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📦 Treatment Batches</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Close' : '➕ Create Batch'}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Create New Batch from Received Bags</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Filter Bags</label>
              <input className="form-input" placeholder="Category or hospital..." value={bagFilter} onChange={e => setBagFilter(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Treatment Method</label>
              <select className="form-select" value={treatmentType} onChange={e => setTreatmentType(e.target.value)}>
                {['Autoclave', 'Incineration', 'Microwave', 'Chemical', 'Hydroclave'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {selectedBags.size > 0 && (
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : `✅ Create Batch (${selectedBags.size} bags)`}
              </button>
            )}
          </div>

          {availBags.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No received bags available for batching</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
                <input type="checkbox" onChange={e => setSelectedBags(e.target.checked ? new Set(filteredBags.map(b => b.id)) : new Set())} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select all ({filteredBags.length})</span>
              </div>
              {filteredBags.map(b => (
                <div key={b.id} className="sync-item" style={selectedBags.has(b.id) ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' } : {}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" checked={selectedBags.has(b.id)} onChange={() => toggleBag(b.id)} />
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{b.barcode}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.hospital_name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge badge-${b.category}`}>{b.category}</span>
                    <span style={{ fontSize: '0.8rem' }}>{b.weight ? `${b.weight} kg` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch #</th><th>Bags</th><th>Weight (kg)</th><th>Treatment</th><th>Operator</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.batch_number}</td>
                  <td>{b.bag_count}</td>
                  <td>{b.total_weight}</td>
                  <td>{b.treatment_type || '—'}</td>
                  <td>{b.operator || '—'}</td>
                  <td><span className={`badge badge-${b.status === 'treated' ? 'received' : 'created'}`}>{b.status}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No batches created yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
