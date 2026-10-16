import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ShopSettings, HeaderBackgroundConfig } from '../types/menu';
import { compressHeaderBackgroundImage } from '../utils/image';
import { GuestMenuHeader } from './GuestMenuHeader';
import './ownerWorkspace.css';

export const DEFAULT_HEADER_BACKGROUND_CONFIG: HeaderBackgroundConfig = {
 imageUrl:undefined,desktopPosition:{x:50,y:50},desktopZoom:1,mobilePosition:{x:50,y:50},mobileZoom:1,
 overlayType:'dark',overlayOpacity:35,textColorMode:'auto',showShowcaseFrames:true,
};
export function HeaderBackgroundModal({isOpen,shop,previewImageUrl,onSave,onClose,triggerButtonRef}: {
 isOpen:boolean;shop:ShopSettings;previewImageUrl?:string;onSave:(config:HeaderBackgroundConfig)=>void;onClose:()=>void;triggerButtonRef?:React.RefObject<HTMLElement|null>;
}) {
 const [config,setConfig]=useState<HeaderBackgroundConfig>(()=>({...DEFAULT_HEADER_BACKGROUND_CONFIG,...shop.headerBackground}));
 const [device,setDevice]=useState<'mobile'|'desktop'>('mobile');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const dialog=useRef<HTMLDivElement>(null),uploadGeneration=useRef(0);
 useEffect(()=>{
  uploadGeneration.current++;
  if(isOpen){setConfig({...DEFAULT_HEADER_BACKGROUND_CONFIG,...shop.headerBackground});setError('');setBusy(false);}
  return()=>{uploadGeneration.current++;};
 },[isOpen,shop.id,shop.headerBackground]);
 useEffect(()=>{
  if(!isOpen)return;
  const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.current?.focus();
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();}
   if(event.key==='Tab'){
    const nodes=[...dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],select:not(:disabled),summary')||[]],first=nodes[0],last=nodes[nodes.length-1];
    if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||!dialog.current?.contains(document.activeElement)||document.activeElement===dialog.current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!dialog.current?.contains(document.activeElement)||document.activeElement===dialog.current)){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',keyboard);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keyboard);(triggerButtonRef?.current||previous)?.focus();};
 },[isOpen]);
 if(!isOpen)return null;
 const position=device==='desktop'?config.desktopPosition:config.mobilePosition;
 const zoom=device==='desktop'?config.desktopZoom:config.mobileZoom;
 const updatePosition=(axis:'x'|'y',value:number)=>setConfig({...config,[device==='desktop'?'desktopPosition':'mobilePosition']:{...position,[axis]:value}});
 const reset=()=>setConfig({...config,[device==='desktop'?'desktopPosition':'mobilePosition']:{x:50,y:50},[device==='desktop'?'desktopZoom':'mobileZoom']:1});
 const content=<div className="owner-image-backdrop"><div ref={dialog} role="dialog" aria-modal="true" aria-label="Thiết kế ảnh bìa menu" tabIndex={-1} className="owner-image-dialog">
  <header className="owner-image-heading"><div><span>Thiết kế menu</span><h2>Đặt hương vị vào khung hình.</h2></div><button type="button" onClick={onClose} aria-label="Đóng thiết kế ảnh bìa">Đóng</button></header>
  <div className="owner-image-layout"><section className="owner-image-controls" aria-label="Điều chỉnh ảnh bìa">
   <label className="owner-image-upload">Ảnh bìa của quán<small>Gợi ý 1600 × 1000 px · JPG, PNG, WebP · Tối đa 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event=>{
    const input=event.currentTarget,file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Chọn ảnh JPG, PNG hoặc WebP.');input.value='';return;}
    const generation=++uploadGeneration.current;setBusy(true);setError('');
    try{const imageUrl=await compressHeaderBackgroundImage(file);if(generation===uploadGeneration.current)setConfig(current=>({...current,imageUrl}));}
    catch(error){if(generation===uploadGeneration.current)setError(error instanceof Error?error.message:'Không xử lý được ảnh.');}
    finally{if(generation===uploadGeneration.current)setBusy(false);input.value='';}
   }}/></label>
   {error&&<p role="alert" className="owner-image-error">{error}</p>}
   {busy&&<p role="status" className="owner-image-hint">Đang xử lý ảnh…</p>}
   <div><span className="owner-image-field-title">Điều chỉnh cho</span><div className="owner-device-picker" role="group" aria-label="Khung xem trước ảnh bìa"><button type="button" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}>Điện thoại</button><button type="button" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}>Màn hình lớn</button></div></div>
   <label className="owner-image-range">Vị trí ngang <output>{position.x}%</output><input type="range" min="0" max="100" value={position.x} onChange={event=>updatePosition('x',Number(event.target.value))}/></label>
   <label className="owner-image-range">Vị trí dọc <output>{position.y}%</output><input type="range" min="0" max="100" value={position.y} onChange={event=>updatePosition('y',Number(event.target.value))}/></label>
   <label className="owner-image-range">Phóng ảnh <output>{zoom.toFixed(1)}×</output><input type="range" min="1" max="2.5" step="0.1" value={zoom} onChange={event=>setConfig({...config,[device==='desktop'?'desktopZoom':'mobileZoom']:Number(event.target.value)})}/></label>
   <button type="button" className="owner-image-reset" onClick={reset}>Đưa ảnh về giữa · 1×</button>
   <label className="owner-image-toggle"><input type="checkbox" checked={config.showShowcaseFrames} onChange={event=>setConfig({...config,showShowcaseFrames:event.target.checked})}/><span>Hiện ảnh vòm cạnh tên quán<small>Ảnh lấy từ món công khai đầu tiên có ảnh.</small></span></label>
   <p className="owner-image-hint">Ảnh bìa được cắt theo khung cong. Đặt món chính gần giữa; vị trí và độ phóng lưu riêng cho từng thiết bị.</p>
  </section><section className="owner-image-preview" aria-label="Kết quả xem trước"><div className="owner-image-preview-label"><span>Xem trước header</span><span>{device==='mobile'?'390 px':'880 px'}</span></div><div className="owner-image-preview-canvas"><div className="owner-preview-frame" data-device={device}><div className="guest-menu-page"><div className="guest-menu-shell"><GuestMenuHeader shop={{...shop,headerBackground:config}} previewImageUrl={previewImageUrl} isDesktop={device==='desktop'} itemCount={0} categoryCount={0} showCounts={false}/></div></div></div></div><p className="owner-image-hint">{device==='desktop'?'Kéo ngang trong khung để xem toàn bộ màn hình lớn.':'Khung co lại trên màn hình nhỏ; ảnh vòm, đường cong và thông tin dùng chung với menu khách.'}</p></section></div>
  <footer className="owner-image-footer"><span>Áp dụng vào bản nháp; xuất bản để khách nhìn thấy.</span><div>{config.imageUrl&&<button type="button" disabled={busy} onClick={()=>setConfig({...config,imageUrl:undefined})}>Dùng ảnh bìa dự phòng</button>}<button type="button" disabled={busy} className="owner-image-save" onClick={()=>{onSave(config);onClose();}}>{busy?'Đang xử lý…':'Áp dụng vào bản nháp'}</button></div></footer>
 </div></div>;
 return typeof document!=='undefined'&&document.body?createPortal(content,document.body):content;
}
