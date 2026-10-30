import { useMemo } from 'react';
import { QrCode } from '../../utils/qrCode';

/**
 * Pure SVG QR Code Component.
 * Zero external dependencies, pure vector rendering, crisp on screens and high-resolution print.
 */
export default function QRCodeSVG({
  value,
  size = 72,
  className = '',
  color = '#0f172a',
  bgColor = '#ffffff',
  title = 'Scan to verify certificate'
}) {
  const qr = useMemo(() => {
    if (!value) return null;
    try {
      return QrCode.encodeText(value, QrCode.Ecc.MEDIUM);
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) return null;

  const n = qr.size;
  // Build a single consolidated SVG path for optimal rendering and print sharpness
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.getModule(x, y)) {
        d += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width={n} height={n} fill={bgColor} />
      <path d={d} fill={color} />
    </svg>
  );
}
