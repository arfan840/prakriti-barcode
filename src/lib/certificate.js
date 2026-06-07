/**
 * Generates printable HTML for a Biomedical Waste Disposal Certificate.
 * Handles both database column formats (snake_case and camelCase).
 *
 * @param {Object} batch - The batch details
 * @param {string} [treatedBy] - Name of the operator who treated the batch
 * @param {Object} [categoryBreakdown] - Category wise stats mapping category to { count, weight }
 * @returns {string} The complete HTML string for the certificate
 */
export function generateCertificateHTML(batch, treatedBy, categoryBreakdown) {
  const batchId = batch.id || '';
  const certNum = `CERT-${batchId.slice(0, 8).toUpperCase()}-${new Date(batch.treated_at || batch.treatedAt || new Date()).getFullYear()}`;
  
  // Format treatment date
  const rawDate = batch.treated_at || batch.treatedAt || new Date();
  const dateStr = new Date(rawDate).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  const timeStr = new Date(rawDate).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const batchNumber = batch.batch_number || batch.batchNumber || '—';
  const treatmentType = batch.treatment_type || batch.treatmentType || 'Autoclave';
  const bagCount = batch.bag_count !== undefined ? batch.bag_count : (batch.bagCount !== undefined ? batch.bagCount : 0);
  const totalWeight = batch.total_weight !== undefined ? batch.total_weight : (batch.totalWeight !== undefined ? batch.totalWeight : 0);
  const operatorName = treatedBy || batch.operator || 'System Operator';

  // Build category breakdown rows
  const defaultBreakdown = {
    Yellow: { count: 0, weight: 0 },
    Red: { count: 0, weight: 0 },
    White: { count: 0, weight: 0 },
    Blue: { count: 0, weight: 0 }
  };

  const breakdown = categoryBreakdown || defaultBreakdown;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Disposal Certificate — ${certNum}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          margin: 0; 
          padding: 40px; 
          color: #1e293b;
          background-color: #ffffff;
        }
        .border { 
          border: 3px double #1e3a8a; 
          padding: 35px; 
          border-radius: 8px; 
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #1e3a8a; 
          padding-bottom: 20px; 
          margin-bottom: 24px; 
        }
        .logo { 
          font-size: 36px; 
          margin-bottom: 8px; 
        }
        h1 { 
          font-size: 22px; 
          color: #1e3a8a; 
          margin: 4px 0; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        h2 { 
          font-size: 14px; 
          color: #475569; 
          margin: 4px 0; 
          font-weight: 500; 
        }
        .cert-title { 
          font-size: 18px; 
          font-weight: 700; 
          color: #1e3a8a; 
          margin: 24px 0 16px; 
          text-align: center; 
          text-transform: uppercase; 
          letter-spacing: 2px; 
        }
        .body-text { 
          font-size: 13px; 
          line-height: 1.8; 
          margin-bottom: 20px; 
          color: #334155;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
          font-size: 13px; 
        }
        th { 
          background: #1e3a8a; 
          color: white; 
          padding: 10px 14px; 
          text-align: left; 
          font-weight: 600;
        }
        td { 
          padding: 10px 14px; 
          border-bottom: 1px solid #e2e8f0; 
          color: #334155;
        }
        tr:nth-child(even) td { 
          background: #f8fafc; 
        }
        
        /* Category breakdown inner table styling */
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
          font-size: 12px;
        }
        .breakdown-table th {
          background: transparent;
          color: #475569;
          border-bottom: 1px solid #cbd5e1;
          padding: 4px 8px;
          font-weight: 600;
        }
        .breakdown-table td {
          padding: 6px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .breakdown-table tr:nth-child(even) td {
          background: transparent;
        }
        
        .badge-marker {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 6px;
        }
        .bg-yellow { background-color: #eab308; }
        .bg-red { background-color: #ef4444; }
        .bg-white { background-color: #94a3b8; border: 1px solid #cbd5e1; }
        .bg-blue { background-color: #3b82f6; }
        
        .sig-row { 
          display: flex; 
          justify-content: space-between; 
          margin-top: 50px; 
        }
        .sig-box { 
          text-align: center; 
          width: 45%; 
        }
        .sig-line { 
          border-top: 1px solid #475569; 
          margin-top: 60px; 
          padding-top: 8px; 
          font-size: 12px; 
          color: #475569; 
          font-weight: 500;
        }
        .cert-num { 
          font-size: 11px; 
          color: #64748b; 
          text-align: right; 
          margin-top: 24px; 
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }
        @media print { 
          body { 
            padding: 5mm; 
            background-color: #ffffff;
          } 
          .border { 
            border: 3px double #1e3a8a; 
            box-shadow: none;
            padding: 20px;
          } 
        }
      </style>
    </head>
    <body>
      <div class="border">
        <div class="header">
          <div class="logo">☣️</div>
          <h1>Prakriti Track Pvt. Ltd.</h1>
          <h2>Common Bio-Medical Waste Treatment Facility (CBWTF)</h2>
          <h2>Jharkhand, India</h2>
        </div>
        
        <div class="cert-title">Certificate of Biomedical Waste Disposal</div>
        
        <div class="body-text">
          This is to certify that the following consignment of biomedical waste has been received and treated in accordance with the
          <strong>Bio-Medical Waste Management Rules, 2016</strong> and subsequent amendments issued by the Ministry of Environment,
          Forest and Climate Change, Government of India.
        </div>
        
        <table>
          <tr><th style="width: 35%;">Detail</th><th>Value</th></tr>
          <tr><td>Certificate Number</td><td><strong>${certNum}</strong></td></tr>
          <tr><td>Batch Number</td><td><code style="font-family: monospace; font-size: 14px;">${batchNumber}</code></td></tr>
          <tr><td>Treatment Method</td><td><strong>${treatmentType}</strong></td></tr>
          <tr><td>Total Bags Treated</td><td>${bagCount} bags</td></tr>
          <tr><td>Total Weight Treated</td><td>${Number(totalWeight).toFixed(2)} kg</td></tr>
          <tr><td>Date of Treatment</td><td>${dateStr} at ${timeStr}</td></tr>
          <tr><td>Treated By (Operator)</td><td>${operatorName}</td></tr>
          <tr>
            <td style="vertical-align: top; padding-top: 12px;">Waste Category Breakdown</td>
            <td style="padding: 6px 14px;">
              <table class="breakdown-table">
                <thead>
                  <tr>
                    <th style="text-align: left;">Category</th>
                    <th style="text-align: right;">Bags</th>
                    <th style="text-align: right;">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="badge-marker bg-yellow"></span>Yellow Waste</td>
                    <td style="text-align: right;">${breakdown.Yellow?.count || 0}</td>
                    <td style="text-align: right;">${Number(breakdown.Yellow?.weight || 0).toFixed(2)} kg</td>
                  </tr>
                  <tr>
                    <td><span class="badge-marker bg-red"></span>Red Waste</td>
                    <td style="text-align: right;">${breakdown.Red?.count || 0}</td>
                    <td style="text-align: right;">${Number(breakdown.Red?.weight || 0).toFixed(2)} kg</td>
                  </tr>
                  <tr>
                    <td><span class="badge-marker bg-white"></span>White Waste</td>
                    <td style="text-align: right;">${breakdown.White?.count || 0}</td>
                    <td style="text-align: right;">${Number(breakdown.White?.weight || 0).toFixed(2)} kg</td>
                  </tr>
                  <tr>
                    <td><span class="badge-marker bg-blue"></span>Blue Waste</td>
                    <td style="text-align: right;">${breakdown.Blue?.count || 0}</td>
                    <td style="text-align: right;">${Number(breakdown.Blue?.weight || 0).toFixed(2)} kg</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </table>
        
        <div class="body-text" style="font-size: 12px; color: #64748b; margin-top: 16px;">
          The above biomedical waste has been rendered non-infectious and disposed of in an environmentally sound manner.
          This certificate is issued as per JSPCB authorization and applicable regulations.
        </div>
        
        <div class="sig-row">
          <div class="sig-box">
            <div class="sig-line">Treatment Plant Operator</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Plant Head / Authorized Signatory</div>
          </div>
        </div>
        
        <div class="cert-num">Cert No: ${certNum} · Generated: ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <script>
        window.onload = function() { 
          setTimeout(function() { 
            window.print(); 
          }, 500); 
        };
      </script>
    </body>
    </html>
  `;
}
