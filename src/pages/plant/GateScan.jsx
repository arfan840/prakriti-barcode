import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { parseQRPayload } from '../../lib/qrGenerator';
import { isWebBluetoothSupported, connectBluetoothScale, simulateWeightFetch, disconnectActiveDevice } from '../../lib/bluetoothScale';

export default function PlantGateScan() {
  const { supabase, user } = useAuth();
  const [scanMode, setScanMode] = useState('fast'); // 'fast' or 'verified'
  const [verifyingBag, setVerifyingBag] = useState(null);
  const [actualWeight, setActualWeight] = useState('');
  const [btLoading, setBtLoading] = useState(false);
  const [btMode, setBtMode] = useState(() => localStorage.getItem('btMode') || 'simulated');
  const [btStatus, setBtStatus] = useState('');
  const [scanned, setScanned] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const scannerInstanceRef = useRef(null);
  const scannedRef = useRef([]);
  const processingRef = useRef(false);

  // Sync state to ref so closure always has latest
  React.useEffect(() => { scannedRef.current = scanned; }, [scanned]);

  React.useEffect(() => {
    return () => {
      disconnectActiveDevice();
    };
  }, []);

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
      
      if (scanMode === 'verified') {
        setVerifyingBag(data);
        setActualWeight('');
        await stopScanner();
      } else {
        setScanned(prev => [...prev, data]);
        setError('');
      }
    } finally {
      // Small timeout to prevent hyper-scanning the same code in 10ms
      setTimeout(() => { processingRef.current = false; }, 1000);
    }
  };

  const triggerBluetoothWeigh = () => {
    if (isWebBluetoothSupported() && btMode === 'real') {
      setBtLoading(true);
      setBtStatus('Initializing Bluetooth...');
      connectBluetoothScale(
        (val) => {
          setActualWeight(val);
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
          setActualWeight(val);
          setBtLoading(false);
          setBtStatus('✅ Simulated weight fetched.');
        },
        () => setBtLoading(true),
        () => setBtLoading(false)
      );
    }
  };

  const confirmVerifiedBag = () => {
    if (!verifyingBag || !actualWeight) return;
    const bagWithNewWeight = { ...verifyingBag, gate_weight: parseFloat(actualWeight) };
    setScanned(prev => [...prev, bagWithNewWeight]);
    setVerifyingBag(null);
    setActualWeight('');
    setError('');
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
      
      // Batch update bag status and gate_weight if applicable
      for (const b of scanned) {
        const updateData = { status: 'received', received_at: now, received_by: user?.id };
        if (b.gate_weight) {
          updateData.received_weight = b.gate_weight; // Store weight received at gate
        }
        await supabase.from('bags').update(updateData).eq('id', b.id);
      }

      await supabase.from('scan_events').insert(
        scanned.map(b => ({
          bag_id: b.id, barcode: b.barcode,
          scanned_by: user?.id, scanner_name: user?.name,
          scan_type: 'gate_in',
          weight: b.gate_weight || b.weight
        }))
      );

      supabase.from('audit_logs').insert({
        user_id: user?.id, user_name: user?.name,
        action: 'GATE_SCAN_COMPLETE', entity: 'BAG',
        details: `${scanned.length} bags received at gate (${scanMode} mode)`,
      }).then();

      alert(`✅ ${scanned.length} bags marked as received!`);
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
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📷 Gate Scan — Receive Bags</h2>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button 
              className={`btn ${scanMode === 'fast' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setScanMode('fast')}
              style={{ padding: '4px 12px' }}
            >
              Option 1: Direct Scan
            </button>
            <button 
              className={`btn ${scanMode === 'verified' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setScanMode('verified')}
              style={{ padding: '4px 12px' }}
            >
              Option 2: Verified (Weighing)
            </button>
          </div>
        </div>
        {scanned.length > 0 && <span className="badge badge-active">{scanned.length} in session</span>}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ef4444' }}>{error}</div>}

      {verifyingBag ? (
        <div className="card" style={{ border: '2px solid var(--accent-primary)', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Verify Bag Weight</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div className="form-label">Hospital</div>
              <div style={{ fontWeight: 600 }}>{verifyingBag.hospital_name}</div>
            </div>
            <div>
              <div className="form-label">Category</div>
              <span className={`badge badge-${verifyingBag.category}`}>{verifyingBag.category}</span>
            </div>
            <div>
              <div className="form-label">Driver Weight</div>
              <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{verifyingBag.weight} kg</div>
            </div>
            <div>
              <div className="form-label">Bag ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{verifyingBag.barcode.slice(-8)}</div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">⚖️ Gate Weight (kg)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                className="form-input" 
                type="number" 
                step="0.001" 
                value={actualWeight} 
                onChange={e => setActualWeight(e.target.value)} 
                placeholder="0.000" 
                style={{ fontSize: '1.5rem', textAlign: 'center', fontWeight: 700, flex: 1 }} 
              />
              <button 
                className="btn btn-secondary" 
                onClick={triggerBluetoothWeigh} 
                disabled={btLoading}
                style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 16px', minWidth: 80 }}
              >
                <span style={{ fontSize: '1.2rem' }}>{btLoading ? '⏳' : '📶'}</span>
                <span style={{ fontSize: '0.6rem' }}>{btMode === 'real' ? 'BLE Scale' : 'Scale'}</span>
              </button>
            </div>
            {isWebBluetoothSupported() ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'real' ? 600 : 400 }}>
                    <input 
                      type="radio" 
                      name="bt-mode-gate" 
                      value="real" 
                      checked={btMode === 'real'} 
                      onChange={() => { setBtMode('real'); localStorage.setItem('btMode', 'real'); setBtStatus(''); }} 
                    />
                    🔌 Real (BLE)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: btMode === 'simulated' ? 600 : 400 }}>
                    <input 
                      type="radio" 
                      name="bt-mode-gate" 
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
            {actualWeight && (
              <div style={{ marginTop: 8, fontSize: '0.85rem', color: Math.abs(parseFloat(actualWeight) - verifyingBag.weight) > 0.1 ? '#ef4444' : 'var(--accent-green)', fontWeight: 600 }}>
                Difference: {(parseFloat(actualWeight) - verifyingBag.weight).toFixed(3)} kg
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setVerifyingBag(null)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={confirmVerifiedBag} disabled={!actualWeight} style={{ flex: 2 }}>Confirm & Add</button>
          </div>
        </div>
      ) : (
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
      )}

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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {b.hospital_name} · {b.gate_weight ? <span>Gate: <strong>{b.gate_weight}</strong> kg</span> : b.weight ? `${b.weight} kg` : 'No weight'}
                  </div>
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
