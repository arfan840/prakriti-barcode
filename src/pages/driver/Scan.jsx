import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverScan() {
  const { supabase, user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [scannedBags, setScannedBags] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState(null);

  useEffect(() => {
    async function getRoute() {
      if (!user) return;
      const { data } = await supabase.from('routes').select('id').eq('driver_id', user.id).eq('status', 'active').limit(1).single();
      if (data) setActiveRouteId(data.id);
    }
    getRoute();
  }, [supabase, user]);

  const handleScan = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    try {
      const { data: bag, error: fetchErr } = await supabase.from('bags').select('*, hospitals(name)').eq('barcode', barcode).single();
      if (fetchErr || !bag) { setError(`Bag "${barcode}" not found`); return; }
      setResult({ ...bag, hospitalName: bag.hospitals?.name || bag.hospital_name, createdAt: bag.created_at });
    } catch { setError('Scan failed. Check connection.'); }
  };

  const handleCollect = async () => {
    if (!result) return;
    try {
      const payload = {
          status: 'collected',
          collected_at: new Date().toISOString(),
          collected_by: user?.id,
          route_id: activeRouteId,
          gps_lat: 23.3441 + (Math.random() - 0.5) * 0.1,
          gps_lng: 85.3096 + (Math.random() - 0.5) * 0.1,
      };
      const { data, error } = await supabase.from('bags').update(payload).eq('id', result.id).select().single();
      if (error) throw error;
      
      const updated = { ...data, hospitalName: result.hospitalName };
      setScannedBags(prev => [updated, ...prev]);
      setResult(null);
      setBarcode('');
      
      // Audit log (async)
      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BAG_COLLECTED', entity: 'BAG', entity_id: result.id, details: `Bag collected at site.` }).then();
    } catch { setError('Collection failed'); }
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📱 Scan Barcode</h2>
        <span className="badge badge-active">{scannedBags.length} scanned</span>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ textAlign: 'center', padding: '32px 0 24px', fontSize: '3rem' }}>📱</div>
        <form onSubmit={handleScan}>
          <div className="form-group">
            <label className="form-label">Barcode / QR Code</label>
            <input
              className="form-input"
              value={barcode}
              onChange={e => setBarcode(e.target.value.toUpperCase())}
              placeholder="Enter barcode (e.g., BMW20250001)"
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.1rem', fontFamily: 'monospace', letterSpacing: '0.1em' }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>🔍 Lookup Bag</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
          Tip: Enter any barcode from the demo data (BMW2025XXXX format)
        </p>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

      {result && (
        <div className="card slide-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.2rem' }}>{result.barcode}</span>
            <span className={`badge badge-${result.status}`}>{result.status}</span>
          </div>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div><span className="form-label">Hospital</span><div>{result.hospitalName}</div></div>
            <div><span className="form-label">Category</span><div><span className={`badge badge-${result.category}`}>{result.category}</span></div></div>
          </div>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div><span className="form-label">Weight</span><div>{result.weight} kg</div></div>
            <div><span className="form-label">Created</span><div style={{ fontSize: '0.85rem' }}>{new Date(result.createdAt).toLocaleString()}</div></div>
          </div>
          <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={handleCollect}>
            ✅ Confirm Collection
          </button>
        </div>
      )}

      {scannedBags.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Collected This Session</div>
          {scannedBags.map(b => (
            <div key={b.id} className="sync-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="sync-item-status synced" />
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.barcode}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge badge-${b.category}`}>{b.category}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.weight} kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
