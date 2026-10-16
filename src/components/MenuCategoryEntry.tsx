import React, { useState } from 'react';
import { ArrowUpRight, ArrowRight, Search, UtensilsCrossed, X } from 'lucide-react';
import type { MenuCategory, MenuItem } from '../types/menu';
import { matchesVietnamese } from '../utils/search';
import { menuImageSource } from '../utils/menuImageSources';
import './menuCategoryEntry.css';

function CategoryEntryCard({category,items,onSelect,index}:{category:MenuCategory;items:MenuItem[];onSelect:(id:string)=>void;index:number}) {
  const fallback=items.find(item=>item.imageUrl);
  const source=category.imageUrl?menuImageSource(category.imageUrl,category.imageSources,'card'):menuImageSource(fallback?.imageUrl,fallback?.imageSources,'card');
  const image=source && /^(https?:\/\/|data:image\/)/i.test(source) ? source : undefined;
  const [failed,setFailed]=useState<string>();
  return <button type="button" className="menu-category-entry-card" onClick={()=>onSelect(category.id)} aria-label={`${category.name}, ${items.length} món`} style={{animationDelay:`${Math.min(index,5)*55}ms`}}>
    <span className="menu-category-photo">{image && failed !== image ? <img src={image} alt="" loading="lazy" decoding="async" width="1200" height="800" onError={()=>setFailed(image)} /> : <span className="menu-category-entry-fallback"><UtensilsCrossed aria-hidden="true" /></span>}<span className="menu-category-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span></span>
    <span className="menu-category-entry-copy"><span><strong>{category.name}</strong><span>{items.length} món để thưởng thức</span></span><span className="menu-category-entry-arrow" aria-hidden="true"><ArrowUpRight /></span></span>
  </button>;
}

export function MenuCategoryEntry({categories,items,onSelect}:{categories:MenuCategory[];items:MenuItem[];onSelect:(id:string)=>void}) {
  const [query,setQuery]=useState('');
  const visible=[...categories].sort((a,b)=>a.order-b.order).filter(c=>matchesVietnamese(c.name,query));
  return <main className="menu-category-entry"><div className="menu-category-entry-heading"><div><span className="menu-eyebrow">Bắt đầu từ một hương vị</span><h2>Hôm nay, bạn chọn <em>gì?</em></h2></div><p>Một chút quen thuộc,<br />một món mới để thử.</p></div>
    <div className="menu-category-search-wrap"><label className="menu-category-entry-search"><Search aria-hidden="true" /><input aria-label="Tìm danh mục" placeholder="Tìm danh mục yêu thích…" value={query} onChange={event=>setQuery(event.target.value)} /></label>{query && <button type="button" className="menu-category-search-clear" aria-label="Xóa tìm danh mục" onClick={()=>setQuery('')}><X /></button>}</div>
    <div className="menu-category-entry-list">{visible.map((category,index)=><CategoryEntryCard key={category.id} category={category} items={items.filter(i=>i.categoryId===category.id)} onSelect={onSelect} index={index} />)}</div>
    {!visible.length && <div className="menu-category-empty" role="status"><UtensilsCrossed aria-hidden="true" /><p>{categories.length ? 'Chưa tìm thấy danh mục phù hợp.' : 'Quán đang chuẩn bị thực đơn.'}</p>{query && <button type="button" onClick={()=>setQuery('')}>Xóa tìm kiếm</button>}</div>}
    {!!categories.length && <button className="menu-category-entry-all" type="button" onClick={()=>onSelect('all')}><span>Xem trọn thực đơn <small>{items.length} món</small></span><ArrowRight aria-hidden="true" /></button>}
  </main>;
}
