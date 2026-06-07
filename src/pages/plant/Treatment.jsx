import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generateCertificateHTML } from '../../lib/certificate';

export default function PlantTreatment() {
  const { supabase, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bags, setBags] = useState([]);
  const [treating, setTreating] = useState(false);
  const [method, setMethod] = useState('Autoclave');

  const load = async () => {
    const { data } = await supabase.from('batches').select('*').in('status', ['pending', 'treated']).order('created_at', { ascending: false });
    if (data) setBatches(data);
  };

  useEffect(() => { load(); }, [supabase]);

  const viewBatch = async (batch) => {
    setSelected(batch);
    setMethod(batch.treatment_type || 'Autoclave');
    const { data } = await supabase.from('bags').select('barcode, hospital_name, category, weight').eq('batch_id', batch.id);
    if (data) setBags(data);
  };

  const completeTreatment = async () => {
    if (!selected) return;
    setTreating(true);
    try {
      const now = new Date().toISOString();
      await supabase.from('batches').update({ status: 'treated', treatment_type: method, treated_at: now, operator: user?.name }).eq('id', selected.id);
      await supabase.from('bags').update({ status: 'treated' }).eq('batch_id', selected.id);

      supabase.from('scan_events').insert(bags.map(b => ({
        barcode: b.barcode, scanned_by: user?.id, scanner_name: user?.name,
        scan_type: 'treatment',
      }))).then();

      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BATCH_TREATED', entity: 'BATCH', entity_id: selected.id, details: `Batch ${selected.batch_number} treated via ${method}` }).then();

      await load();
      setSelected(prev => ({ ...prev, status: 'treated', treatment_type: method, operator: user?.name }));
    } catch (err) {
      alert(err.message);
    } finally {
      setTreating(false);
    }
  };

  const printCert = () => {
    // Calculate category wise breakdown from bags
    const categoryBreakdown = {
      Yellow: { count: 0, weight: 0 },
      Red: { count: 0, weight: 0 },
      White: { count: 0, weight: 0 },
      Blue: { count: 0, weight: 0 }
    };
    
    bags.forEach(bag => {
      const cat = bag.category;
      if (categoryBreakdown[cat]) {
        categoryBreakdown[cat].count += 1;
        categoryBreakdown[cat].weight += (Number(bag.weight) || 0);
      }
    });

    const html = generateCertificateHTML(selected, user?.name, categoryBreakdown);
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>♻️ Treatment & Certificates</h2>
        {selected && <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setBags([]); }}>← Back</button>}
      </div>

      {!selected ? (
        <div className="card">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Batch #</th><th>Bags</th><th>Weight</th><th>Method</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.batch_number}</td>
                    <td>{b.bag_count}</td>
                    <td>{b.total_weight} kg</td>
                    <td>{b.treatment_type || '—'}</td>
                    <td><span className={`badge ${b.status === 'treated' ? 'badge-received' : 'badge-created'}`}>{b.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.created_at).toLocaleDateString('en-IN')}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => viewBatch(b)}>View</button></td>
                  </tr>
                ))}
                {batches.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No batches — create them in the Batches section</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Batch Number', val: selected.batch_number },
                { label: 'Total Bags', val: selected.bag_count },
                { label: 'Total Weight', val: `${selected.total_weight} kg` },
                { label: 'Status', val: <span className={`badge ${selected.status === 'treated' ? 'badge-received' : 'badge-created'}`}>{selected.status}</span> },
              ].map(s => (
                <div key={s.label}><div className="form-label">{s.label}</div><div style={{ fontWeight: 600, marginTop: 4 }}>{s.val}</div></div>
              ))}
            </div>

            {selected.status !== 'treated' && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="form-label">Treatment Method</label>
                  <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
                    {['Autoclave', 'Incineration', 'Microwave', 'Chemical', 'Hydroclave'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-lg" onClick={completeTreatment} disabled={treating}>
                  {treating ? 'Processing...' : '✅ Mark as Treated'}
                </button>
              </div>
            )}

            {selected.status === 'treated' && (
              <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>✅ Treatment Complete — {selected.treatment_type}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Operator: {selected.operator} · {selected.treated_at ? new Date(selected.treated_at).toLocaleString('en-IN') : ''}</div>
                </div>
                <button className="btn btn-primary" onClick={printCert}>📜 Print Certificate</button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Bags in this Batch ({bags.length})</div>
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bags.map(b => (
                <div key={b.barcode} className="sync-item">
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{b.barcode}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.hospital_name}</span>
                    <span className={`badge badge-${b.category}`}>{b.category}</span>
                    <span style={{ fontSize: '0.8rem' }}>{b.weight ? `${b.weight} kg` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
