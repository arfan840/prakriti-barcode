import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generateCertificateHTML } from '../../lib/certificate';

export default function Certificates() {
  const { supabase, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedCert, setSelectedCert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResources() {
      setLoading(true);
      
      let hospitalIdToUse = selectedHospitalId;
      if (user?.role === 'hcf') {
        hospitalIdToUse = user.hospital_id;
        const { data: hData } = await supabase.from('hospitals').select('id, name, hcf_code').eq('id', user.hospital_id).single();
        if (hData) setHospitals([hData]);
      } else {
        // Fetch Hospitals for the filter
        const { data: hData } = await supabase.from('hospitals').select('id, name, hcf_code').order('name');
        if (hData) setHospitals(hData);
      }

      // Fetch Batches
      const { data: bData } = await supabase.from('batches').select('*').eq('status', 'treated').order('treated_at', { ascending: false });
      
      if (bData) {
        // If an HCF is selected or logged in, we need to calculate specific totals for that HCF in each batch
        const formattedBatches = await Promise.all(bData.map(async b => {
          const { data: bags } = await supabase.from('bags')
            .select('category, weight, hospital_name, hospital_id')
            .eq('batch_id', b.id);
            
          const bagsList = bags || [];
          
          let filteredBags = bagsList;
          if (hospitalIdToUse) {
            filteredBags = bagsList.filter(bag => bag.hospital_id === hospitalIdToUse);
          }

          const bagCount = filteredBags.length;
          const totalWeight = filteredBags.reduce((sum, bag) => sum + (Number(bag.weight) || 0), 0);
          const categories = Array.from(new Set(filteredBags.map(bag => bag.category)));
          const sourceHospitals = hospitalIdToUse
            ? [filteredBags[0]?.hospital_name || 'Selected Facility']
            : Array.from(new Set(bagsList.map(bag => bag.hospital_name)));

          // Calculate category-wise breakdown (bags count and total weight)
          const categoryBreakdown = {
            Yellow: { count: 0, weight: 0 },
            Red: { count: 0, weight: 0 },
            White: { count: 0, weight: 0 },
            Blue: { count: 0, weight: 0 }
          };

          filteredBags.forEach(bag => {
            const cat = bag.category;
            if (categoryBreakdown[cat]) {
              categoryBreakdown[cat].count += 1;
              categoryBreakdown[cat].weight += (Number(bag.weight) || 0);
            }
          });

          return {
            ...b,
            batchNumber: b.batch_number,
            bagCount,
            totalWeight: totalWeight.toFixed(2),
            treatmentType: b.treatment_type,
            treatedAt: b.treated_at,
            certificateId: b.id,
            certificate: bagCount > 0, // Only show if this hospital actually had bags in this batch
            generatedAt: b.treated_at,
            categories: categories,
            categoryBreakdown,
            hospitals: sourceHospitals,
            operator: b.operator || 'System Operator'
          };
        }));

        setBatches(formattedBatches.filter(b => b.certificate));
      }
      setLoading(false);
    }
    loadResources();
  }, [supabase, selectedHospitalId, user]);

  const viewCert = (batch) => {
    setSelectedCert(batch);
  };

  const printCert = (cert) => {
    const html = generateCertificateHTML(cert, cert.operator, cert.categoryBreakdown);
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="slide-up">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>📜 Treatment Certificates</h2>
          {user?.role === 'hcf' && hospitals.find(h => h.id === user.hospital_id) && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Facility: <strong>{hospitals.find(h => h.id === user.hospital_id)?.name}</strong>
            </div>
          )}
        </div>
        {user?.role !== 'hcf' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by HCF:</label>
            <select 
              className="form-select" 
              style={{ minWidth: 250, padding: '6px 12px' }}
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
            >
              <option value="">All Facilities (Batch-wise)</option>
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.hcf_code})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : batches.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No treatment records found for the selected filter.</div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Batch / HCF</th><th>Bags</th><th>Weight</th><th>Treatment</th><th>Treated At</th><th>Actions</th></tr></thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</div>
                      {(selectedHospitalId || user?.role === 'hcf') && <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>{b.hospitals[0]}</div>}
                    </td>
                    <td>{b.bagCount}</td>
                    <td>{b.totalWeight} kg</td>
                    <td><span className="badge badge-treated">{b.treatmentType}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.treatedAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => viewCert(b)}>View Certificate</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCert && (
        <div className="modal-overlay" onClick={() => setSelectedCert(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>Treatment Certificate</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-primary btn-sm" onClick={() => printCert(selectedCert)}>📜 Print</button>
                <button className="modal-close" onClick={() => setSelectedCert(null)}>×</button>
              </div>
            </div>
            <div className="certificate">
              <div className="certificate-header">
                <h1>☣️ Prakriti Track</h1>
                <h1>Certificate of Treatment</h1>
                <p>Biomedical Waste Management Facility</p>
              </div>
              <div className="certificate-body">
                <p>This is to certify that the biomedical waste described below has been <strong>treated and disposed of</strong> in accordance with the Biomedical Waste Management Rules.</p>
                <table>
                  <tbody>
                    <tr><th>Certificate ID</th><td style={{ fontFamily: 'monospace' }}>{selectedCert.certificateId?.slice(0, 8).toUpperCase()}</td></tr>
                    <tr><th>Batch Number</th><td>{selectedCert.batchNumber}</td></tr>
                    <tr><th>Treatment Type</th><td>{selectedCert.treatmentType}</td></tr>
                    <tr><th>Total Bags</th><td>{selectedCert.bagCount}</td></tr>
                    <tr><th>Total Weight</th><td>{selectedCert.totalWeight} kg</td></tr>
                    <tr>
                      <th>Waste Category Breakdown</th>
                      <td style={{ padding: '4px 12px' }}>
                        <table style={{ borderCollapse: 'collapse', border: 'none', margin: 0, width: '100%', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: 'transparent' }}>
                              <th style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', padding: '4px 0', fontWeight: 'bold' }}>Category</th>
                              <th style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', padding: '4px 0', fontWeight: 'bold', textAlign: 'right' }}>Bags</th>
                              <th style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', padding: '4px 0', fontWeight: 'bold', textAlign: 'right' }}>Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['Yellow', 'Red', 'White', 'Blue'].map(cat => {
                              const info = selectedCert.categoryBreakdown?.[cat] || { count: 0, weight: 0 };
                              return (
                                <tr key={cat} style={{ background: 'transparent' }}>
                                  <td style={{ border: 'none', padding: '6px 0', display: 'flex', alignItems: 'center' }}>
                                    <span className={`badge badge-${cat}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>{cat}</span>
                                  </td>
                                  <td style={{ border: 'none', padding: '6px 0', textAlign: 'right' }}>{info.count}</td>
                                  <td style={{ border: 'none', padding: '6px 0', textAlign: 'right' }}>{info.weight.toFixed(2)} kg</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr><th>Source Hospitals</th><td>{selectedCert.hospitals?.join(', ')}</td></tr>
                    <tr><th>Treated On</th><td>{new Date(selectedCert.treatedAt).toLocaleString()}</td></tr>
                    <tr><th>Operator</th><td>{selectedCert.operator}</td></tr>
                    <tr><th>Generated On</th><td>{new Date(selectedCert.generatedAt).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="certificate-footer">
                <div>Authorized Signature<br />_______________________</div>
                <div>Date: {new Date(selectedCert.generatedAt).toLocaleDateString()}<br />Seal</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
