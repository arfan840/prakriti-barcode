import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#f87171', '#60a5fa'];

export default function Reports() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', district: '', hospitalType: '', category: '' });
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    apiFetch('/hospitals/districts').then(r => r.json()).then(setDistricts);
  }, [apiFetch]);

  const load = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    apiFetch(`/reports/waste-summary?${params}`).then(r => r.json()).then(setData);
  };
  useEffect(load, [filters, apiFetch]);

  if (!data) return <div className="loading-spinner" />;

  const categoryData = Object.entries(data.byCategory).map(([name, d]) => ({ name, ...d }));
  const districtData = Object.entries(data.byDistrict).map(([name, d]) => ({ name, ...d }));
  const monthlyData = Object.entries(data.byMonth).sort().map(([name, d]) => ({ name, ...d }));
  const hospitalData = Object.entries(data.byHospital).sort((a, b) => b[1].weight - a[1].weight).slice(0, 10).map(([name, d]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, ...d }));

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📈 Reports & Analytics</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-active">{data.totalBags} bags</span>
          <span className="badge badge-treated">{data.totalWeight} kg</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">From Date</label>
          <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">To Date</label>
          <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">District</label>
          <select className="form-select" value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Hospital Type</label>
          <select className="form-select" value={filters.hospitalType} onChange={e => setFilters(f => ({ ...f, hospitalType: e.target.value }))}>
            <option value="">All Types</option>
            <option value="Bedded">Bedded</option>
            <option value="Non-Bedded">Non-Bedded</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            <option value="Yellow">Yellow</option>
            <option value="Red">Red</option>
            <option value="Blue">Blue</option>
            <option value="White">White</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-value">{data.totalBags.toLocaleString()}</div>
          <div className="stat-card-label">Total Bags</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10b981' }}>
          <div className="stat-card-value">{data.totalWeight.toLocaleString()} kg</div>
          <div className="stat-card-label">Total Weight</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-value">{Object.keys(data.byDistrict).length}</div>
          <div className="stat-card-label">Districts Covered</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#8b5cf6' }}>
          <div className="stat-card-value">{Object.keys(data.byHospital).length}</div>
          <div className="stat-card-label">Active Hospitals</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-title">Waste by Category</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Monthly Trends</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Legend />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bags" />
              <Bar dataKey="weight" fill="#10b981" radius={[4, 4, 0, 0]} name="Weight" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">By District</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={districtData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="weight" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Weight (kg)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Top 10 Hospitals by Weight</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={hospitalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10 }} width={120} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="weight" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
