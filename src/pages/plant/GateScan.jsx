import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function GateScan() {
  const { supabase, user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [received, setReceived] = useState([]);

  const handleScan = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const { data: bag, error: fetchErr } = await supabase.from('bags').select('*, hospitals(name)').eq('barcode', barcode).single();
      if (fetchErr || !bag) { setError('Bag not found'); return; }
      setResult({ ...bag, hospitalName: bag.hospitals?.name || bag.hospital_name, collectedAt: bag.collected_at });
    } catch { setError('Scan failed'); }
  };

  const handleReceive = async () => {
    if (!result) return;
    const receivedTime = new Date().toISOString();
    await supabase.from('bags').update({ status: 'received', received_at: receivedTime, received_by: user?.id }).eq('id', result.id);
    
    setReceived(prev => [{ ...result, receivedAt: receivedTime }, ...prev]);
    setResult(null);
    setBarcode('');
    
    supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BAG_RECEIVED', entity: 'BAG', entity_id: result.id, details: `Bag received at plant gate` }).then();
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📷 Gate Scanning</h2>
        <span className="badge badge-treated">{received.length} received today</span>
      </div>

      <div className="card" style={{ maxWidth: 500, marginBottom: 24 }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 12 }}>
          <input
            className="form-input"
            placeholder="Enter or scan barcode..."
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            autoFocus
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Scan</button>
        </form>

        {error && <div className="login-error" style={{ marginTop: 16 }}>{error}</div>}

        {result && (
          <div style={{ marginTop: 20, padding: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>{result.barcode}</span>
                <span className={`badge badge-${result.status}`}>{result.status}</span>
              </div>
              <div className="form-row">
                <div><span className="form-label">Hospital</span><div>{result.hospitalName}</div></div>
                <div><span className="form-label">Category</span><div><span className={`badge badge-${result.category}`}>{result.category}</span></div></div>
              </div>
              <div className="form-row">
                <div><span className="form-label">Weight</span><div>{result.weight} kg</div></div>
                <div><span className="form-label">Collected</span><div>{result.collectedAt ? new Date(result.collectedAt).toLocaleString() : 'N/A'}</div></div>
              </div>
            </div>
            <button className="btn btn-success" style={{ width: '100%', marginTop: 16 }} onClick={handleReceive}>
              ✅ Confirm Receipt at Gate
            </button>
          </div>
        )}
      </div>

      {received.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Recently Received</div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Barcode</th><th>Hospital</th><th>Category</th><th>Weight</th><th>Received</th></tr></thead>
              <tbody>
                {received.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.barcode}</td>
                    <td>{b.hospitalName}</td>
                    <td><span className={`badge badge-${b.category}`}>{b.category}</span></td>
                    <td>{b.weight} kg</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.receivedAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
