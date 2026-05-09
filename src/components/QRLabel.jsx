import React, { useEffect, useRef } from 'react';
import { drawQRToCanvas } from '../lib/qrGenerator';

const CATEGORY_COLORS = {
  Yellow: { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
  Red:    { bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
  Blue:   { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  White:  { bg: '#f1f5f9', border: '#64748b', text: '#1e293b' },
};

/**
 * QRLabel — renders a single printable waste bag label.
 * Props:
 *   bag        : { barcode, hospital_name, category, created_at }
 *   size       : canvas size in px (default 160)
 *   compact    : boolean — smaller layout for batch preview
 */
export default function QRLabel({ bag, size = 160, compact = false }) {
  const canvasRef = useRef(null);
  const colors = CATEGORY_COLORS[bag?.category] || CATEGORY_COLORS.White;

  useEffect(() => {
    if (canvasRef.current && bag?.barcode) {
      drawQRToCanvas(canvasRef.current, bag.barcode, { size });
    }
  }, [bag?.barcode, size]);

  if (!bag) return null;

  const dateStr = bag.created_at
    ? new Date(bag.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="qr-label" style={{
      border: `2px solid ${colors.border}`,
      backgroundColor: colors.bg,
      borderRadius: compact ? 6 : 8,
      padding: compact ? '8px' : '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: compact ? 4 : 8,
      width: compact ? 160 : 200,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        textAlign: 'center',
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: compact ? 4 : 6,
        marginBottom: compact ? 2 : 4,
      }}>
        <div style={{ fontSize: compact ? '0.55rem' : '0.6rem', color: colors.text, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Prakriti Waste Management
        </div>
        <div style={{
          fontSize: compact ? '0.65rem' : '0.75rem',
          fontWeight: 800,
          color: colors.text,
          marginTop: 2,
          lineHeight: 1.2,
          wordBreak: 'break-word',
          textAlign: 'center',
        }}>
          {bag.hospital_name}
        </div>
      </div>

      {/* Category badge */}
      <div style={{
        background: colors.border,
        color: '#fff',
        fontWeight: 700,
        fontSize: compact ? '0.6rem' : '0.7rem',
        borderRadius: 4,
        padding: compact ? '2px 8px' : '3px 12px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {bag.category} Waste
      </div>

      {/* QR Code Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ borderRadius: 4, background: '#fff', padding: 2 }}
      />

      {/* Bag ID */}
      <div style={{
        fontSize: compact ? '0.5rem' : '0.58rem',
        fontFamily: 'monospace',
        fontWeight: 600,
        color: colors.text,
        textAlign: 'center',
        wordBreak: 'break-all',
        letterSpacing: '0.04em',
        lineHeight: 1.3,
        width: '100%',
      }}>
        {bag.barcode}
      </div>

      {/* Date */}
      <div style={{
        fontSize: compact ? '0.5rem' : '0.55rem',
        color: colors.text,
        opacity: 0.7,
        borderTop: `1px solid ${colors.border}`,
        paddingTop: compact ? 3 : 4,
        width: '100%',
        textAlign: 'center',
      }}>
        Generated: {dateStr}
      </div>
    </div>
  );
}
