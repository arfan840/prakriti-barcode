import QRCode from 'qrcode';

/**
 * Generate QR code as a data URL (PNG) for a given bag_id.
 * The QR encodes only: { bag_id: "..." }
 */
export async function generateQRDataUrl(bagId, options = {}) {
  const payload = JSON.stringify({ bag_id: bagId });
  const dataUrl = await QRCode.toDataURL(payload, {
    width: options.size || 200,
    margin: options.margin ?? 1,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
  return dataUrl;
}

/**
 * Draw QR code directly onto a canvas element.
 */
export async function drawQRToCanvas(canvas, bagId, options = {}) {
  const payload = JSON.stringify({ bag_id: bagId });
  await QRCode.toCanvas(canvas, payload, {
    width: options.size || 200,
    margin: options.margin ?? 1,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Parse a scanned QR string back to bag_id.
 * Returns null if parse fails.
 */
export function parseQRPayload(rawString) {
  try {
    const obj = JSON.parse(rawString);
    return obj?.bag_id || null;
  } catch {
    // Try it directly as plain bag_id string
    if (rawString && rawString.includes('-')) return rawString.trim();
    return null;
  }
}
