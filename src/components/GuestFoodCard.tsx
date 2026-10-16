import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '../types/menu';
import { menuImageSource } from '../utils/menuImageSources';

export function GuestDishVisual({ item, detail = false }: { item: MenuItem; detail?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string>();
  const preferred=menuImageSource(item.imageUrl,item.imageSources,detail?'detail':'card');
  const source=[preferred,item.imageUrl].find(url=>url && /^(https?:\/\/|data:image\/)/i.test(url) && !failed.includes(url));
  return source ? <span className="guest-dish-image" data-loaded={loaded === source}>
    <img src={source} alt={item.name} loading={detail ? 'eager' : 'lazy'} decoding="async" width="1200" height="900" onLoad={() => setLoaded(source)} onError={() => setFailed(current=>[...current,source])} />
  </span> : <span className={detail ? 'guest-menu-detail-no-photo' : 'guest-food-no-photo'}><span className="guest-food-monogram" aria-hidden="true">{item.name.charAt(0)}</span><UtensilsCrossed aria-hidden="true" /><span>Quán chưa thêm ảnh món này</span></span>;
}

export function GuestFoodCard({ item, price, categoryName, hidden, onOpen }: {
  item: MenuItem; price: string; categoryName: string; hidden: boolean; index: number; total: number;
  onOpen: (item: MenuItem, trigger: HTMLElement) => void;
}) {
  const reduced = useReducedMotion();
  return <motion.button type="button" className="guest-food-card" data-featured={false} data-sold-out={item.status === 'out_of_stock'}
    layoutId={`card-container-${item.id}`} aria-label={`Xem chi tiết ${item.name}, ${price}${item.status === 'out_of_stock' ? ', tạm hết' : ''}`}
    style={{opacity:hidden ? 0 : 1,pointerEvents:hidden ? 'none' : 'auto'}} whileHover={reduced ? undefined : {y:-3}} whileTap={reduced ? undefined : {scale:.99}}
    transition={{duration:.2}} onClick={event => onOpen(item,event.currentTarget)}>
    <motion.span className="guest-food-photo" layoutId={`card-image-box-${item.id}`}><GuestDishVisual item={item} />{item.status === 'out_of_stock' && <span className="guest-food-status">Tạm hết</span>}</motion.span>
    <span className="guest-food-copy"><span className="guest-food-category">{categoryName}</span><motion.h3 layoutId={`card-title-${item.id}`}>{item.name}</motion.h3>
      {item.description && <span className="guest-food-description">{item.description.split(/\r?\n/)[0]}</span>}
      <span className="guest-food-bottom"><motion.strong layoutId={`card-price-badge-${item.id}`}>{price}</motion.strong><span className="guest-food-arrow" aria-hidden="true"><ArrowUpRight /></span></span>
    </span>
  </motion.button>;
}
