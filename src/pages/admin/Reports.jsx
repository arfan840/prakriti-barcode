import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Yellow', 'Red', 'Blue', 'White'];

function ReportTable({ data, filters }) {
  const handlePrint = () => {
    window.print();
  };

  const grandTotals = data.reduce((acc, row) => {
    CATEGORIES.forEach(cat => {
      acc[cat] = acc[cat] || { gen_bags: 0, gen_weight: 0, rec_bags: 0, rec_weight: 0 };
      acc[cat].gen_bags += row[cat]?.gen_bags || 0;
      acc[cat].gen_weight += row[cat]?.gen_weight || 0;
      acc[cat].rec_bags += row[cat]?.rec_bags || 0;
      acc[cat].rec_weight += row[cat]?.rec_weight || 0;
    });
    acc.total_gen_bags = (acc.total_gen_bags || 0) + (row.total_gen_bags || 0);
    acc.total_rec_bags = (acc.total_rec_bags || 0) + (row.total_rec_bags || 0);
    acc.total_gen_weight = (acc.total_gen_weight || 0) + (row.total_gen_weight || 0);
    acc.total_rec_weight = (acc.total_rec_weight || 0) + (row.total_rec_weight || 0);
    return acc;
  }, {});

  return (
    <div className="card" id="printable-report">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Biomedical Waste Summary Report</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {filters.period === 'day' ? `Date: ${filters.date}` : filters.period === 'month' ? `Month: ${filters.month}` : `Year: ${filters.year}`}
            {filters.district ? ` · District: ${filters.district}` : ''}
            {filters.hospital_type !== '' ? ` · ${filters.hospital_type === 'bedded' ? 'Bedded' : 'Non-Bedded'}` : ''}
          </div>
        </div>
        <button className="btn btn-secondary no-print" onClick={handlePrint}>🖨️ Print / PDF</button>
      </div>

      <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="data-table report-table" style={{ fontSize: '0.78rem', minWidth: 900 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ minWidth: 150 }}>HCF Name</th>
              <th rowSpan={2}>Type</th>
              <th rowSpan={2}>Bedded</th>
              {CATEGORIES.map(cat => (
                <th key={cat} colSpan={4} style={{ textAlign: 'center', background: `var(--cat-${cat.toLowerCase()}-bg, var(--surface))` }}>
                  {cat} Bags
                </th>
              ))}
              <th colSpan={2} style={{ textAlign: 'center' }}>Total</th>
              <th rowSpan={2} style={{ minWidth: 80 }}>Diff (kg)</th>
            </tr>
            <tr>
              {CATEGORIES.map(cat => (
                ['Gen Bags', 'Gen Wt(kg)', 'Rec Bags', 'Rec Wt(kg)'].map(col => (
                  <th key={`${cat}-${col}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{col}</th>
                ))
              ))}
              <th>Gen Bags</th>
              <th>Rec Bags</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={3 + CATEGORIES.length * 4 + 3} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                No data for selected filters
              </td></tr>
            )}
            {data.map((row, i) => {
              const diff = ((row.total_gen_weight || 0) - (row.total_rec_weight || 0)).toFixed(3);
              const hasDiff = Math.abs(Number(diff)) > 0.001;
              return (
                <tr key={i} style={hasDiff ? { background: 'rgba(239,68,68,0.06)' } : {}}>
                  <td style={{ fontWeight: 600 }}>{row.hospital_name}</td>
                  <td>{row.type}</td>
                  <td><span className={`badge ${row.bedded ? 'badge-collected' : 'badge-created'}`} style={{ fontSize: '0.65rem' }}>{row.bedded ? 'Bedded' : 'Non-Bed'}</span></td>
                  {CATEGORIES.map(cat => {
                    const d = row[cat] || {};
                    return [
                      <td key={`${cat}-gb`}>{d.gen_bags || 0}</td>,
                      <td key={`${cat}-gw`}>{(d.gen_weight || 0).toFixed(3)}</td>,
                      <td key={`${cat}-rb`}>{d.rec_bags || 0}</td>,
                      <td key={`${cat}-rw`}>{(d.rec_weight || 0).toFixed(3)}</td>,
                    ];
                  })}
                  <td style={{ fontWeight: 600 }}>{row.total_gen_bags || 0}</td>
                  <td style={{ fontWeight: 600 }}>{row.total_rec_bags || 0}</td>
                  <td style={{ fontWeight: 700, color: hasDiff ? '#ef4444' : 'var(--accent-green)' }}>
                    {hasDiff ? `▲ ${Math.abs(diff)}` : '0.000'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr style={{ background: 'rgba(99,102,241,0.1)', fontWeight: 700 }}>
                <td colSpan={3}>Grand Total</td>
                {CATEGORIES.map(cat => {
                  const d = grandTotals[cat] || {};
                  return [
                    <td key={`${cat}-gb`}>{d.gen_bags || 0}</td>,
                    <td key={`${cat}-gw`}>{(d.gen_weight || 0).toFixed(3)}</td>,
                    <td key={`${cat}-rb`}>{d.rec_bags || 0}</td>,
                    <td key={`${cat}-rw`}>{(d.rec_weight || 0).toFixed(3)}</td>,
                  ];
                })}
                <td>{grandTotals.total_gen_bags || 0}</td>
                <td>{grandTotals.total_rec_bags || 0}</td>
                <td>{((grandTotals.total_gen_weight || 0) - (grandTotals.total_rec_weight || 0)).toFixed(3)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default function Reports() {
  const { supabase } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  const [filters, setFilters] = useState({
    period: 'month', date: today, month: thisMonth, year: thisYear,
    district: '', hospital_id: '', hospital_type: '', category: '',
  });
  const [hospitals, setHospitals] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('hospitals').select('id, name, district').order('name').then(({ data }) => {
      if (data) {
        setHospitals(data);
        setDistricts([...new Set(data.map(h => h.district).filter(Boolean))].sort());
      }
    });
  }, [supabase]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch hospitals matching filters
      let hQuery = supabase.from('hospitals').select('id, name, type, bedded, district');
      if (filters.hospital_id) hQuery = hQuery.eq('id', filters.hospital_id);
      if (filters.district) hQuery = hQuery.ilike('district', `%${filters.district}%`);
      if (filters.hospital_type === 'bedded') hQuery = hQuery.eq('bedded', true);
      if (filters.hospital_type === 'non_bedded') hQuery = hQuery.eq('bedded', false);
      const { data: hcfs } = await hQuery;
      if (!hcfs || hcfs.length === 0) { setReportData([]); setLoading(false); return; }

      // Date range
      let startDate, endDate;
      if (filters.period === 'day') {
        startDate = filters.date + 'T00:00:00Z';
        endDate = filters.date + 'T23:59:59Z';
      } else if (filters.period === 'month') {
        const [y, m] = filters.month.split('-');
        startDate = `${y}-${m}-01T00:00:00Z`;
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        endDate = `${y}-${m}-${lastDay}T23:59:59Z`;
      } else {
        startDate = `${filters.year}-01-01T00:00:00Z`;
        endDate = `${filters.year}-12-31T23:59:59Z`;
      }

      // Fetch bags for these hospitals in date range
      let bQuery = supabase.from('bags').select('hospital_id, hospital_name, category, weight, status, created_at, received_at');
      bQuery = bQuery.in('hospital_id', hcfs.map(h => h.id));
      bQuery = bQuery.gte('created_at', startDate).lte('created_at', endDate);
      if (filters.category) bQuery = bQuery.eq('category', filters.category);
      const { data: bags } = await bQuery;

      // Aggregate by hospital
      const hcfMap = {};
      hcfs.forEach(h => {
        hcfMap[h.id] = { hospital_id: h.id, hospital_name: h.name, type: h.type, bedded: h.bedded, total_gen_bags: 0, total_rec_bags: 0, total_gen_weight: 0, total_rec_weight: 0 };
        CATEGORIES.forEach(cat => { hcfMap[h.id][cat] = { gen_bags: 0, gen_weight: 0, rec_bags: 0, rec_weight: 0 }; });
      });

      (bags || []).forEach(b => {
        const row = hcfMap[b.hospital_id];
        if (!row) return;
        const cat = b.category;
        if (!row[cat]) return;
        row[cat].gen_bags++;
        row[cat].gen_weight += (b.weight || 0);
        row.total_gen_bags++;
        row.total_gen_weight += (b.weight || 0);
        if (b.status === 'received' || b.status === 'in_batch' || b.status === 'treated') {
          row[cat].rec_bags++;
          row[cat].rec_weight += (b.weight || 0);
          row.total_rec_bags++;
          row.total_rec_weight += (b.weight || 0);
        }
      });

      setReportData(Object.values(hcfMap));
    } finally {
      setLoading(false);
    }
  }, [filters, supabase]);

  useEffect(() => { generateReport(); }, [generateReport]);

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📊 Biomedical Waste Reports</h2>
        <span className="badge badge-active">{reportData.length} HCFs</span>
      </div>

      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Period</label>
          <select className="form-select" value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}>
            <option value="day">Day-wise</option>
            <option value="month">Month-wise</option>
            <option value="year">Year-wise</option>
          </select>
        </div>
        {filters.period === 'day' && (
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
          </div>
        )}
        {filters.period === 'month' && (
          <div className="form-group">
            <label className="form-label">Month</label>
            <input className="form-input" type="month" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} />
          </div>
        )}
        {filters.period === 'year' && (
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">District</label>
          <select className="form-select" value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value }))}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">HCF</label>
          <select className="form-select" value={filters.hospital_id} onChange={e => setFilters(f => ({ ...f, hospital_id: e.target.value }))}>
            <option value="">All HCFs</option>
            {hospitals.filter(h => !filters.district || h.district === filters.district).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">HCF Type</label>
          <select className="form-select" value={filters.hospital_type} onChange={e => setFilters(f => ({ ...f, hospital_type: e.target.value }))}>
            <option value="">All</option>
            <option value="bedded">Bedded</option>
            <option value="non_bedded">Non-Bedded</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="loading-spinner" /> : <ReportTable data={reportData} filters={filters} />}
    </div>
  );
}
