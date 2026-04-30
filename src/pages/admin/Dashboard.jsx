import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#fbbf24', '#f87171', '#60a5fa', '#e5e7eb'];
const CATEGORY_COLORS = { Yellow: '#fbbf24', Red: '#f87171', Blue: '#60a5fa', White: '#e5e7eb' };

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [reconSummary, setReconSummary] = useState(null);
  const [treatmentStats, setTreatmentStats] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/bags/stats').then(r => r.json()),
      apiFetch('/reports/collection-trends').then(r => r.json()),
      apiFetch('/reconciliation/summary').then(r => r.json()),
      apiFetch('/reports/treatment-stats').then(r => r.json()),
    ]).then(([s, t, r, tr]) => { setStats(s); setTrends(t); setReconSummary(r); setTreatmentStats(tr); });
  }, [apiFetch]);

  if (!stats) return <div className="loading-spinner" />;

  const categoryData = Object.entries(stats.byCategory).map(([name, count]) => ({ name, value: count }));
  const statusData = Object.entries(stats.byStatus).map(([name, count]) => ({ name: name.replace('_', ' '), count }));

  return (
    <div className="slide-up">
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>📦</div>
          <div className="stat-card-value">{stats.total.toLocaleString()}</div>
          <div className="stat-card-label">Total Bags Tracked</div>
          <div className="stat-card-change positive">+{stats.todayBags} today</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>⚖️</div>
          <div className="stat-card-value">{stats.totalWeight.toLocaleString()} kg</div>
          <div className="stat-card-label">Total Weight Processed</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>⚠️</div>
          <div className="stat-card-value">{reconSummary?.open || 0}</div>
          <div className="stat-card-label">Open Discrepancies</div>
          <div className="stat-card-change negative">{reconSummary?.total || 0} total</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#8b5cf6' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>♻️</div>
          <div className="stat-card-value">{treatmentStats?.treatedBatches || 0}</div>
          <div className="stat-card-label">Batches Treated</div>
          <div className="stat-card-change">{treatmentStats?.pendingBatches || 0} pending</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-title">📈 Collection Trends (Last 30 Days)</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorBags" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="bags" stroke="#6366f1" fill="url(#colorBags)" strokeWidth={2} />
              <Area type="monotone" dataKey="weight" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">🗂️ Waste by Category</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">📊 Bags by Status</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {treatmentStats && (
          <div className="chart-card">
            <div className="chart-card-title">♻️ Treatment Methods</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={Object.entries(treatmentStats.byType || {}).map(([name, d]) => ({ name, ...d }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
                <Legend />
                <Bar dataKey="bags" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Bags" />
                <Bar dataKey="weight" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Weight (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
