import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverWeigh() {
  const { supabase, user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [weight, setWeight] = useState('');
  const [bag, setBag] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeRouteId, setActiveRouteId] = useState(null);

  useEffect(() => {
    async function getRoute() {
      if (!user) return;
      const { data } = await supabase.from('routes').select('id').eq('driver_id', user.id).eq('status', 'active').limit(1).single();
      if (data) setActiveRouteId(data.id);
    }
    getRoute();
  }, [supabase, user]);

  const lookupBag = async (e) => {
    e.preventDefault();
    setError('');
    setBag(null);
    setSaved(false);
    const { data: bg, error: fetchErr } = await supabase.from('bags').select('*, hospitals(name)').eq('barcode', barcode).single();
    if (fetchErr || !bg) { setError('Bag not found'); return; }
    setBag({ ...bg, hospitalName: bg.hospitals?.name || bg.hospital_name });
    setWeight(bg.weight?.toString() || '');
  };

  const saveWeight = async () => {
    if (!bag || !weight) return;
    await supabase.from('bags').update({ 
        weight: parseFloat(weight),
        route_id: activeRouteId 
    }).eq('id', bag.id);
    setSaved(true);
    
    supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'WEIGHT_UPDATED', entity: 'BAG', entity_id: bag.id, details: `Weight set to ${weight} kg` }).then();
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>⚖️ Weigh Bag</h2>
      </div>

      <div className="card" style={{ maxWidth: 500, marginBottom: 24 }}>
        <form onSubmit={lookupBag}>
          <div className="form-group">
            <label className="form-label">Barcode</label>
            <input className="form-input" value={barcode} onChange={e => setBarcode(e.target.value.toUpperCase())} placeholder="BMW2025XXXX" style={{ fontFamily: 'monospace', textAlign: 'center' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>🔍 Find Bag</button>
        </form>
      </div>

      {error && <div className="login-error">{error}</div>}

      {bag && (
        <div className="card slide-up" style={{ maxWidth: 500 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bag.barcode}</span>
            <span className={`badge badge-${bag.category}`}>{bag.category}</span>
          </div>
          <div style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>{bag.hospitalName}</div>

          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              style={{ fontSize: '2rem', textAlign: 'center', fontWeight: 700, padding: '20px' }}
              placeholder="0.00"
            />
          </div>

          {!saved ? (
            <button className="btn btn-success btn-lg" style={{ width: '100%' }} onClick={saveWeight} disabled={!weight}>
              ✅ Save Weight
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-success)' }}>Weight saved: {weight} kg</div>
              <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => { setBag(null); setBarcode(''); setSaved(false); }}>
                Weigh Another
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
