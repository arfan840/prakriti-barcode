import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function DriverHome() {
  const { supabase, user } = useAuth();
  const [route, setRoute] = useState(null);
  const [stats, setStats] = useState({ collected: 0, pending: 0, hospitals: 0 });
  const [loading, setLoading] = useState(true);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: r } = await supabase.from('routes').select('*').eq('driver_id', user?.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
      setRoute(r || null);

      if (r) {
        const { data: bags } = await supabase.from('bags').select('id, status, hospital_id').eq('route_id', r.id);
        const collected = bags?.filter(b => b.status === 'collected' || b.status === 'received' || b.status === 'treated').length || 0;
        const hospitals = new Set(bags?.map(b => b.hospital_id)).size;
        setStats({ collected, pending: (bags?.length || 0) - collected, hospitals });
      }

      const { data: v } = await supabase.from('vehicles').select('id, number').eq('status', 'active');
      if (v) setVehicles(v);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user, supabase]);

  const startRoute = async () => {
    setCreatingRoute(true);
    try {
      const vehicle = vehicles.find(v => v.id === selectedVehicle);
      const { data, error } = await supabase.from('routes').insert({
        driver_id: user.id,
        driver_name: user.name,
        vehicle_id: selectedVehicle || null,
        vehicle_number: vehicle?.number || 'N/A',
        status: 'active',
        date: new Date().toISOString(),
      }).select().single();
      if (error) throw error;
      supabase.from('audit_logs').insert({ user_id: user.id, user_name: user.name, action: 'ROUTE_STARTED', entity: 'ROUTE', entity_id: data.id, details: `Driver started route with vehicle ${vehicle?.number || 'N/A'}` }).then();
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingRoute(false);
    }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>🗺️ Today's Route</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {!route ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚛</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No active route</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Start a new route to begin collecting waste bags</div>
          <div style={{ maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Select Vehicle</label>
              <select className="form-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                <option value="">No vehicle selected</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.number}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-lg" onClick={startRoute} disabled={creatingRoute}>
              {creatingRoute ? 'Starting...' : '🚀 Start Today\'s Route'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>🚛 {route.vehicle_number}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Started: {new Date(route.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="badge badge-active">ACTIVE</span>
            </div>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="stat-card" style={{ '--stat-color': '#10b981', padding: '16px' }}>
              <div className="stat-card-value" style={{ fontSize: '1.8rem' }}>{stats.collected}</div>
              <div className="stat-card-label">Collected</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': '#f59e0b', padding: '16px' }}>
              <div className="stat-card-value" style={{ fontSize: '1.8rem' }}>{stats.pending}</div>
              <div className="stat-card-label">Pending</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': '#6366f1', padding: '16px' }}>
              <div className="stat-card-value" style={{ fontSize: '1.8rem' }}>{stats.hospitals}</div>
              <div className="stat-card-label">HCFs</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '📍', label: 'GPS Check-in', path: '/driver/checkin' },
                { icon: '📱', label: 'Scan Bag', path: '/driver/scan' },
                { icon: '⚖️', label: 'Weigh Bag', path: '/driver/weigh' },
                { icon: '📋', label: 'View Manifest', path: '/driver/manifest' },
              ].map(a => (
                <a key={a.path} href={a.path} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>{a.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.label}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
