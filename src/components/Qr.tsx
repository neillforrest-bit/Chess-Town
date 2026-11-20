'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function Qr({ text, dark = '#2d0f55', light = '#fff3c7', size = 220 }: { text: string; dark?: string; light?: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let on = true;
    QRCode.toDataURL(text, { margin: 1, width: size, color: { dark, light } }).then((u) => { if (on) setSrc(u); }).catch(() => {});
    return () => { on = false; };
  }, [text, dark, light, size]);
  if (!src) return <div style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code. Scan with a phone camera to open the link." width={size} height={size} style={{ borderRadius: 8 }} />;
}
