import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';

export default function DriverScan() {
  const { supabase, user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannedBag, setScannedBag] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    supabase.from('routes').select('*').eq('driver_id', user?.id).eq('status', 'active').single()
      .then(({ data }) => { if (data) setActiveRoute(data); });
  }, [supabase, user]);

  const startScanner = async () => {
    setError('');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          const bagId = parseQRPayload(decodedText);
          if (bagId) {
            await scanner.stop();
            setScanning(false);
            await lookupBag(bagId);
          }
        },
        () => {}
      );
    } catch (err) {
      setError('Camera not available. Use manual entry below.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try { await scannerInstanceRef.current?.stop(); } catch (_) {}
    setScanning(false);
  };

  const lookupBag = async (bagId) => {
    setError(''); setScannedBag(null);
    const { data, error: err } = await supabase.from('bags').select('*, hospitals(name, district)').eq('barcode', bagId).single();
    if (err || !data) { setError(`Bag not found: ${bagId}`); return; }
    if (data.status === 'collected') { setError(`Bag ${bagId} already collected.`); return; }
    if (data.status !== 'created') { setError(`Bag ${bagId} is in status "${data.status}" — cannot collect.`); return; }
    setScannedBag(data);
    setStatus('');
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (manualCode.trim()) await lookupBag(manualCode.trim());
  };

  const confirmCollection = async () => {
    if (!scannedBag) return;
    setConfirming(true);
    try {
      let gpsLat = null, gpsLng = null;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        gpsLat = pos.coords.latitude;
        gpsLng = pos.coords.longitude;
      } catch (_) {}

      await supabase.from('bags').update({
        status: 'collected',
        collected_at: new Date().toISOString(),
        collected_by: user?.id,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        route_id: activeRoute?.id || null,
      }).eq('id', scannedBag.id);

      supabase.from('scan_events').insert({
        bag_id: scannedBag.id, barcode: scannedBag.barcode,
        scanned_by: user?.id, scanner_name: user?.name,
        scan_type: 'collection', gps_lat: gpsLat, gps_lng: gpsLng,
        route_id: activeRoute?.id || null,
      }).then();

      supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'BAG_COLLECTED', entity: 'BAG', entity_id: scannedBag.id,
        details: `Bag ${scannedBag.barcode} collected from ${scannedBag.hospital_name}`,
      }).then();

      setStatus(`✅ Bag ${scannedBag.barcode} collected!`);
      setScannedBag(null);
      setManualCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const CATEGORY_COLORS = { Yellow: '#fbbf24', Red: '#ef4444', Blue: '#3b82f6', White: '#94a3b8' };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📱 Scan Bag</h2>
        {activeRoute && <span className="badge badge-active">Route Active</span>}
      </div>

      {status && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--accent-green)', fontWeight: 600 }}>{status}</div>}
      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>{error}</div>}

      {!scanning && !scannedBag && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 }}>
            <div style={{ fontSize: '3rem' }}>📷</div>
            <button className="btn btn-primary btn-lg" onClick={startScanner} style={{ width: '100%', maxWidth: 320 }}>
              Open Camera & Scan QR
            </button>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Manual Entry</div>
            <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="JH-DGH-HCF0001-Y-20250509-000001" value={manualCode}
                onChange={e => setManualCode(e.target.value)} style={{ flex: 1, fontFamily: 'monospace' }} />
              <button type="submit" className="btn btn-primary">Lookup</button>
            </form>
          </div>
        </div>
      )}

      {scanning && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', maxWidth: 400, borderRadius: 12, overflow: 'hidden' }} />
          <button className="btn btn-secondary" onClick={stopScanner}>✕ Cancel Scan</button>
        </div>
      )}

      {scannedBag && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: CATEGORY_COLORS[scannedBag.category] }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Bag Found</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div className="form-label">Hospital</div>
              <div style={{ fontWeight: 600 }}>{scannedBag.hospital_name}</div>
            </div>
            <div>
              <div className="form-label">Category</div>
              <span className={`badge badge-${scannedBag.category}`}>{scannedBag.category}</span>
            </div>
            <div>
              <div className="form-label">Bag ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', fontWeight: 600 }}>{scannedBag.barcode}</div>
            </div>
            <div>
              <div className="form-label">Status</div>
              <span className={`badge badge-${scannedBag.status}`}>{scannedBag.status}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setScannedBag(null)} style={{ flex: 1 }}>← Scan Another</button>
            <button className="btn btn-primary" onClick={confirmCollection} disabled={confirming} style={{ flex: 2 }}>
              {confirming ? 'Confirming...' : '✅ Confirm Collection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
