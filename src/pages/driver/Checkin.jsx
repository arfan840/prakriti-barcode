import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverCheckin() {
  const { supabase, user } = useAuth();
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [hospitals, setHospitals] = useState([]);

  React.useEffect(() => {
    supabase.from('hospitals').select('id, name, district').order('name').then(({ data }) => {
      if (data) setHospitals(data);
    });
  }, [supabase]);

  const captureGPS = () => {
    setLoading(true); setError(''); setSaved(false);
    if (!navigator.geolocation) { setError('GPS not supported on this device.'); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
        setLoading(false);
      },
      (err) => { setError(`GPS error: ${err.message}`); setLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!gps) { setError('Please capture GPS first.'); return; }
    setLoading(true);
    try {
      await supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'DRIVER_CHECKIN', entity: 'CHECKIN',
        details: `Driver checked in at ${hospital || 'location'} — GPS: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}${notes ? '. Notes: ' + notes : ''}`,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📍 GPS Check-In</h2>
      </div>

      {saved && (
        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontWeight: 600, color: 'var(--accent-green)' }}>
          ✅ Check-in recorded successfully!
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button className="btn btn-primary btn-lg" onClick={captureGPS} disabled={loading} style={{ minWidth: 220 }}>
            {loading ? '📡 Getting GPS...' : '📡 Capture GPS Location'}
          </button>
        </div>

        {gps && (
          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-green)', marginBottom: 8 }}>📍 Location Captured</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontFamily: 'monospace', fontSize: '0.9rem' }}>
              <div><div className="form-label">Latitude</div><strong>{gps.lat.toFixed(6)}</strong></div>
              <div><div className="form-label">Longitude</div><strong>{gps.lng.toFixed(6)}</strong></div>
              <div><div className="form-label">Accuracy</div><strong>±{gps.accuracy}m</strong></div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Timestamp: {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        )}

        <form onSubmit={handleCheckin}>
          <div className="form-group">
            <label className="form-label">Healthcare Facility (Optional)</label>
            <select className="form-select" value={hospital} onChange={e => setHospital(e.target.value)}>
              <option value="">Select HCF...</option>
              {hospitals.map(h => <option key={h.id} value={h.name}>{h.name} — {h.district}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!gps || loading}>
            ✅ Save Check-In
          </button>
        </form>
      </div>
    </div>
  );
}
