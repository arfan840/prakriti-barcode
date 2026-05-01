import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const TREATMENT_TYPES = ['Autoclaving', 'Incineration', 'Chemical Disinfection', 'Microwaving'];

export default function Treatment() {
  const { supabase, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [treatModal, setTreatModal] = useState(null);
  const [treatmentType, setTreatmentType] = useState('Autoclaving');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('batches').select('*').order('created_at', { ascending: false });
      if (data) {
        setBatches(data.map(b => ({
          ...b,
          batchNumber: b.batch_number,
          bagCount: b.bag_count,
          totalWeight: b.total_weight,
          treatmentType: b.treatment_type,
          treatedAt: b.treated_at,
          createdAt: b.created_at,
          categories: ['Yellow', 'Red'] // Placeholder or calculate if needed
        })));
      }
    }
    load();
  }, [refresh, supabase]);

  const handleTreat = async () => {
    await supabase.from('batches').update({
      status: 'treated',
      treatment_type: treatmentType,
      treated_at: new Date().toISOString(),
      operator: user?.name
    }).eq('id', treatModal);
    
    // Also update all bags in this batch to 'treated'
    await supabase.from('bags').update({ status: 'treated' }).eq('batch_id', treatModal);

    setTreatModal(null);
    setRefresh(r => r + 1);
    
    supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BATCH_TREATED', entity: 'BATCH', entity_id: treatModal, details: `Batch treated via ${treatmentType}` }).then();
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
