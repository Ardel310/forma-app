"use client";

import type { CSSProperties } from "react";

export default function FormaLoader({ size = 52, minHeight = 140 }: { size?: number; minHeight?: number | string }) {
  const mask: CSSProperties = {
    mask: 'url(/forma-loader.png) center / contain no-repeat',
    WebkitMask: 'url(/forma-loader.png) center / contain no-repeat',
  };
  return (
    <div role="status" aria-label="Cargando" style={{ display: 'grid', placeItems: 'center', minHeight, width: '100%' }}>
      <div aria-hidden="true" style={{ ...mask, width: size, height: size, background: '#E5EBE5', position: 'relative', overflow: 'hidden' }}>
        <div className="forma-loader-fill" style={{ position: 'absolute', inset: 0, background: '#7D8C82', transformOrigin: 'bottom' }} />
      </div>
      <style jsx>{`
        .forma-loader-fill { animation: forma-fill 1.6s ease-in-out infinite; }
        @keyframes forma-fill { 0% { transform: scaleY(0); } 80%, 100% { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) { .forma-loader-fill { animation: none; transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
