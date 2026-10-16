import React from 'react';
import './FullPhoto.css';

export function FullPhoto({ src, alt, loading = 'lazy', onError, backdropClipPath }: {
  src: string; alt: string; loading?: 'lazy' | 'eager'; onError?: () => void; backdropClipPath?: string;
}) {
  return <span className="full-photo">
    <img className="full-photo-backdrop" src={src} alt="" aria-hidden="true" loading={loading} decoding="async" referrerPolicy="no-referrer" style={{ clipPath:backdropClipPath }} />
    <img className="full-photo-original" src={src} alt={alt} loading={loading} decoding="async" referrerPolicy="no-referrer" onError={onError} />
  </span>;
}
