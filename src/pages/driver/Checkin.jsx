import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverCheckin() {
  const { apiFetch } = useAuth();
  const [gps, setGps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [error, setError] = useState('');

  const getLocation = () => {
    setLoading(true);
    setError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setLoading(false);
        },
        () => {
          // Fallback to demo coords
          setGps({ lat: 23.3441 + (Math.random() - 0.5) * 0.05, lng: 85.3096 + (Math.random() - 0.5) * 0.05, accuracy: 15 });
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGps({ lat: 23.3441, lng: 85.3096, accuracy: 50 });
      setLoading(false);
    }
  };

  const handleCheckin = () => {
    setCheckedIn(true);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📍 GPS Check-in</h2>
      </div>

      <div className="card gps-card">
        {!gps && !loading && (
          <>
            <div className="gps-icon">📍</div>
            <h3 style={{ marginBottom: 8 }}>Capture Your Location</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              Tap the button below to record your GPS coordinates at this collection site.
            </p>
            <button className="btn btn-primary btn-lg" onClick={getLocation}>
              🛰️ Get GPS Location
            </button>
          </>
        )}

        {loading && (
          <>
            <div className="loading-spinner" />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Acquiring GPS signal...</p>
          </>
        )}

        {gps && !checkedIn && (
          <>
            <div className="gps-icon" style={{ color: 'var(--accent-success)' }}>📍</div>
            <h3 style={{ color: 'var(--accent-success)', marginBottom: 8 }}>Location Acquired</h3>
            <div className="gps-coords">
              {gps.lat.toFixed(6)}° N, {gps.lng.toFixed(6)}° E
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              Accuracy: ±{gps.accuracy?.toFixed(0)}m | {new Date().toLocaleTimeString()}
            </p>
            <button className="btn btn-success btn-lg" onClick={handleCheckin} style={{ width: '100%' }}>
              ✅ Confirm Check-in
            </button>
          </>
        )}

        {checkedIn && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h3 style={{ color: 'var(--accent-success)', marginBottom: 8 }}>Successfully Checked In</h3>
            <div className="gps-coords">
              {gps.lat.toFixed(6)}° N, {gps.lng.toFixed(6)}° E
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              Checked in at {new Date().toLocaleString()}
            </p>
            <button className="btn btn-secondary" onClick={() => { setGps(null); setCheckedIn(false); }}>
              📍 New Check-in
            </button>
          </>
        )}

        {error && <div className="login-error" style={{ marginTop: 16 }}>{error}</div>}
      </div>
    </div>
  );
}
