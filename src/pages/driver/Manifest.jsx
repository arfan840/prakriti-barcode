import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverManifest() {
  const { supabase, user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeBags, setRouteBags] = useState([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase.from('routes').select('*').eq('driver_id', user.id);
      if (data) setRoutes(data.map(r => ({ ...r, vehicleNumber: r.vehicle_number, siteNames: ['Multiple Sites'], status: r.status })));
    }
    load();
  }, [refresh, supabase, user]);

  const viewRoute = async (route) => {
    setSelectedRoute(route);
    const { data } = await supabase.from('bags').select('*').eq('route_id', route.id).eq('status', 'collected');
    if (data) setRouteBags(data);
  };

  const closeRoute = async () => {
    if (!selectedRoute) return;
    await supabase.from('routes').update({ status: 'closed' }).eq('id', selectedRoute.id);
    setSelectedRoute(null);
    setRefresh(r => r + 1);
    
    supabase.from('audit_logs').insert({ user_id: user?.id, user_name: user?.name, action: 'ROUTE_CLOSED', entity: 'ROUTE', entity_id: selectedRoute.id, details: `Driver closed route manifest.` }).then();
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📋 Manifest</h2>
      </div>

      {!selectedRoute ? (
        <div>
          {routes.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">No routes assigned</p>
            </div>
          ) : (
            routes.map(r => (
              <div key={r.id} className="route-card" onClick={() => viewRoute(r)} style={{ cursor: 'pointer' }}>
                <div className="route-card-header">
                  <div>
                    <div style={{ fontWeight: 600 }}>🚛 {r.vehicleNumber}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge badge-${r.status}`}>{r.status}</span>
                </div>
                <div className="route-card-sites">
                  {r.siteNames?.map((s, i) => <span key={i} className="route-card-site">{s}</span>)}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <button className="btn btn-secondary" onClick={() => setSelectedRoute(null)} style={{ marginBottom: 16 }}>← Back to Routes</button>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>🚛 {selectedRoute.vehicleNumber}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(selectedRoute.date).toLocaleDateString()}</div>
              </div>
              <span className={`badge badge-${selectedRoute.status}`}>{selectedRoute.status}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span className="form-label">Sites</span>
              <div className="route-card-sites" style={{ marginTop: 4 }}>
                {selectedRoute.siteNames?.map((s, i) => <span key={i} className="route-card-site">{s}</span>)}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Collected Bags ({routeBags.length})</div>
            {routeBags.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No bags collected on this route yet</p>
            ) : (
              routeBags.map(b => (
                <div key={b.id} className="sync-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.barcode}</span>
                    <span className={`badge badge-${b.category}`}>{b.category}</span>
                  </div>
                  <span>{b.weight} kg</span>
                </div>
              ))
            )}
          </div>

          {selectedRoute.status === 'active' && (
            <button className="btn btn-danger btn-lg" style={{ width: '100%' }} onClick={closeRoute}>
              🏁 Close Route & Submit Manifest
            </button>
          )}
        </div>
      )}
    </div>
  );
}
