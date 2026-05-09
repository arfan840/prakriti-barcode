import React from 'react';
import { generateQRDataUrl } from '../lib/qrGenerator';

/**
 * Opens a browser print window containing one or more QR labels.
 * Call printLabels(bags) to trigger printing.
 *
 * bags: Array of { barcode, hospital_name, category, created_at }
 */
export async function printLabels(bags) {
  // Generate all QR data URLs first
  const labelsWithQR = await Promise.all(
    bags.map(async (bag) => ({
      ...bag,
      qrDataUrl: await generateQRDataUrl(bag.barcode, { size: 220 }),
    }))
  );

  const dateStr = (bag) =>
    bag.created_at
      ? new Date(bag.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const catColors = {
    Yellow: { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
    Red:    { bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
    Blue:   { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
    White:  { bg: '#f1f5f9', border: '#64748b', text: '#1e293b' },
  };

  const labelHTML = labelsWithQR.map((bag) => {
    const c = catColors[bag.category] || catColors.White;
    return `
      <div class="label" style="border:2px solid ${c.border};background:${c.bg};border-radius:8px;padding:10px;display:inline-flex;flex-direction:column;align-items:center;gap:6px;width:62mm;font-family:'Arial',sans-serif;page-break-inside:avoid;margin:4mm;">
        <div style="width:100%;text-align:center;border-bottom:1px solid ${c.border};padding-bottom:4px;margin-bottom:2px;">
          <div style="font-size:6pt;color:${c.text};font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Prakriti Track</div>
          <div style="font-size:8pt;font-weight:800;color:${c.text};margin-top:2px;line-height:1.2;">${bag.hospital_name}</div>
        </div>
        <div style="background:${c.border};color:#fff;font-weight:700;font-size:7pt;border-radius:4px;padding:2px 10px;letter-spacing:0.1em;text-transform:uppercase;">${bag.category} Waste</div>
        <img src="${bag.qrDataUrl}" style="width:180px;height:180px;border-radius:4px;" />
        <div style="font-size:6pt;font-family:monospace;font-weight:600;color:${c.text};text-align:center;word-break:break-all;letter-spacing:0.03em;">${bag.barcode}</div>
        <div style="font-size:5.5pt;color:${c.text};opacity:0.7;border-top:1px solid ${c.border};padding-top:3px;width:100%;text-align:center;">Generated: ${dateStr(bag)}</div>
      </div>
    `;
  }).join('');

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prakriti Track — Bag Labels</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { margin: 0; padding: 0; background: #fff; }
        .labels-container { display: flex; flex-wrap: wrap; gap: 6mm; padding: 6mm; justify-content: flex-start; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="labels-container">${labelHTML}</div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * PrintLabelButton — a button that triggers print for given bags.
 */
export default function PrintLabelButton({ bags, label = '🖨️ Print Labels', className = 'btn btn-secondary' }) {
  const handlePrint = async () => {
    if (!bags || bags.length === 0) return;
    await printLabels(bags);
  };

  return (
    <button className={className} onClick={handlePrint} disabled={!bags || bags.length === 0}>
      {label}
    </button>
  );
}
