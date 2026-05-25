import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';

export default function DriverWeigh() {
  const { supabase, user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [bag, setBag] = useState(null);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const lookupBag = async (code) => {
    const bagId = parseQRPayload(code) || code;
    setError(''); setBag(null); setSuccess('');
    const { data, error: err } = await supabase.from('bags').select('*, hospitals(name, beds)').eq('barcode', bagId).single();
    if (err || !data) { setError(`Bag not found: ${bagId}`); return; }
    if (data.hospitals?.beds > 30) {
      setError(`⚠️ HCF "${data.hospitals?.name}" has ${data.hospitals?.beds} beds (>30). Scanning & dispatch must be performed by the HCF staff.`);
      return;
    }
    setBag(data);
    setWeight(data.weight ? String(data.weight) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bag || !weight) return;
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) { setError('Enter a valid weight in kg'); return; }
    setSaving(true);
    try {
      await supabase.from('bags').update({ weight: w }).eq('id', bag.id);
      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'BAG_WEIGHED', entity: 'BAG', entity_id: bag.id, details: `Weight set to ${w} kg for bag ${bag.barcode}` }).then();
      setSuccess(`✅ Weight ${w} kg saved for ${bag.barcode}`);
      setBag(null); setBarcode(''); setWeight('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>⚖️ Weigh Bag</h2>
      </div>

      {success && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--accent-green)', fontWeight: 600 }}>{success}</div>}
      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>{error}</div>}

      <div className="card">
        <div className="form-group">
          <label className="form-label">Bag ID / Barcode</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" value={barcode} onChange={e => setBarcode(e.target.value)}
              placeholder="JH-DGH-HCF0001-Y-20250509-000001" style={{ fontFamily: 'monospace', flex: 1 }} />
            <button className="btn btn-primary" type="button" onClick={() => lookupBag(barcode)} disabled={!barcode}>Find</button>
          </div>
        </div>

        {bag && (
          <form onSubmit={handleSubmit}>
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><div className="form-label">Hospital</div><div style={{ fontWeight: 600 }}>{bag.hospital_name}</div></div>
                <div><div className="form-label">Category</div><span className={`badge badge-${bag.category}`}>{bag.category}</span></div>
                <div><div className="form-label">Status</div><span className={`badge badge-${bag.status}`}>{bag.status}</span></div>
                <div><div className="form-label">Current Weight</div><div>{bag.weight ? `${bag.weight} kg` : '—'}</div></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg) *</label>
              <input
                className="form-input"
                type="number"
                step="0.001"
                min="0.001"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 2.450"
                style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }}
                autoFocus
                required
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Enter weight from weighing machine or manual measurement</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setBag(null); setBarcode(''); setWeight(''); }} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
                {saving ? 'Saving...' : '⚖️ Save Weight'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
