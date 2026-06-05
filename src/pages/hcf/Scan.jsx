import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';
import { isWebBluetoothSupported, connectBluetoothScale, simulateWeightFetch, disconnectActiveDevice } from '../../lib/bluetoothScale';

export default function HcfScan() {
  const { supabase, user } = useAuth();
  const navigate = useNavigate();

  const [activeRoutes, setActiveRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedBag, setScannedBag] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [weight, setWeight] = useState('');
  const [btLoading, setBtLoading] = useState(false);
  const [btMode, setBtMode] = useState(() => localStorage.getItem('btMode') || 'simulated');
  const [btStatus, setBtStatus] = useState('');

  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    // Load active driver routes
    supabase
      .from('routes')
      .select('*')
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) setActiveRoutes(data);
      });

    // Cleanup BT connection on unmount
    return () => {
      disconnectActiveDevice();
    };
  }, [supabase]);

  const showSuccess = (msg) => { setStatus(msg); setError(''); setTimeout(() => setStatus(''), 4000); };
  const showError = (msg) => { setError(msg); setStatus(''); setTimeout(() => setError(''), 5000); };

  const startScanner = async () => {
    if (!selectedRouteId) {
      showError('Please select a driver route before scanning.');
      return;
    }
    setError('');
    setScanning(true);
    setScannedBag(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('hcf-qr-reader');
      scannerInstanceRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          const bagId = parseQRPayload(decodedText) || decodedText;
          await scanner.stop();
          setScanning(false);
          await lookupBag(bagId);
        },
        () => {}
      );
    } catch (err) {
      showError('Camera not available. Try manual lookup.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try { await scannerInstanceRef.current?.stop(); } catch (_) {}
    setScanning(false);
  };

  const lookupBag = async (code) => {
    if (!selectedRouteId) {
      showError('Please select a driver route before looking up.');
      return;
    }
    setError(''); setScannedBag(null);
    try {
      const { data, error: err } = await supabase
        .from('bags')
        .select('*')
        .eq('barcode', code.trim().toUpperCase())
        .single();

      if (err || !data) {
        showError(`Bag not found in database: ${code}`);
        return;
      }

      // Check if this bag belongs to the user's hospital
      if (data.hospital_id !== user.hospital_id) {
        showError(`Blocked: Bag ${code} belongs to another Healthcare Facility.`);
        return;
      }

      if (data.status === 'collected') {
        showError(`Bag ${code} has already been collected/dispatched.`);
        return;
      }

      if (data.status !== 'created') {
        showError(`Bag ${code} has status "${data.status}" (cannot dispatch).`);
        return;
      }

      setScannedBag(data);
      // Auto weigh scale trigger
      triggerBluetoothWeigh();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (manualCode.trim()) lookupBag(manualCode);
  };

  const triggerBluetoothWeigh = () => {
    if (isWebBluetoothSupported() && btMode === 'real') {
      setBtLoading(true);
      setBtStatus('Initializing Bluetooth...');
      connectBluetoothScale(
        (val) => {
          setWeight(val);
          setBtLoading(false);
          setBtStatus('✅ Weight received successfully!');
        },
        (err) => {
          setBtLoading(false);
          setBtStatus(`❌ Bluetooth Error: ${err.message || err}`);
        },
        (statusText) => {
          setBtStatus(`📶 ${statusText}`);
        }
      );
    } else {
      setBtLoading(true);
      setBtStatus('Reading simulated scale...');
      simulateWeightFetch(
        (val) => {
          setWeight(val);
          setBtLoading(false);
          setBtStatus('✅ Simulated weight fetched.');
        },
        () => setBtLoading(true),
        () => setBtLoading(false)
      );
    }
  };

  const confirmDispatch = async () => {
    if (!scannedBag || !weight) {
      showError('Weight is required to dispatch the bag.');
      return;
    }
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) {
      showError('Please enter a valid positive weight.');
      return;
    }

    setConfirming(true);
    try {
      let gpsLat = null, gpsLng = null;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
      } catch (_) {}

      const selectedRoute = activeRoutes.find(r => r.id === selectedRouteId);

      // Update bag status
      const { error: bagUpdateErr } = await supabase
        .from('bags')
        .update({
          status: 'collected',
          weight: w,
          collected_at: new Date().toISOString(),
          collected_by: user.id,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          route_id: selectedRouteId
        })
        .eq('id', scannedBag.id);

      if (bagUpdateErr) throw bagUpdateErr;

      // Insert scan event
      await supabase.from('scan_events').insert({
        bag_id: scannedBag.id,
        barcode: scannedBag.barcode,
        scanned_by: user.id,
        scanner_name: `${user.name} (HCF)`,
        scan_type: 'collection',
        weight: w,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        route_id: selectedRouteId
      });

      // Insert audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: user.name,
        action: 'BAG_DISPATCHED_BY_HCF',
        entity: 'BAG',
        entity_id: scannedBag.id,
        details: `Bag ${scannedBag.barcode} weighed (${w} kg) and dispatched by HCF staff to vehicle ${selectedRoute?.vehicle_number || ''}`
      });

      showSuccess(`✅ Bag ${scannedBag.barcode} successfully dispatched to route!`);
      setScannedBag(null);
      setWeight('');
      setManualCode('');
    } catch (err) {
      showError(err.message || 'Dispatch failed.');
    } finally {
      setConfirming(false);
    }
  };

  const CATEGORY_COLORS = { Yellow: '#fbbf24', Red: '#ef4444', Blue: '#3b82f6', White: '#94a3b8' };

  return (
    <div className="slide-up" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>📷 HCF Self-Dispatch Scanner</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Scan waste bags to weigh and assign them to an active driver route.
          </div>
        </div>
      </div>

      {status && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 16, marginBottom: 16, color: 'var(--accent-green)', fontWeight: 600, textAlign: 'center' }}>{status}</div>}
      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 16, marginBottom: 16, color: '#ef4444', textAlign: 'center' }}>{error}</div>}

      {/* Select Active Route */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ fontWeight: 700 }}>Select Active Transport Route *</label>
        <select 
          className="form-select" 
          value={selectedRouteId} 
          onChange={e => { setSelectedRouteId(e.target.value); setScannedBag(null); }}
          style={{ marginTop: 8 }}
        >
          <option value="">Choose active driver route...</option>
          {activeRoutes.map(r => (
            <option key={r.id} value={r.id}>
              🚛 {r.vehicle_number} — {r.driver_name || 'No driver'} ({new Date(r.date).toLocaleDateString()})
            </option>
          ))}
        </select>
        {activeRoutes.length === 0 && (
          <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 6, fontWeight: 500 }}>
            ⚠️ There are no active vehicle routes in the system. A driver must start their route first!
          </div>
        )}
      </div>

      {selectedRouteId && !scanning && !scannedBag && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Camera Scanner Button */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 24px' }}>
            <div style={{ fontSize: '3rem' }}>📷</div>
            <button className="btn btn-primary btn-lg" onClick={startScanner} style={{ width: '100%', maxWidth: 320 }}>
              Open Camera & Scan QR
            </button>
          </div>

          {/* Manual Entry */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Manual Bag Entry</div>
            <form onSubmit={handleManualLookup} style={{ display: 'flex', gap: 8 }}>
              <input 
                className="form-input" 
                placeholder="e.g. JH-DGH-HCF0001-Y-20250509-000001" 
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())} 
                style={{ flex: 1, fontFamily: 'monospace' }} 
              />
              <button type="submit" className="btn btn-primary" disabled={!manualCode.trim()}>Lookup</button>
            </form>
          </div>
        </div>
      )}

      {scanning && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div id="hcf-qr-reader" style={{ width: '100%', maxWidth: 400, borderRadius: 12, overflow: 'hidden' }} />
          <button className="btn btn-secondary" onClick={stopScanner} style={{ width: '100%' }}>✕ Cancel Scan</button>
        </div>
      )}

      {scannedBag && (
        <div className="card" style={{ border: `2px solid var(--accent-${scannedBag.category.toLowerCase() === 'yellow' ? 'yellow' : scannedBag.category.toLowerCase() === 'red' ? 'red' : 'primary'})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Healthcare Facility</div>
              <div style={{ fontWeight: 700 }}>{scannedBag.hospital_name}</div>
            </div>
            <span className={`badge badge-${scannedBag.category}`}>{scannedBag.category} Bag</span>
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', background: 'var(--bg-secondary)', padding: "8px", borderRadius: 8 }}>
            Bag ID: {scannedBag.barcode}
          </div>

          {/* Weighing form */}
          <div style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>⚖️ Weight (kg) *</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input 
                className="form-input" 
                type="number" 
                step="0.001" 
                value={weight} 
                onChange={e => setWeight(e.target.value)} 
                placeholder="0.000" 
                style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700, flex: 1 }} 
              />
              <button 
                className="btn btn-secondary" 
                onClick={triggerBluetoothWeigh} 
                disabled={btLoading} 
                style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', minWidth: 80 }}
                type="button"
              >
                <span style={{ fontSize: '1.1rem' }}>{btLoading ? '⏳' : '📶'}</span>
                <span style={{ fontSize: '0.65rem' }}>{btMode === 'real' ? 'BLE Scale' : 'Scale Weigh'}</span>
              </button>
            </div>
            
            {isWebBluetoothSupported() ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'real' ? 600 : 400 }}>
                    <input 
                      type="radio" 
                      name="bt-mode-hcf" 
                      value="real" 
                      checked={btMode === 'real'} 
                      onChange={() => { setBtMode('real'); localStorage.setItem('btMode', 'real'); setBtStatus(''); }} 
                    />
                    🔌 Real (BLE)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'simulated' ? 600 : 400 }}>
                    <input 
                      type="radio" 
                      name="bt-mode-hcf" 
                      value="simulated" 
                      checked={btMode === 'simulated'} 
                      onChange={() => { setBtMode('simulated'); localStorage.setItem('btMode', 'simulated'); setBtStatus(''); }} 
                    />
                    🧪 Simulation
                  </label>
                </div>
                {btStatus && <span style={{ fontSize: '0.75rem', color: btStatus.includes('❌') ? '#ef4444' : btStatus.includes('✅') ? 'var(--accent-green)' : 'var(--text-muted)' }}>{btStatus}</span>}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto fetch weight via simulated scale or input manually.</span>
                {btStatus && <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>{btStatus}</span>}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setScannedBag(null); setWeight(''); }} style={{ width: '100%' }}>✕ Cancel</button>
            <button className="btn btn-primary" onClick={confirmDispatch} disabled={!weight || confirming} style={{ width: '100%' }}>
              {confirming ? 'Saving Dispatch...' : '✅ Complete Dispatch'}
            </button>
          </div>
        </div>
      )}

      {selectedRouteId && (
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/hcf')} 
          style={{ width: '100%', marginTop: 16 }}
        >
          ← Back to Dashboard
        </button>
      )}
    </div>
  );
}
