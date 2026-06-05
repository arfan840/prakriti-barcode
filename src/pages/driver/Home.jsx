import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';
import { isWebBluetoothSupported, connectBluetoothScale, simulateWeightFetch, disconnectActiveDevice } from '../../lib/bluetoothScale';

export default function DriverHome() {
  const { supabase, user } = useAuth();
  const [route, setRoute] = useState(null);
  const [stats, setStats] = useState({ collected: 0 });
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  
  // Feature states
  const [gps, setGps] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedBag, setScannedBag] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [weight, setWeight] = useState('');
  const [btLoading, setBtLoading] = useState(false);
  const [btMode, setBtMode] = useState(() => localStorage.getItem('btMode') || 'simulated');
  const [btStatus, setBtStatus] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  const scannerInstanceRef = useRef(null);
  
  const load = async () => {
    try {
      const { data: r } = await supabase.from('routes').select('*').eq('driver_id', user?.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
      setRoute(r || null);

      if (r) {
        const { data: bags } = await supabase.from('bags').select('id, status').eq('route_id', r.id);
        const collected = bags?.filter(b => b.status === 'collected' || b.status === 'received' || b.status === 'treated').length || 0;
        setStats({ collected });
      } else {
        const { data: v } = await supabase.from('vehicles').select('id, number').eq('status', 'active');
        if (v) setVehicles(v);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    return () => {
      disconnectActiveDevice();
    };
  }, [user, supabase]);

  const showSuccess = (msg) => { setGlobalSuccess(msg); setGlobalError(''); setTimeout(() => setGlobalSuccess(''), 4000); };
  const showError = (msg) => { setGlobalError(msg); setGlobalSuccess(''); setTimeout(() => setGlobalError(''), 5000); };

  const startRoute = async () => {
    if (!selectedVehicle) return showError('Select a vehicle first');
    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      const { data, error } = await supabase.from('routes').insert({
        driver_id: user.id, driver_name: user.name,
        vehicle_id: selectedVehicle, vehicle_number: vehicle?.number,
        status: 'active', date: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      await load();
      showSuccess(`Route started with ${vehicle?.number}`);
    } catch (err) { showError(err.message); }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return showError('GPS not supported');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const gpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGps(gpsData);
        try {
          await supabase.from('audit_logs').insert({
            user_id: user?.id, user_name: user?.name,
            action: 'DRIVER_CHECKIN', entity: 'CHECKIN',
            details: `Driver GPS Check-in: ${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`,
          });
          showSuccess('📍 Location captured and logged');
        } catch (noop) {}
      },
      (err) => showError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const startScanner = async () => {
    setScanning(true); setScannedBag(null); setWeight('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
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
      showError('Camera not working. Try manual entry.');
      setScanning(false);
    }
  };

  const cancelScanner = async () => {
    try { await scannerInstanceRef.current?.stop(); } catch (_) {}
    setScanning(false);
  };

  const lookupBag = async (code) => {
    const { data, error: err } = await supabase.from('bags').select('*, hospitals(name, beds)').eq('barcode', code).single();
    if (err || !data) return showError(`Not found: ${code}`);
    if (data.hospitals?.beds > 30) {
      return showError(`⚠️ HCF "${data.hospitals?.name}" has ${data.hospitals?.beds} beds (>30). Scanning & dispatch must be performed by the HCF staff.`);
    }
    if (data.status !== 'created') return showError(`Bag already ${data.status}`);
    setScannedBag(data);
    triggerBluetoothWeigh(); // Auto trigger imaginary bluetooth scale
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

  const confirmCollection = async () => {
    if (!scannedBag || !weight) return showError('Weight required');
    try {
      await supabase.from('bags').update({
        status: 'collected',
        weight: parseFloat(weight),
        collected_at: new Date().toISOString(),
        collected_by: user?.id,
        route_id: route?.id,
        gps_lat: gps?.lat, gps_lng: gps?.lng
      }).eq('id', scannedBag.id);
      
      supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'BAG_COLLECTED', entity: 'BAG', entity_id: scannedBag.id,
        details: `Bag ${scannedBag.barcode} collected & weighed (${weight}kg)`
      }).then();

      setStats(s => ({ collected: s.collected + 1 }));
      showSuccess(`✅ Scanned & Weighed: ${weight}kg`);
      setScannedBag(null); setWeight(''); setManualCode('');
    } catch (err) { showError(err.message); }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="slide-up" style={{ paddingBottom: 60, maxWidth: 600, margin: '0 auto' }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>👋 {user?.name || 'Driver'}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
        </div>
        {route && (
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: 8, color: 'var(--accent-green)', fontWeight: 700 }}>
            <span style={{ fontSize: '1.2rem' }}>{stats.collected}</span> <span style={{ fontSize: '0.8rem' }}>Bags</span>
          </div>
        )}
      </div>

      {globalSuccess && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 12, marginBottom: 16, color: 'var(--accent-green)', fontWeight: 600, textAlign: 'center' }}>{globalSuccess}</div>}
      {globalError && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 12, marginBottom: 16, color: '#ef4444', textAlign: 'center' }}>{globalError}</div>}

      {!route ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚛</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 16 }}>Start Your Route</div>
          <select className="form-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} style={{ marginBottom: 16 }}>
            <option value="">Choose Vehicle...</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.number}</option>)}
          </select>
          <button className="btn btn-primary btn-lg" onClick={startRoute} style={{ width: '100%' }}>🚀 Start Route</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span style={{ fontSize: '1.5rem' }}>🚛</span>
              <div>
                <div style={{ fontWeight: 700 }}>{route.vehicle_number}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Route</div>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={captureGPS} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 16px', height: 'auto' }}>
              <span style={{ fontSize: '1.3rem' }}>{gps ? '📍' : '📡'}</span>
              <span style={{ fontSize: '0.75rem' }}>{gps ? 'Location Set' : 'Check-In'}</span>
            </button>
          </div>

          {!scannedBag ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              {!scanning ? (
                <>
                  <div style={{ background: 'rgba(99,102,241,0.1)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span style={{ fontSize: '2.5rem' }}>📱</span>
                  </div>
                  <h3 style={{ marginBottom: 24 }}>Scan Biomedical Waste Bag</h3>
                  <button className="btn btn-primary btn-lg" onClick={startScanner} style={{ padding: '20px', width: '100%', fontSize: '1.1rem', borderRadius: 16 }}>
                    📸 Tap to Scan QR Array
                  </button>
                  <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Or Manual Entry</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" placeholder="Enter Bag ID..." value={manualCode} onChange={e => setManualCode(e.target.value)} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} />
                      <button className="btn btn-secondary" onClick={() => lookupBag(manualCode)}>→ Go</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div id="qr-reader" ref={scannerInstanceRef} style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }} />
                  <button className="btn btn-secondary" onClick={cancelScanner} style={{ width: '100%' }}>✕ Cancel Scan</button>
                </>
              )}
            </div>
          ) : (
            <div className="card" style={{ border: `2px solid var(--accent-${scannedBag.category.toLowerCase() === 'yellow' ? 'yellow' : scannedBag.category.toLowerCase() === 'red' ? 'red' : 'primary'})` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hospital</div>
                  <div style={{ fontWeight: 700 }}>{scannedBag.hospitals?.name || scannedBag.hospital_name || 'Unknown Facility'}</div>
                </div>
                <span className={`badge badge-${scannedBag.category}`}>{scannedBag.category} Bag</span>
              </div>
              
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', background: 'var(--bg-secondary)', padding: "8px", borderRadius: 8 }}>
                ID: {scannedBag.barcode}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">⚖️ Weight (kg)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" type="number" step="0.001" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.000" style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700, flex: 1 }} />
                  <button className="btn btn-secondary" onClick={triggerBluetoothWeigh} disabled={btLoading} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', minWidth: 80 }}>
                    <span style={{ fontSize: '1.1rem' }}>{btLoading ? '⏳' : '📶'}</span>
                    <span style={{ fontSize: '0.65rem' }}>{btMode === 'real' ? 'BLE Scale' : 'Auto fetch'}</span>
                  </button>
                </div>
                {isWebBluetoothSupported() ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'real' ? 600 : 400 }}>
                        <input 
                          type="radio" 
                          name="bt-mode-driver" 
                          value="real" 
                          checked={btMode === 'real'} 
                          onChange={() => { setBtMode('real'); localStorage.setItem('btMode', 'real'); setBtStatus(''); }} 
                        />
                        🔌 Real (BLE)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'simulated' ? 600 : 400 }}>
                        <input 
                          type="radio" 
                          name="bt-mode-driver" 
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight is fetched from simulated Bluetooth scale or input manually.</span>
                    {btStatus && <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>{btStatus}</span>}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => { setScannedBag(null); setWeight(''); }}>✕ Cancel</button>
                <button className="btn btn-primary" onClick={confirmCollection} disabled={!weight}>✅ Save & Collect</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
