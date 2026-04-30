import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Certificates() {
  const { apiFetch } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    apiFetch('/batches?status=treated').then(r => r.json()).then(setBatches);
  }, [apiFetch]);

  const viewCert = async (batchId) => {
    const res = await apiFetch(`/batches/${batchId}/certificate`);
    const cert = await res.json();
    setSelectedCert(cert);
  };

  return (
    <div className="slide-up">
      <div className="card-header">
        <h2>📜 Treatment Certificates</h2>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Batch</th><th>Bags</th><th>Weight</th><th>Treatment</th><th>Treated At</th><th>Actions</th></tr></thead>
            <tbody>
              {batches.filter(b => b.certificate).map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td>{b.bagCount}</td>
                  <td>{b.totalWeight} kg</td>
                  <td><span className="badge badge-treated">{b.treatmentType}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(b.treatedAt).toLocaleDateString()}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => viewCert(b.id)}>View Certificate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCert && (
        <div className="modal-overlay" onClick={() => setSelectedCert(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>Treatment Certificate</h2>
              <button className="modal-close" onClick={() => setSelectedCert(null)}>×</button>
            </div>
            <div className="certificate">
              <div className="certificate-header">
                <h1>☣️ BioTrack</h1>
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
                    <tr><th>Waste Categories</th><td>{selectedCert.categories?.join(', ')}</td></tr>
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
