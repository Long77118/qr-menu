import React, { useId, useState } from 'react';
import { ArrowUpRight, MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import type { ShopSettings } from '../types/menu';
import { addressMapUrl } from '../utils/menuDirectory';
import { MenuBotanical } from './MenuBotanical';
import { menuImageSource } from '../utils/menuImageSources';
import './guestMenuHeader.css';

export function GuestMenuHeader({shop,itemCount,categoryCount,isDesktop,previewImageUrl,showCounts=true}:{
  shop:ShopSettings;itemCount:number;categoryCount:number;isDesktop:boolean;previewImageUrl?:string;showCounts?:boolean;
}) {
  const [failed,setFailed]=useState<string>();
  const [failedLogo,setFailedLogo]=useState<string>();
  const [failedPortrait,setFailedPortrait]=useState<string>();
  const clipId=`botanical-cover-${useId().replace(/:/g,'')}`;
  const safe=(url?:string)=>!!url && /^(https?:\/\/|data:image\/)/i.test(url);
  const bg=shop.headerBackground;
  const original=bg?.imageUrl || shop.coverUrl || shop.discoveryImageUrl;
  const sources=bg?.imageUrl ? bg.imageSources : shop.coverUrl ? shop.coverSources : undefined;
  const source=menuImageSource(original,sources,isDesktop?'detail':'card');
  const position=isDesktop?bg?.desktopPosition:bg?.mobilePosition;
  const zoom=Math.min(2.5,Math.max(1,(isDesktop?bg?.desktopZoom:bg?.mobileZoom)||1));
  const portrait=bg?.showShowcaseFrames!==false && safe(previewImageUrl) && previewImageUrl!==source && previewImageUrl!==failedPortrait ? previewImageUrl : undefined;
  const words=shop.name.trim().split(/\s+/);
  let split=1;
  for(let i=2;i<words.length;i++) if(Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length)<Math.abs(words.slice(0,split).join(' ').length-words.slice(split).join(' ').length))split=i;
  const lines=words.length>1 ? [words.slice(0,split).join(' '),words.slice(split).join(' ')] : [shop.name];
  const units=Math.max(2.7,...lines.map(line=>line.length*.58));
  return <header className="guest-menu-hero" data-has-portrait={!!portrait} data-long-name={shop.name.length>28} style={{'--menu-name-units':units} as React.CSSProperties}>
    <svg className="guest-menu-shape-defs" aria-hidden="true" focusable="false"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path d="M0 .16Q0 .095 .065 .085L.935 .002Q1 0 1 .075L1 .925Q1 .99 .935 .99L.065 1Q0 1 0 .935Z" /></clipPath></defs></svg>
    <div className="guest-menu-identity">
      <div className="guest-menu-identity-top"><div className="guest-menu-brandmark"><div className="guest-menu-logo">{safe(shop.logoUrl)&&shop.logoUrl!==failedLogo?<img src={shop.logoUrl} alt={`Logo ${shop.name}`} decoding="async" onError={()=>setFailedLogo(shop.logoUrl)}/>:<span>{shop.name.charAt(0)}</span>}</div><span>Thực đơn tại quán</span></div>{showCounts&&<span className="guest-menu-count">{itemCount} món · {categoryCount} danh mục</span>}</div>
      <div className="guest-menu-title-row"><div className="guest-menu-heading-copy"><h1>{lines.map((line,index)=><React.Fragment key={index}>{index>0&&' '}<span>{line.split(/(&)/).map((part,i)=>part==='&'?<i key={i}>&amp;</i>:part)}</span></React.Fragment>)}</h1>{shop.tagline&&<p className="guest-menu-tagline">{shop.tagline}</p>}</div>
        <MenuBotanical className="guest-menu-title-botanical"/>
        {portrait&&<div className="guest-menu-title-portrait"><img src={portrait} alt={`Một hương vị tại ${shop.name}`} loading="eager" decoding="async" onError={()=>setFailedPortrait(portrait)}/></div>}
      </div>
    </div>
    <div className="guest-menu-cover-composition"><div className="guest-menu-hero-photo" style={{clipPath:`url(#${clipId})`}}>
      {safe(source)&&source!==failed?<img src={source} alt={`Ảnh bìa ${shop.name}`} fetchPriority="high" decoding="async" style={{objectPosition:`${position?.x??50}% ${position?.y??50}%`,transform:`scale(${zoom})`,transformOrigin:`${position?.x??50}% ${position?.y??50}%`}} onError={()=>setFailed(source)}/>:<div className="guest-menu-hero-fallback"><UtensilsCrossed aria-hidden="true"/><span>{shop.name}</span></div>}
    </div>{(shop.address||shop.phone)&&<div className="guest-menu-contact"><MenuBotanical className="guest-menu-contact-botanical"/>{shop.address&&<a href={addressMapUrl(shop.address)} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true"/><span>{shop.address}</span><ArrowUpRight aria-hidden="true"/></a>}{shop.phone&&<a href={`tel:${shop.phone}`}><Phone aria-hidden="true"/><span>{shop.phone}</span></a>}</div>}</div>
    {shop.description&&<details className="guest-menu-about"><summary>Câu chuyện của quán</summary><p>{shop.description}</p></details>}
  </header>;
}
