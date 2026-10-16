import { FullPhoto } from './FullPhoto';
import React, { useEffect, useState } from 'react';
import { ArrowUpRight, MapPin, Store } from 'lucide-react';
import { DirectoryEntry } from '../services/menuDirectoryCore';
import { addressMapUrl } from '../utils/menuDirectory';
import { countryName } from '../utils/countries';

export function DiscoveryCard({ entry }: { entry: DirectoryEntry }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [entry.imageUrl]);
  const image = entry.imageUrl && /^(https?:\/\/|data:image\/)/i.test(entry.imageUrl) && !failed;
  return <article className="discovery-card">
    <a href={`#/menu/${encodeURIComponent(entry.shopId)}`} className="discovery-card-photo" aria-label={`Xem menu ${entry.name}`}>
      {image ? <FullPhoto src={entry.imageUrl!} alt={`Ảnh đại diện ${entry.name}`} onError={() => setFailed(true)} />
        : <div className="discovery-photo-fallback"><Store aria-hidden="true" /><span>Chưa có ảnh quán</span></div>}
      <span className="discovery-country-badge">{countryName(entry.countryCode)}</span>
      <span className="discovery-photo-arrow" aria-hidden="true"><ArrowUpRight /></span>
    </a>
    <div className="discovery-card-content">
      <h2><a href={`#/menu/${encodeURIComponent(entry.shopId)}`} title={entry.name}>{entry.name}</a></h2>
      <p className="discovery-tagline" title={entry.tagline || undefined}>{entry.tagline || 'Mở menu và khám phá món bạn thích.'}</p>
      <p className="discovery-address"><MapPin aria-hidden="true" /><span title={entry.address || undefined}>{entry.address || 'Quán chưa cập nhật địa chỉ'}</span></p>
      <div className="discovery-card-actions">
        <a href={`#/menu/${encodeURIComponent(entry.shopId)}`} className="discovery-menu-link">Xem menu <ArrowUpRight aria-hidden="true" /></a>
        {entry.address.trim() && <a href={addressMapUrl(entry.address)} target="_blank" rel="noopener noreferrer" className="discovery-map-link">Xem bản đồ</a>}
      </div>
    </div>
  </article>;
}
