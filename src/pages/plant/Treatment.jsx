import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function generateCertificateHTML(batch, treatedBy) {
  const certNum = `CERT-${batch.id?.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Disposal Certificate — ${certNum}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #111; }
        .border { border: 3px double #1a5276; padding: 30px; border-radius: 4px; }
        .header { text-align: center; border-bottom: 2px solid #1a5276; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 32px; margin-bottom: 8px; }
        h1 { font-size: 20px; color: #1a5276; margin: 4px 0; }
        h2 { font-size: 14px; color: #333; margin: 4px 0; font-weight: normal; }
        .cert-title { font-size: 18px; font-weight: 700; color: #1a5276; margin: 20px 0 16px; text-align: center; text-transform: uppercase; letter-spacing: 2px; }
        .body-text { font-size: 13px; line-height: 1.8; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        th { background: #1a5276; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) td { background: #f7f9fb; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-box { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 6px; font-size: 12px; color: #555; }
        .cert-num { font-size: 11px; color: #888; text-align: right; margin-top: 20px; }
        @media print { body { padding: 10mm; } .border { border: 3px double #1a5276; } }
      </style>
    </head>
    <body>
      <div class="border">
        <div class="header">
          <div class="logo">☣️</div>
          <h1>Prakriti Track Pvt. Ltd.</h1>
          <h2>Common Bio-Medical Waste Treatment Facility (CBWTF)</h2>
          <h2>Jharkhand, India</h2>
        </div>
        <div class="cert-title">Certificate of Biomedical Waste Disposal</div>
        <div class="body-text">
          This is to certify that the following consignment of biomedical waste has been received and treated in accordance with the
          <strong>Bio-Medical Waste Management Rules, 2016</strong> and subsequent amendments issued by the Ministry of Environment,
          Forest and Climate Change, Government of India.
        </div>
        <table>
          <tr><th>Detail</th><th>Value</th></tr>
          <tr><td>Certificate Number</td><td><strong>${certNum}</strong></td></tr>
          <tr><td>Batch Number</td><td>${batch.batch_number}</td></tr>
          <tr><td>Treatment Method</td><td>${batch.treatment_type || 'Autoclave'}</td></tr>
          <tr><td>Number of Bags Treated</td><td>${batch.bag_count}</td></tr>
          <tr><td>Total Weight Treated</td><td>${batch.total_weight} kg</td></tr>
          <tr><td>Date of Treatment</td><td>${date}</td></tr>
          <tr><td>Treated By (Operator)</td><td>${treatedBy || batch.operator || '—'}</td></tr>
        </table>
        <div class="body-text" style="font-size:12px; color:#555; margin-top:16px;">
          The above biomedical waste has been rendered non-infectious and disposed of in an environmentally sound manner.
          This certificate is issued as per JSPCB authorization and applicable regulations.
        </div>
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-line">Treatment Plant Operator</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Plant Head / Authorized Signatory</div>
          </div>
        </div>
        <div class="cert-num">Cert No: ${certNum} · Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
    </body>
    </html>
  `;
}

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
    const html = generateCertificateHTML(selected, user?.name);
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
