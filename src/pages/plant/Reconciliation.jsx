import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PlantReconciliation() {
  const { supabase, user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ collected: [], received: [] });
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    supabase.from('routes').select('*, profiles(name)').order('date', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setRoutes(data); });
  }, [supabase]);

  const viewRoute = async (route) => {
    setSelected(route);
    setLoading(true);
    try {
      const { data: bags } = await supabase.from('bags').select('*').eq('route_id', route.id);
      const collected = bags?.filter(b => ['collected', 'received', 'in_batch', 'treated'].includes(b.status)) || [];
      const received = bags?.filter(b => ['received', 'in_batch', 'treated'].includes(b.status)) || [];
      setDetails({ collected, received, allBags: bags || [] });
    } finally {
      setLoading(false);
    }
  };

  const createDiscrepancy = async (bag, type) => {
    setResolving(bag.id);
    try {
      await supabase.from('discrepancies').insert({
        bag_id: bag.id, barcode: bag.barcode, type,
        description: type === 'missing' ? `Bag collected but not received at plant` : `Bag received at plant but no collection record`,
        route_id: selected?.id, status: 'open',
      });
      supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'DISCREPANCY_CREATED', entity: 'BAG', entity_id: bag.id, details: `${type} discrepancy for ${bag.barcode}` }).then();
      alert(`Discrepancy logged for ${bag.barcode}`);
    } finally {
      setResolving(null);
    }
  };

  const missingBags = details.collected?.filter(b => !details.received?.find(r => r.id === b.id)) || [];
  const catStats = (bags) => ['Yellow', 'Red', 'Blue', 'White'].map(cat => ({
    cat, count: bags.filter(b => b.category === cat).length,
    weight: bags.filter(b => b.category === cat).reduce((s, b) => s + (b.weight || 0), 0),
  }));

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🔄 Reconciliation</h2>
        {selected && <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setDetails({ collected: [], received: [] }); }}>← Back</button>}
      </div>

      {!selected ? (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Select a Route to Reconcile</div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Driver</th><th>Vehicle</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td>{r.profiles?.name || r.driver_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.vehicle_number || '—'}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => viewRoute(r)}>Reconcile</button></td>
                  </tr>
                ))}
                {routes.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No routes found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : loading ? <div className="loading-spinner" /> : (
        <div>
          {/* Route Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Bags Collected', val: details.collected.length, color: '#6366f1' },
              { label: 'Bags Received', val: details.received.length, color: '#10b981' },
              { label: 'Missing Bags', val: missingBags.length, color: missingBags.length > 0 ? '#ef4444' : '#10b981' },
              { label: 'Total Weight', val: `${details.received.reduce((s, b) => s + (b.weight || 0), 0).toFixed(2)} kg`, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ '--stat-color': s.color, padding: 16 }}>
                <div className="stat-card-value" style={{ fontSize: '1.6rem', color: s.color }}>{s.val}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category Breakdown */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Category Breakdown</div>
            <div className="data-table-wrapper">
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead><tr><th>Category</th><th>Collected</th><th>Received</th><th>Difference</th><th>Collected Wt (kg)</th><th>Received Wt (kg)</th><th>Wt Diff</th></tr></thead>
                <tbody>
                  {['Yellow', 'Red', 'Blue', 'White'].map(cat => {
                    const col = details.collected.filter(b => b.category === cat);
                    const rec = details.received.filter(b => b.category === cat);
                    const colWt = col.reduce((s, b) => s + (b.weight || 0), 0);
                    const recWt = rec.reduce((s, b) => s + (b.weight || 0), 0);
                    const diff = col.length - rec.length;
                    const wtDiff = (colWt - recWt).toFixed(3);
                    return (
                      <tr key={cat} style={diff > 0 ? { background: 'rgba(239,68,68,0.06)' } : {}}>
                        <td><span className={`badge badge-${cat}`}>{cat}</span></td>
                        <td>{col.length}</td>
                        <td>{rec.length}</td>
                        <td style={{ fontWeight: 700, color: diff > 0 ? '#ef4444' : 'var(--accent-green)' }}>
                          {diff > 0 ? `▲ ${diff}` : diff === 0 ? '✓' : `▼ ${Math.abs(diff)}`}
                        </td>
                        <td>{colWt.toFixed(3)}</td>
                        <td>{recWt.toFixed(3)}</td>
                        <td style={{ color: Math.abs(Number(wtDiff)) > 0.001 ? '#ef4444' : 'var(--accent-green)' }}>{wtDiff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Bags */}
          {missingBags.length > 0 && (
            <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="card-title" style={{ color: '#ef4444', marginBottom: 12 }}>⚠️ Missing Bags ({missingBags.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {missingBags.map(b => (
                  <div key={b.id} className="sync-item" style={{ background: 'rgba(239,68,68,0.06)' }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem' }}>{b.barcode}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.hospital_name} · <span className={`badge badge-${b.category}`} style={{ fontSize: '0.7rem' }}>{b.category}</span></div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => createDiscrepancy(b, 'missing')} disabled={resolving === b.id}>
                      {resolving === b.id ? '...' : '🚨 Log Discrepancy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {missingBags.length === 0 && details.collected.length > 0 && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 20, textAlign: 'center', fontWeight: 700, color: 'var(--accent-green)' }}>
              ✅ All {details.collected.length} bags accounted for — No discrepancies!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
