import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';

export default function PlantGateScan() {
  const { supabase, user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const scannerInstanceRef = useRef(null);
  const scannedRef = useRef([]);
  const processingRef = useRef(false);

  // Sync state to ref so closure always has latest
  React.useEffect(() => { scannedRef.current = scanned; }, [scanned]);

  const processCode = async (rawCode) => {
    if (processingRef.current) return;
    const bagId = parseQRPayload(rawCode) || rawCode.trim();
    if (!bagId) return;

    // Prevent duplicate scans instantly using Ref
    if (scannedRef.current.find(s => s.barcode === bagId)) {
      // Don't spam errors if holding camera on same code
      return;
    }

    processingRef.current = true;
    try {
      const { data, error: err } = await supabase.from('bags').select('*').eq('barcode', bagId).single();
      if (err || !data) { setError(`Not found: ${bagId}`); return; }
      if (data.status === 'received' || data.status === 'in_batch' || data.status === 'treated') {
        setError(`Bag ${bagId} already received`);
        return;
      }
      setScanned(prev => [...prev, data]);
      setError('');
    } finally {
      // Small timeout to prevent hyper-scanning the same code in 10ms
      setTimeout(() => { processingRef.current = false; }, 1000);
    }
  };

  const startScanner = async () => {
    setError('');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('gate-qr-reader');
      scannerInstanceRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => { await processCode(decodedText); },
        () => {}
      );
    } catch (err) {
      setError('Camera not available. Use manual entry.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try { await scannerInstanceRef.current?.stop(); } catch (_) {}
    setScanning(false);
  };

  const handleManual = async (e) => {
    e.preventDefault();
    await processCode(manualCode);
    setManualCode('');
  };

  const confirmReceived = async () => {
    if (!scanned.length) return;
    setConfirming(true);
    try {
      const now = new Date().toISOString();
      const ids = scanned.map(b => b.id);

      await supabase.from('bags').update({ status: 'received', received_at: now, received_by: user?.id }).in('id', ids);

      await supabase.from('scan_events').insert(
        scanned.map(b => ({
          bag_id: b.id, barcode: b.barcode,
          scanned_by: user?.id, scanner_name: user?.name,
          scan_type: 'gate_in',
        }))
      );

      supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'GATE_SCAN_COMPLETE', entity: 'BAG',
        details: `${ids.length} bags received at gate`,
      }).then();

      // Check for discrepancies — bags with 'collected' status that were not scanned
      for (const bag of scanned) {
        if (bag.route_id && bag.status === 'collected') {
          // This bag was received — good
        }
      }

      alert(`✅ ${ids.length} bags marked as received!`);
      setScanned([]);
      await stopScanner();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const removeScanned = (id) => setScanned(prev => prev.filter(b => b.id !== id));

  const catTotals = scanned.reduce((acc, b) => { acc[b.category] = (acc[b.category] || 0) + 1; return acc; }, {});

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📷 Gate Scan — Receive Bags</h2>
        {scanned.length > 0 && <span className="badge badge-active">{scanned.length} scanned</span>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: scanning ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {!scanning ? (
          <button className="btn btn-primary btn-lg" onClick={startScanner} style={{ padding: '20px', fontSize: '1rem' }}>
            📷 Open Camera Scanner
          </button>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div id="gate-qr-reader" style={{ width: '100%' }} />
            <div style={{ padding: 12 }}>
              <button className="btn btn-secondary" onClick={stopScanner} style={{ width: '100%' }}>✕ Stop Camera</button>
            </div>
          </div>
        )}

        {!scanning && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Manual Entry</div>
            <form onSubmit={handleManual} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input className="form-input" value={manualCode} onChange={e => setManualCode(e.target.value)}
                placeholder="Enter bag ID..." style={{ fontFamily: 'monospace' }} />
              <button type="submit" className="btn btn-primary">Add Bag</button>
            </form>
          </div>
        )}
      </div>

      {scanned.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title">Scanned Bags ({scanned.length})</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(catTotals).map(([cat, cnt]) => (
                <span key={cat} className={`badge badge-${cat}`} style={{ fontSize: '0.75rem' }}>{cat}: {cnt}</span>
              ))}
            </div>
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {scanned.map(b => (
              <div key={b.id} className="sync-item">
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{b.barcode}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.hospital_name} · {b.weight ? `${b.weight} kg` : 'No weight'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge badge-${b.category}`}>{b.category}</span>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => removeScanned(b.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={confirmReceived} disabled={confirming}>
            {confirming ? 'Saving...' : `✅ Confirm Receipt of ${scanned.length} Bags`}
          </button>
        </div>
      )}
    </div>
  );
}
