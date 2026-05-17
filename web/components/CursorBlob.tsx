'use client';

import { useEffect, useState } from 'react';

export function CursorBlob() {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setShow(true);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (!show) return null;
  return (
    <div
      className="fixed pointer-events-none z-0 transition-transform duration-300 ease-out"
      style={{
        left: pos.x - 200,
        top: pos.y - 200,
        width: 400,
        height: 400,
        background:
          'radial-gradient(circle, rgba(124,58,237,0.18), rgba(34,211,238,0.10) 40%, transparent 70%)',
        filter: 'blur(40px)',
      }}
    />
  );
}
