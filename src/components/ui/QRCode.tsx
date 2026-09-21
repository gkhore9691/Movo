import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
}

export function QRCode({ value, size = 256 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0f1117',
        },
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}
