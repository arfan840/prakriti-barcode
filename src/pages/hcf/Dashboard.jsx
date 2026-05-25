import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function HcfDashboard() {
  const { supabase, user } = useAuth();
  const navigate = useNavigate();
  
  const [hospital, setHospital] = useState(null);
  const [bags, setBags] = useState([]);
  const [stats, setStats] = useState({ created: 0, collected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      if (!user?.hospital_id) {
        setError('No hospital associated with this account. Please contact an admin.');
        setLoading(false);
        return;
      }

      // Fetch hospital details
      const { data: hosp, error: hospErr } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', user.hospital_id)
        .single();
      
      if (hospErr) throw hospErr;
      setHospital(hosp);

      // Fetch bags for this hospital
      const { data: bagData, error: bagErr } = await supabase
        .from('bags')
        .select('*')
        .eq('hospital_id', user.hospital_id)
        .order('created_at', { ascending: false });

      if (bagErr) throw bagErr;
      setBags(bagData || []);

      // Calculate stats
      const createdCount = bagData.filter(b => b.status === 'created').length;
      const collectedCount = bagData.filter(b => b.status !== 'created').length;
      setStats({
        created: createdCount,
        collected: collectedCount,
        total: bagData.length
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading HCF dashboard details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, supabase]);

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="slide-up" style={{ paddingBottom: 40 }}>
      {/* Header Panel */}
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <h2>🏥 {hospital?.name || 'HCF Portal'}</h2>
          <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 4, fontSize: '0.85rem' }}>
            <span>Code: <strong>{hospital?.hcf_code}</strong></span>
            <span>·</span>
            <span>Beds: <strong>{hospital?.beds || '—'}</strong></span>
            <span>·</span>
            <span>District: <strong>{hospital?.district}</strong></span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/hcf/scan')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          📷 Dispatch Bags
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 16, marginBottom: 20, color: '#ef4444' }}>{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="stat-card-label">Total Bags Generated</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-purple)' }}>{stats.total}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="stat-card-label">Pending Collection</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-yellow)' }}>{stats.created}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="stat-card-label">Dispatched / Collected</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-green)' }}>{stats.collected}</div>
        </div>
      </div>

      {/* Large Bed Capacity Alert/Badge */}
      {hospital?.beds > 30 && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>Self-Scanning Protocol Active</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Because this facility has more than 30 beds ({hospital.beds} beds), scanning and collection weigh-ins are restricted on driver devices and must be completed by your HCF staff.
            </div>
          </div>
        </div>
      )}

      {/* Recent Bags Table */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Recent Biomedical Waste Bags</div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Barcode / Bag ID</th>
                <th>Category</th>
                <th>Weight (kg)</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {bags.slice(0, 10).map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{b.barcode}</td>
                  <td>
                    <span className={`badge badge-${b.category}`}>{b.category}</span>
                  </td>
                  <td>{b.weight ? `${b.weight} kg` : '—'}</td>
                  <td>
                    <span className={`badge badge-${b.status}`}>{b.status.toUpperCase()}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(b.created_at).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {bags.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    No waste bags generated yet. Use the Admin Bag Tracker to create labels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
